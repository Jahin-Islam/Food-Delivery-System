from utility import dictfetchall
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from exceptions import PermissionError, ConflictError, NotFoundError, ValidationError


def insert_restaurant(cursor, user_id, phone_number, data):
    """
    Insert a resturants_restaurant row.
    MySQL NULL is passed as Python None — Django's MySQL backend
    converts None → NULL automatically.
    """
    cursor.execute(
        """
        INSERT INTO resturants_restaurant
            (user_id, name, restaurant_category, phone, min_order,
                rating, total_rated, image_url, opening_time, closing_time)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        [
            user_id,
            data.get('restaurant_name', '').strip(),
            data.get('restaurant_category', 'RESTAURANT'),
            phone_number,
            0.00, 0.00, 0, '',
            None, None,   # opening_time / closing_time → NULL in MySQL
        ]
    )

def check_restaurant_owner(request):
    """
    Validates if user is authenticated and has the correct role.
    """
    # 1. Check Role
    if request.user.role != 'RESTAURANT':
        return False
    return True
def get_restaurant_id(user_id):
    """
    Raw SQL to find the restaurant ID associated with the user.
    """
    with connection.cursor() as cursor:
        # Table name assumption: 'restaurants_restaurant' 
        # (app_name + "_" + model_name in lowercase)
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

    # RAW SQL: Get all discounts for this restaurant
    with connection.cursor() as cursor:
        # We select specific fields to return cleanly
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

    # Extract data from request body (Manual parsing, no serializer validation)
    data = request.data
    try:
        percentage = float(data.get('percentage'))
        min_order = data.get('min_order') # Can be None/Null
        description = data.get('description', '')
        is_active = data.get('is_active', True)
        
    except (ValueError, TypeError):
        raise ValidationError("Invalid input data. Percentage is required.")

    with connection.cursor() as cursor:
        # RAW SQL: Logic to find current max discount_num
        # COALESCE ensures if result is NULL (no records), we get 0
        count_sql = """
            SELECT COALESCE(MAX(discount_num), 0) 
            FROM resturants_discount 
            WHERE resturant_id = %s
        """
        cursor.execute(count_sql, [restaurant_id])
        current_max = cursor.fetchone()[0]
        
        # Logic: Add 1 to the max number
        next_discount_num = current_max + 1

        # RAW SQL: Insert the new discount
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