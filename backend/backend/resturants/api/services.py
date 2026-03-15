from utility import dictfetchall
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from exceptions import PermissionError, ConflictError, NotFoundError, ValidationError

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