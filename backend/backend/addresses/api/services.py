from django.db import connection
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal, InvalidOperation
from exceptions import ValidationError, ConflictError, PermissionError, NotFoundError

def get_customer_id(user_id):
    """Resolve auth user_id → customer.id. Returns None if no customer profile exists."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id FROM customers_customer WHERE user_id = %s
        """, [user_id])
        row = cursor.fetchone()
    return row[0] if row else None

def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def dictfetchone(cursor):
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    return dict(zip(columns, row)) if row else None

def insert_address(cursor, street_address, city, latitude=None, longitude=None):
    """
    Inserts one row into addresses_address and returns the new address_id (int).

    Must be called with an already-open cursor inside a transaction.atomic() block
    so the insert is part of the same transaction as the caller.

    MySQL note: we use LAST_INSERT_ID() immediately after the INSERT.
    This is connection-scoped in MySQL — it always returns the ID generated
    by the most recent INSERT on *this* connection, never someone else's.

    Parameters
    ----------
    cursor         : open Django DB cursor
    street_address : str   e.g. "146, CDA Avenue"
    city           : str   e.g. "Chittagong"
    latitude       : float | None
    longitude      : float | None

    Returns
    -------
    int — address_id of the newly inserted row.

    Usage from any other view:
        with transaction.atomic():
            with connection.cursor() as cur:
                addr_id = insert_address(cur, "Road 4", "Dhaka", 23.74, 90.37)
    """
    cursor.execute(
        """
        INSERT INTO addresses_address (street_address, city, latitude, longitude)
        VALUES (%s, %s, %s, %s)
        """,
        [street_address, city, latitude, longitude]
    )

    # LAST_INSERT_ID() is MySQL's way of reading the auto-increment value
    # produced by the INSERT above — no SELECT WHERE needed.
    cursor.execute("SELECT LAST_INSERT_ID()")
    row = cursor.fetchone()
    if not row or not row[0]:
        raise Exception("MySQL did not return a valid address_id after INSERT.")
    return row[0]




def get_all_delivery_address(request):
    customer_id = get_customer_id(request.user.id)
    if not customer_id:
        raise PermissionError("Customer Profile not found")
    with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    id,
                    address_type,
                    street_number,
                    apartment_number,
                    description,
                    latitude,
                    longitude
                FROM addresses_deliveryaddress
                WHERE customer_id = %s
                ORDER BY id DESC
            """, [customer_id])
            addresses = dictfetchall(cursor)

            return addresses

def create_delivery_address(request):
    data = request.data
    user_id = request.user.id
    customer_id = get_customer_id(user_id)
    if not customer_id:
        raise PermissionError("Customer Profile not found")
    VALID_TYPES = {'HOME', 'WORK', 'PARTNER', 'OTHER'}

    address_type = str(data.get('address_type', 'HOME')).upper()
    if address_type not in VALID_TYPES:
        raise ValidationError(f"address_type must be one of {sorted(VALID_TYPES)}")
        
    # Check if customer already has an address of this type
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id FROM addresses_deliveryaddress
            WHERE customer_id = %s AND address_type = %s
        """, [customer_id, address_type])
        existing = cursor.fetchone()

    if existing:
        raise ConflictError(f"You already have a {address_type} address (id: {existing[0]}). "
                            f"Use Patch /api/customers/me/addresses/{existing[0]}/ to update it.") 
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO addresses_deliveryaddress
                (customer_id, address_type, street_number, apartment_number,
                    description, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, [
            customer_id,
            address_type,
            data.get('street_number'),
            data.get('apartment_number'),
            data.get('description'),
            data.get('latitude'),
            data.get('longitude'),
        ])
        new_id = cursor.lastrowid

        return new_id
    
def _get_verified_address(address_id, customer_id):
        """Shared helper — returns the address row or None if not found / not owned."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, address_type, street_number, apartment_number,
                       description, latitude, longitude
                FROM addresses_deliveryaddress
                WHERE id = %s AND customer_id = %s
            """, [address_id, customer_id])
            return dictfetchone(cursor)

def get_specific_delivery_address(request, address_id):
    customer_id = get_customer_id(request.user.id)
    if not customer_id:
        raise PermissionError("Customer Profile not found")

    address = _get_verified_address(address_id, customer_id)
    if not address:
        raise NotFoundError("Delivery Address with this address id not found")

    return address

def update_delivery_address(request, address_id):
    customer_id = get_customer_id(request.user.id)
    if not customer_id:
        raise PermissionError("Customer Profile not found")
    if not _get_verified_address(address_id, customer_id):
        raise NotFoundError("Address not found or access denied.")
    
    data = request.data
    UPDATABLE_FIELDS = ['street_number', 'apartment_number', 'description', 'latitude', 'longitude']
    updates = {f: data[f] for f in UPDATABLE_FIELDS if f in data}

    if not updates:
        raise ValidationError("No updatable fields provided. Accepted fields: street_number, apartment_number, description, latitude, longitude.")
        
    set_clause = ', '.join(f"{col} = %s" for col in updates)
    values = list(updates.values()) + [address_id, customer_id]

    with connection.cursor() as cursor:
        cursor.execute(f"""
            UPDATE addresses_deliveryaddress
            SET {set_clause}
            WHERE id = %s AND customer_id = %s
        """, values)
        cursor.execute("""
            SELECT id, address_type, street_number, apartment_number, description, latitude, longitude
            FROM addresses_deliveryaddress
            WHERE id = %s
        """, [address_id])
        updated = dictfetchone(cursor)

        return updated

def delete_delivery_address(request, address_id):
    customer_id = get_customer_id(request.user.id)
    if not customer_id:
        raise PermissionError("Customer Profile not found")

    if not _get_verified_address(address_id, customer_id):
        raise NotFoundError("Address Not Found")

    with connection.cursor() as cursor:
        cursor.execute("""
            DELETE FROM addresses_deliveryaddress
            WHERE id = %s AND customer_id = %s
        """, [address_id, customer_id])
