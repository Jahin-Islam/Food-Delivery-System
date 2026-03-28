from django.shortcuts import render
from django.db import connection
from rest_framework import mixins, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from ..models import Discount, Restaurant, Serve
from .serializers import DiscountSerializer, RestaurantSerializer, ResturantDetailedSerializer
from items.serializers import ItemSerializer
from items.models import MenuItem, Category
from cloudinary import CloudinaryImage
from orders.api.services import get_restaurant_orders, update_order_status_by_restaurant, get_order_items, get_order_details


VALID_ORDER_STATUSES = {'PENDING', 'PREPARING', 'PICKED_UP', 'DELIVERED', 'CANCELLED'}

def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def dictfetchone(cursor):
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))

def get_restaurant_id(user_id):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id FROM resturants_restaurant WHERE user_id = %s
        """, [user_id])
        row = cursor.fetchone()
    return row[0] if row else None


class RestaurantView(mixins.ListModelMixin, generics.GenericAPIView):
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

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

            for item in items:
                public_id = item.get('image')
                if public_id:
                    item['image_url'] = CloudinaryImage(public_id).build_url(
                        quality="auto",
                        fetch_format="auto",
                    )
                else:
                    item['image_url'] = None

            discount_find_query = """
                SELECT *
                FROM resturants_Discount
                WHERE resturant_id = %s AND is_active = 1
            """
            cursor.execute(discount_find_query, [pk])
            discounts = dictfetchall(cursor)

            restaurant['items'] = items
            restaurant['discounts'] = discounts

            return Response(restaurant, status=status.HTTP_200_OK)


class RestaurantOrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        restaurant_id = get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response(
                {"error": "Restaurant profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        status_filter = request.query_params.get('status')

        if status_filter:
            status_filter = status_filter.upper()
            if status_filter not in VALID_ORDER_STATUSES:
                return Response(
                    {"error": f"Invalid status. Valid values are: {sorted(VALID_ORDER_STATUSES)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        orders = get_restaurant_orders(restaurant_id, status_filter)
        return Response(orders, status=status.HTTP_200_OK)


class RestaurantOrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        restaurant_id = get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response(
                {"error": "Restaurant profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 1 FROM orders_order
                WHERE order_id = %s AND restaurant_id = %s
            """, [order_id, restaurant_id])
            if not cursor.fetchone():
                return Response(
                    {"error": "Order not found or does not belong to your restaurant."},
                    status=status.HTTP_403_FORBIDDEN
                )

        order = get_order_details(order_id)
        order['items'] = get_order_items(order_id)

        return Response(order, status=status.HTTP_200_OK)

    def patch(self, request, order_id):
        restaurant_id = get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response(
                {"error": "Restaurant profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {"error": "status is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_status = new_status.upper()

        try:
            update_order_status_by_restaurant(order_id, restaurant_id, new_status)
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {"message": f"Order {order_id} status updated to {new_status}."},
            status=status.HTTP_200_OK
        )


# ─────────────────────────────────────────────────────────────────────────────
# RESTAURANT UPDATE
# ─────────────────────────────────────────────────────────────────────────────

class RestaurantUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        restaurant_id = get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response(
                {"error": "Restaurant profile not found for this account."},
                status=status.HTTP_404_NOT_FOUND
            )

        data    = request.data
        ALLOWED = {'name', 'opening_time', 'closing_time', 'phone'}
        updates = {k: v for k, v in data.items() if k in ALLOWED}

        if not updates:
            return Response(
                {"error": "No valid fields provided. You can update: name, opening_time, closing_time, phone"},
                status=status.HTTP_400_BAD_REQUEST
            )

        set_clause = ', '.join(f"{col} = %s" for col in updates)
        values     = list(updates.values()) + [restaurant_id]

        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"UPDATE resturants_restaurant SET {set_clause} WHERE id = %s",
                    values
                )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {"message": "Restaurant updated successfully."},
            status=status.HTTP_200_OK
        )