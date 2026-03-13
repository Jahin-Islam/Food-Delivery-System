from django.shortcuts import render
from django.db import connection
from rest_framework import mixins, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from ..models import Discount, Restaurant, Serve
from .serializers import DiscountSerializer, RestaurantSerializer, ResturantDetailedSerializer
from items.serializers import ItemSerializer
from items.models import MenuItem, Category


def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def dictfetchone(cursor):
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))


class RestaurantView(mixins.ListModelMixin, generics.GenericAPIView):
    permission_classes = [AllowAny]   # ← public endpoint, no login needed

    query = """
     SELECT *
    FROM (
        SELECT 
        res.id,
        res.name,
        res.rating,
        res.opening_time,
        res.closing_time,
        res.min_order,
        addr.street_address,
        addr.latitude,
        addr.longitude,
        disc.percentage, 
        disc.min_order AS min_order_for_discount, 
        disc.description AS discount_desc,
        ROW_NUMBER() OVER (
            PARTITION BY res.id 
            ORDER BY disc.percentage DESC
        ) AS rank_id
        FROM resturants_restaurant res
        LEFT JOIN resturants_discount disc ON res.id = disc.resturant_id
        LEFT JOIN addresses_address addr ON addr.address_id = res.address_id
    ) AS ranked_results
    WHERE rank_id = 1;
        """
    queryset = Restaurant.objects.raw(query)
    serializer_class = RestaurantSerializer

    def get(self, request):
        response = self.list(request)
        return response


class RestaurantDetailedView(APIView):
    permission_classes = [AllowAny]   # ← public endpoint, no login needed

    def get(self, request, pk):
        with connection.cursor() as cursor:
            res_find_query = """
                    SELECT 
                    res.*,
                    addr.street_address,
                    addr.latitude,
                    addr.longitude
                    FROM resturants_Restaurant res
                    LEFT JOIN addresses_address addr ON addr.address_id = res.address_id
                    WHERE res.id = %s
                """
            cursor.execute(res_find_query, [pk])
            restaurant = dictfetchone(cursor)

            if not restaurant:
                return Response({
                    "detail": "Not found."
                }, status=status.HTTP_404_NOT_FOUND)

            item_find_query = """
                SELECT 
                mi.*, 
                c.category_name,
                c.category_id
                FROM items_menuitem mi
                LEFT JOIN items_category c ON mi.category_id = c.category_id
                WHERE mi.restaurant_id = %s
                """
            cursor.execute(item_find_query, [pk])
            items = dictfetchall(cursor)

            discount_find_query = """
                SELECT *
                FROM resturants_Discount
                WHERE resturant_id = %s
            """
            cursor.execute(discount_find_query, [pk])
            discounts = dictfetchall(cursor)

            restaurant['items'] = items
            restaurant['discounts'] = discounts

            return Response(restaurant, status=status.HTTP_200_OK)