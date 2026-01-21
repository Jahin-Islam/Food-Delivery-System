from django.shortcuts import render
from django.db import connection
from rest_framework import mixins, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from resturants.models import Discount, Restaurant, Serve
from resturants.serializers import DiscountSerializer, RestaurantSerializer, ResturantDetailedSerializer
from items.serializers import ItemSerializer
from items.models import MenuItem, Category
# Create your views here.


def dictfetchall(cursor):
    ##### For Multiple Row Data ####
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]

def dictfetchone(cursor):
    #### For Getting Single Row Data #######
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))


class RestaurantView(mixins.ListModelMixin, generics.GenericAPIView):
    query = """
            SELECT *
            FROM (
                SELECT 
                res.*, 
                disc.percentage, 
                disc.min_order as min_order_for_dis, 
                disc.description,
                ROW_NUMBER() OVER (PARTITION BY res.id ORDER BY disc.percentage DESC) as rank_id
                FROM resturants_Restaurant res
                LEFT JOIN resturants_Discount disc ON res.id = disc.resturant_id
            ) AS ranked_results
            WHERE rank_id = 1;
        """
    queryset = Restaurant.objects.raw(query)
    serializer_class = RestaurantSerializer

    def get(self, request):
        return self.list(request)


class RestaurantDetailedView(APIView):
    def get(self, request, pk):
        with connection.cursor() as cursor:
            res_find_query = """
                    SELECT *
                    FROM resturants_Restaurant
                    WHERE id = %s
                """
            
            cursor.execute(res_find_query, [pk])
            restaurant = dictfetchone(cursor)

            if not restaurant:
                return Response({
                    "detail" : "Not found."
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
            
