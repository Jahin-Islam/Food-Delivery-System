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
    street_address = (data.get('address') or '').strip()
    city           = (data.get('city')    or '').strip()
    latitude       = data.get('latitude')  or None
    longitude      = data.get('longitude') or None
    address_id     = None

    has_full_address = bool(city and latitude is not None and longitude is not None)

    if has_full_address:
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
            None, None,
            address_id,   
        ]
    )
    if address_id:
        cursor.execute(
            "UPDATE users_user SET address_id = %s WHERE id = %s",
            [address_id, user_id]
        )


def get_restaurant_profile(restaurant_id):
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

    for tf in ('opening_time', 'closing_time'):
        val = result[tf]
        if hasattr(val, 'strftime'):
            result[tf] = val.strftime('%H:%M')
    raw_image = result.pop('image') 
    if raw_image:
        result['image_url'] = CloudinaryImage(raw_image).build_url()
    else:
        result['image_url'] = None

    return result


def update_restaurant_profile(restaurant_id, updates):
    
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
    if request.user.role != 'RESTAURANT':
        return False
    return True


def get_restaurant_id(user_id):
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