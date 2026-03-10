from django.db import connection
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal, InvalidOperation


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def dictfetchone(cursor):
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    return dict(zip(columns, row)) if row else None

def get_customer_id(user_id):
    """Resolve auth user_id → customer.id. Returns None if no customer profile exists."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id FROM customers_customer WHERE user_id = %s
        """, [user_id])
        row = cursor.fetchone()
    return row[0] if row else None


# ─────────────────────────────────────────────
# GET   /api/customers/me/addresses/
# POST  /api/customers/me/addresses/
# ─────────────────────────────────────────────
class CustomerAddressListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer_id = get_customer_id(request.user.id)
        if not customer_id:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

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

        return Response(addresses, status=status.HTTP_200_OK)

    def post(self, request):
        customer_id = get_customer_id(request.user.id)
        if not customer_id:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        data = request.data
        VALID_TYPES = {'HOME', 'WORK', 'PARTNER', 'OTHER'}

        address_type = str(data.get('address_type', 'HOME')).upper()
        if address_type not in VALID_TYPES:
            return Response(
                {"error": f"address_type must be one of {sorted(VALID_TYPES)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if customer already has an address of this type
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM addresses_deliveryaddress
                WHERE customer_id = %s AND address_type = %s
            """, [customer_id, address_type])
            existing = cursor.fetchone()

        if existing:
            return Response(
                {
                    "error": f"You already have a {address_type} address (id: {existing[0]}). "
                             f"Use PUT /api/customers/me/addresses/{existing[0]}/ to update it."
                },
                status=status.HTTP_409_CONFLICT
            )

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

        return Response(
            {"message": "Address added successfully.", "address_id": new_id},
            status=status.HTTP_201_CREATED
        )


# ─────────────────────────────────────────────
# GET    /api/customers/me/addresses/<address_id>/
# PUT    /api/customers/me/addresses/<address_id>/
# DELETE /api/customers/me/addresses/<address_id>/
# ─────────────────────────────────────────────
class CustomerAddressDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_verified_address(self, address_id, customer_id):
        """Shared helper — returns the address row or None if not found / not owned."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, address_type, street_number, apartment_number,
                       description, latitude, longitude
                FROM addresses_deliveryaddress
                WHERE id = %s AND customer_id = %s
            """, [address_id, customer_id])
            return dictfetchone(cursor)

    def get(self, request, address_id):
        customer_id = get_customer_id(request.user.id)
        if not customer_id:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        address = self._get_verified_address(address_id, customer_id)
        if not address:
            return Response(
                {"error": "Address not found or access denied."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(address, status=status.HTTP_200_OK)

    def put(self, request, address_id):
        customer_id = get_customer_id(request.user.id)
        if not customer_id:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if not self._get_verified_address(address_id, customer_id):
            return Response(
                {"error": "Address not found or access denied."},
                status=status.HTTP_404_NOT_FOUND
            )

        data = request.data
        UPDATABLE_FIELDS = ['street_number', 'apartment_number', 'description', 'latitude', 'longitude']
        updates = {f: data[f] for f in UPDATABLE_FIELDS if f in data}

        if not updates:
            return Response(
                {"error": "No updatable fields provided. Accepted fields: street_number, apartment_number, description, latitude, longitude."},
                status=status.HTTP_400_BAD_REQUEST
            )

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

        return Response(
            {"message": "Address updated successfully.", "address": updated},
            status=status.HTTP_200_OK
        )

    def delete(self, request, address_id):
        customer_id = get_customer_id(request.user.id)
        if not customer_id:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if not self._get_verified_address(address_id, customer_id):
            return Response(
                {"error": "Address not found or access denied."},
                status=status.HTTP_404_NOT_FOUND
            )

        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM addresses_deliveryaddress
                WHERE id = %s AND customer_id = %s
            """, [address_id, customer_id])

        return Response(
            {"message": "Address deleted successfully."},
            status=status.HTTP_200_OK
        )


# ─────────────────────────────────────────────
# GET  /api/customers/me/orders/
# ─────────────────────────────────────────────
class CustomerOrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM customers_customer WHERE user_id = %s
            """, [request.user.id])
            row = cursor.fetchone()

        if not row:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        customer_id = row[0]

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    o.order_id,
                    o.status,
                    o.total_amount,
                    o.created_at,
                    o.est_delivery,
                    o.delivered_at,
                    r.name          AS restaurant_name,
                    r.image_url     AS restaurant_image
                FROM orders_order o
                LEFT JOIN resturants_restaurant r ON r.id = o.restaurant_id
                WHERE o.customer_id = %s
                ORDER BY o.created_at DESC
            """, [customer_id])
            orders = dictfetchall(cursor)

        return Response(orders, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────
# GET  /api/customers/me/orders/<order_id>/
# ─────────────────────────────────────────────
class CustomerOrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    o.order_id,
                    o.status,
                    o.total_amount,
                    o.created_at,
                    o.est_pickup,
                    o.est_delivery,
                    o.delivered_at,
                    o.email,
                    o.first_name,
                    o.last_name,
                    o.phone_number,
                    r.name              AS restaurant_name,
                    ad.street_number,
                    ad.apartment_number,
                    ad.description      AS address_description,
                    ad.latitude         AS delivery_lat,
                    ad.longitude        AS delivery_lng
                FROM orders_order o
                INNER JOIN customers_customer c ON c.id = o.customer_id
                LEFT JOIN resturants_restaurant r ON r.id = o.restaurant_id
                LEFT JOIN addresses_deliveryadress ad ON ad.id = o.address_id
                WHERE o.order_id = %s AND c.user_id = %s
            """, [order_id, request.user.id])
            order = dictfetchone(cursor)

        if not order:
            return Response(
                {"error": "Order not found or access denied."},
                status=status.HTTP_404_NOT_FOUND
            )

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    oi.id,
                    oi.quantity,
                    oi.price_at_purchase,
                    mi.name         AS item_name,
                    mi.image_url    AS item_image
                FROM orders_orderitem oi
                LEFT JOIN items_menuitem mi ON mi.food_id = oi.item_id
                WHERE oi.order_id = %s
            """, [order_id])
            order['items'] = dictfetchall(cursor)

        return Response(order, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────
# GET   /api/customers/me/wallet/
# POST  /api/customers/me/wallet/
# ─────────────────────────────────────────────
class CustomerWalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT wallet_balance
                FROM customers_customer
                WHERE user_id = %s
            """, [request.user.id])
            row = cursor.fetchone()

        if not row:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({"wallet_balance": row[0]}, status=status.HTTP_200_OK)

    def post(self, request):
        """Top up wallet balance. Body: { "amount": <positive number> }"""
        raw = request.data.get('amount')
        if raw is None:
            return Response(
                {"error": "amount is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = Decimal(str(raw))
            if amount <= 0:
                raise ValueError("Must be positive")
        except (InvalidOperation, ValueError):
            return Response(
                {"error": "amount must be a positive number."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE customers_customer
                SET wallet_balance = wallet_balance + %s
                WHERE user_id = %s
            """, [amount, request.user.id])
            if cursor.rowcount == 0:
                return Response(
                    {"error": "Customer profile not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
            cursor.execute("""
                SELECT wallet_balance FROM customers_customer WHERE user_id = %s
            """, [request.user.id])
            row = cursor.fetchone()

        return Response(
            {"message": "Wallet topped up successfully.", "new_balance": row[0]},
            status=status.HTTP_200_OK
        )