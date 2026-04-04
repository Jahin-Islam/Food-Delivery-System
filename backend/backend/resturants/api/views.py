from django.shortcuts import render
from django.db import connection
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from cloudinary import CloudinaryImage
from orders.api.services import (
    get_restaurant_orders, update_order_status_by_restaurant,
    get_order_items, get_order_details, cancel_order,
)
from utility import dictfetchall, dictfetchone


VALID_ORDER_STATUSES = {'PENDING', 'PREPARING', 'PICKED_UP', 'DELIVERED', 'CANCELLED'}


# def dictfetchall(cursor):
#     columns = [col[0] for col in cursor.description]
#     return [dict(zip(columns, row)) for row in cursor.fetchall()]


# def dictfetchone(cursor):
#     row = cursor.fetchone()
#     if row is None:
#         return None
#     columns = [col[0] for col in cursor.description]
#     return dict(zip(columns, row))


def get_restaurant_id(user_id):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT id FROM resturants_restaurant WHERE user_id = %s",
            [user_id]
        )
        row = cursor.fetchone()
    return row[0] if row else None


def build_cloudinary_url(public_id):
    if not public_id:
        return None
    return CloudinaryImage(public_id).build_url(
        quality="auto",
        fetch_format="auto",
    )




class RestaurantView(APIView):
    permission_classes = [AllowAny]

    _SQL = """
        SELECT *
        FROM (
            SELECT
                res.id,
                res.name,
                res.rating,
                res.total_rated,
                res.opening_time,
                res.closing_time,
                res.min_order,
                res.restaurant_category,
                res.phone,
                res.image,
                addr.street_address,
                addr.latitude,
                addr.longitude,
                disc.percentage,
                disc.min_order   AS min_order_for_discount,
                disc.description AS discount_desc,
                ROW_NUMBER() OVER (
                    PARTITION BY res.id
                    ORDER BY COALESCE(disc.percentage, -1) DESC
                ) AS rank_id
            FROM resturants_restaurant res
            LEFT JOIN resturants_discount disc
                   ON disc.resturant_id = res.id
                  AND disc.is_active    = 1
            LEFT JOIN addresses_address addr
                   ON addr.address_id = res.address_id
        ) AS ranked
        WHERE rank_id = 1
        ORDER BY id ASC
    """

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute(self._SQL)
            rows = dictfetchall(cursor)

        for row in rows:
            row['image_url'] = build_cloudinary_url(row.pop('image', None))
            for tf in ('opening_time', 'closing_time'):
                val = row.get(tf)
                if val is not None and hasattr(val, 'strftime'):
                    row[tf] = val.strftime('%H:%M')
            row.pop('rank_id', None)

        return Response(rows, status=status.HTTP_200_OK)


class RestaurantDetailedView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT
                    res.*,
                    addr.street_address,
                    addr.latitude,
                    addr.longitude
                FROM resturants_restaurant res
                LEFT JOIN addresses_address addr
                       ON addr.address_id = res.address_id
                WHERE res.id = %s
            """, [pk])
            restaurant = dictfetchone(cursor)

            if not restaurant:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

            restaurant['image_url'] = build_cloudinary_url(restaurant.pop('image', None))

            for tf in ('opening_time', 'closing_time'):
                val = restaurant.get(tf)
                if val is not None and hasattr(val, 'strftime'):
                    restaurant[tf] = val.strftime('%H:%M')

            cursor.execute("""
                SELECT
                    mi.*,
                    c.category_name,
                    c.category_id
                FROM items_menuitem mi
                LEFT JOIN items_category c ON mi.category_id = c.category_id
                WHERE mi.restaurant_id = %s
            """, [pk])
            items = dictfetchall(cursor)

            for item in items:
                item['image_url'] = build_cloudinary_url(item.get('image'))

            cursor.execute("""
                SELECT *
                FROM resturants_discount
                WHERE resturant_id = %s AND is_active = 1
            """, [pk])
            discounts = dictfetchall(cursor)

        restaurant['items']     = items
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
            return Response({"error": "status is required."}, status=status.HTTP_400_BAD_REQUEST)

        new_status = new_status.upper()
        try:
            update_order_status_by_restaurant(order_id, restaurant_id, new_status)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"message": f"Order {order_id} status updated to {new_status}."},
            status=status.HTTP_200_OK
        )


class RestaurantCancelOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
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

        try:
            result = cancel_order(order_id, cancelled_by='restaurant')
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_409_CONFLICT)

        return Response(result, status=status.HTTP_200_OK)


class RestaurantUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        restaurant_id = get_restaurant_id(request.user.id)
        if not restaurant_id:
            return Response(
                {"error": "Restaurant profile not found for this account."},
                status=status.HTTP_404_NOT_FOUND
            )

        ALLOWED = {'name', 'opening_time', 'closing_time', 'phone'}
        updates = {k: v for k, v in request.data.items() if k in ALLOWED}

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
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"message": "Restaurant updated successfully."}, status=status.HTTP_200_OK)