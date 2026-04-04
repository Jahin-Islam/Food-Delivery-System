# resturants/api/services.py
# COMPLETE FILE — replace your existing resturants/api/services.py with this

from utility import dictfetchall
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from exceptions import PermissionError, ConflictError, NotFoundError, ValidationError
from addresses.api.services import insert_address
from cloudinary import CloudinaryImage

def insert_restaurant(cursor, user_id, phone_number, data):
    """
    Insert a resturants_restaurant row, and an addresses_address row if the
    frontend supplied enough location data.

    Expected request.data fields
    ----------------------------
    restaurant_name     : str   (required)
    restaurant_category : str   (optional, defaults to 'RESTAURANT')
    address             : str   street address from Nominatim  (optional)
    city                : str   city from Nominatim reverse geocode (optional)
    latitude            : float (optional)
    longitude           : float (optional)

    Address behaviour
    -----------------
    - insert_address() requires city, latitude, and longitude because those
      columns are NOT NULL in addresses_address.
    - When all three are present we call insert_address() and store the
      returned address_id on the restaurant row.
    - When any of the three is missing we leave address_id as NULL.
      The homepage query uses LEFT JOIN so the restaurant still appears,
      just without a map location.
    - This is a brand-new registration, so there is no "existing address" to
      worry about — we always INSERT, never UPDATE, here.
    - The cursor is already inside transaction.atomic() (opened in the view),
      so if insert_address() or the restaurant INSERT fails, everything rolls
      back automatically.
    """
    street_address = (data.get('address') or '').strip()
    city           = (data.get('city')    or '').strip()
    latitude       = data.get('latitude')  or None
    longitude      = data.get('longitude') or None
    address_id     = None

    # addresses_address has NOT NULL constraints on city, latitude, longitude —
    # only create the row when all three arrive from the frontend.
    has_full_address = bool(city and latitude is not None and longitude is not None)

    if has_full_address:
        # insert_address() handles the INSERT and returns the new PK.
        # Any exception propagates up to transaction.atomic() in the view,
        # which rolls back the whole registration — no silent swallowing.
        address_id = insert_address(cursor, street_address, city, latitude, longitude)

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
            address_id,   # NULL when no full address was provided
        ]
    )

    # FIX: mirror what insert_rider does — store the address on the user row too
    # so users_user.address_id is never NULL for restaurant owners who picked a location.
    if address_id:
        cursor.execute(
            "UPDATE users_user SET address_id = %s WHERE id = %s",
            [address_id, user_id]
        )


def get_restaurant_profile(restaurant_id):
    """
    Return the editable profile fields for a restaurant.

    Image handling
    --------------
    The `image` column stores only the Cloudinary public_id path
    (e.g. "media/restaurant_profile_image/restaurant_4_profile").
    We build the full delivery URL via CloudinaryImage so the frontend
    receives a ready-to-use `image_url` string and never has to know
    about Cloudinary internals.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, name, phone, opening_time, closing_time, image,
                   restaurant_category, rating, min_order
            FROM resturants_restaurant
            WHERE id = %s
        """, [restaurant_id])
        row = cursor.fetchone()
    if not row:
        return None
    keys = ('id', 'name', 'phone', 'opening_time', 'closing_time',
            'image', 'restaurant_category', 'rating', 'min_order')
    result = dict(zip(keys, row))

    # Serialise time fields to "HH:MM" strings so JSON is clean
    for tf in ('opening_time', 'closing_time'):
        val = result[tf]
        if hasattr(val, 'strftime'):
            result[tf] = val.strftime('%H:%M')

    # Build full Cloudinary URL from the stored public_id path
    raw_image = result.pop('image')   # remove raw path, expose clean URL instead
    if raw_image:
        result['image_url'] = CloudinaryImage(raw_image).build_url()
    else:
        result['image_url'] = None

    return result


def update_restaurant_profile(restaurant_id, updates):
    """
    Dynamically update only the supplied fields on resturants_restaurant.

    `updates` is a dict of {column_name: value} for any subset of:
        name, phone, opening_time, closing_time, image
    Note: the image column stores the Cloudinary public_id path only.
    """
    if not updates:
        return
    set_clause = ', '.join(f"{col} = %s" for col in updates)
    params     = list(updates.values()) + [restaurant_id]
    with connection.cursor() as cursor:
        cursor.execute(
            f"UPDATE resturants_restaurant SET {set_clause} WHERE id = %s",
            params,
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