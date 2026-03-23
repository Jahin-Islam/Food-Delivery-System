# resturants/api/services.py
# COMPLETE FILE — replace your existing resturants/api/services.py with this

from utility import dictfetchall
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from exceptions import PermissionError, ConflictError, NotFoundError, ValidationError
import logging

log = logging.getLogger(__name__)


def insert_restaurant(cursor, user_id, phone_number, data):
    """
    Insert a resturants_restaurant row.

    Address handling:
    - Frontend sends: address (street), city, latitude, longitude
    - city comes from Nominatim reverse geocode — never hardcoded
    - All three (city, latitude, longitude) are NOT NULL in addresses_address
      so we only create the address row when all three are present
    - If address data is missing, restaurant gets address_id = NULL (safe —
      the homepage query uses LEFT JOIN so it still shows up, just without location)
    - get_or_create pattern: if this user already has a restaurant with an
      address_id, we update that row instead of creating a duplicate
    """
    street_address = (data.get('address')  or '').strip()
    city           = (data.get('city')     or '').strip()
    latitude       = data.get('latitude')  or None
    longitude      = data.get('longitude') or None
    address_id     = None

    # All three fields are NOT NULL in addresses_address —
    # only proceed when every one is available
    has_full_address = bool(city and latitude is not None and longitude is not None)

    if has_full_address:
        try:
            # get_or_create: does this user already have a restaurant with an address?
            cursor.execute(
                """
                SELECT address_id FROM resturants_restaurant
                WHERE user_id = %s AND address_id IS NOT NULL
                LIMIT 1
                """,
                [user_id]
            )
            existing = cursor.fetchone()

            if existing and existing[0]:
                # Update the existing address row in-place
                address_id = existing[0]
                cursor.execute(
                    """
                    UPDATE addresses_address
                    SET street_address = %s,
                        city           = %s,
                        latitude       = %s,
                        longitude      = %s
                    WHERE address_id   = %s
                    """,
                    [street_address, city, float(latitude), float(longitude), address_id]
                )
            else:
                # Create a fresh address row
                cursor.execute(
                    """
                    INSERT INTO addresses_address
                        (street_address, city, latitude, longitude)
                    VALUES (%s, %s, %s, %s)
                    """,
                    [street_address, city, float(latitude), float(longitude)]
                )
                cursor.execute("SELECT LAST_INSERT_ID()")
                row = cursor.fetchone()
                if row and row[0]:
                    address_id = row[0]

        except Exception as exc:
            # Don't break registration if address insert fails — just log it
            log.warning(
                f"insert_restaurant: address creation failed for user {user_id}: {exc}"
            )
            address_id = None

    cursor.execute(
        """
        INSERT INTO resturants_restaurant
            (user_id, name, restaurant_category, phone, min_order,
             rating, total_rated, image_url, opening_time, closing_time, address_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        [
            user_id,
            data.get('restaurant_name', '').strip(),
            data.get('restaurant_category', 'RESTAURANT'),
            phone_number,
            0.00, 0.00, 0, '',
            None, None,   # opening_time / closing_time — set later via BusinessProfile
            address_id,   # NULL if no full address was provided
        ]
    )


def check_restaurant_owner(request):
    """
    Validates if user is authenticated and has the correct role.
    """
    if request.user.role != 'RESTAURANT':
        return False
    return True


def get_restaurant_id(user_id):
    """
    Raw SQL to find the restaurant ID associated with the user.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT id FROM resturants_restaurant WHERE user_id = %s LIMIT 1",
            [user_id]
        )
        row = cursor.fetchone()
        return row[0] if row else None


def get_all_discounts(request):
    if not check_restaurant_owner(request):
        raise PermissionError("Only Restaurant owners are allowed")

    restaurant_id = get_restaurant_id(request.user.id)

    if not restaurant_id:
        raise PermissionError("Restaurant Profile Not Found")

    with connection.cursor() as cursor:
        sql = """
            SELECT id, discount_num, percentage, min_order, description, is_active
            FROM resturants_discount
            WHERE resturant_id = %s
            ORDER BY discount_num ASC
        """
        cursor.execute(sql, [restaurant_id])
        discounts = dictfetchall(cursor)

    return discounts


def create_discount(request):
    if not check_restaurant_owner(request):
        raise PermissionError("Access denied. Only Restaurant owners allowed.")

    restaurant_id = get_restaurant_id(request.user.id)

    if not restaurant_id:
        raise NotFoundError("Restaurant Profile Not Found")

    data = request.data
    try:
        percentage  = float(data.get('percentage'))
        min_order   = data.get('min_order')
        description = data.get('description', '')
        is_active   = data.get('is_active', True)
    except (ValueError, TypeError):
        raise ValidationError("Invalid input data. Percentage is required.")

    with connection.cursor() as cursor:
        count_sql = """
            SELECT COALESCE(MAX(discount_num), 0)
            FROM resturants_discount
            WHERE resturant_id = %s
        """
        cursor.execute(count_sql, [restaurant_id])
        current_max = cursor.fetchone()[0]
        next_discount_num = current_max + 1

        insert_sql = """
            INSERT INTO resturants_discount
            (resturant_id, discount_num, percentage, min_order, description, is_active)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_sql, [
            restaurant_id,
            next_discount_num,
            percentage,
            min_order,
            description,
            is_active
        ])

    return Response({
        "message": "Discount created successfully",
        "discount_num": next_discount_num,
        "percentage": percentage,
        "description": description
    }, status=status.HTTP_201_CREATED)