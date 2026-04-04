from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from . import services


def _get_customer_id(user_id):
    """Resolve auth user_id → customer.id using raw SQL (same as orders/services.py)."""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT id FROM customers_customer WHERE user_id = %s",
            [user_id],
        )
        row = cursor.fetchone()
    return row[0] if row else None


def _validate_rating(value):
    """Return (float, error_str). error_str is None when valid."""
    try:
        r = float(value)
    except (TypeError, ValueError):
        return None, "rating must be a number."
    if not (0 <= r <= 5):
        return None, "rating must be between 0 and 5."
    return round(r, 2), None


class OrderReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        review = services.get_review_by_order(order_id)
        if not review:
            return Response(
                {"detail": "No review found for this order."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(review)

    def post(self, request, order_id):
        customer_id = _get_customer_id(request.user.id)
        if not customer_id:
            return Response(
                {"detail": "Customer profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not services.order_is_delivered_and_belongs_to_customer(order_id, customer_id):
            return Response(
                {"detail": "You can only review your own delivered orders."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if services.review_exists_for_order(order_id):
            return Response(
                {"detail": "A review already exists for this order. Use PUT to update it."},
                status=status.HTTP_409_CONFLICT,
            )

        rating, err = _validate_rating(request.data.get("rating"))
        if err:
            return Response({"detail": err}, status=status.HTTP_400_BAD_REQUEST)

        comment = str(request.data.get("comment", "")).strip()
        if not comment:
            return Response({"detail": "comment is required."}, status=status.HTTP_400_BAD_REQUEST)

        review = services.create_review(order_id, rating, comment)
        return Response(review, status=status.HTTP_201_CREATED)

    def put(self, request, order_id):
        customer_id = _get_customer_id(request.user.id)
        if not customer_id:
            return Response(
                {"detail": "Customer profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not services.order_is_delivered_and_belongs_to_customer(order_id, customer_id):
            return Response(
                {"detail": "You can only edit reviews for your own delivered orders."},
                status=status.HTTP_403_FORBIDDEN,
            )

        review = services.get_review_by_order(order_id)
        if not review:
            return Response(
                {"detail": "No review found. Use POST to create one."},
                status=status.HTTP_404_NOT_FOUND,
            )

        rating, err = _validate_rating(request.data.get("rating", review["rating"]))
        if err:
            return Response({"detail": err}, status=status.HTTP_400_BAD_REQUEST)

        comment = str(request.data.get("comment", review["comment"])).strip()

        updated = services.update_review(review["review_id"], rating, comment)
        return Response(updated)


class RestaurantReviewListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, restaurant_id):
        try:
            limit  = int(request.query_params.get("limit",  50))
            offset = int(request.query_params.get("offset",  0))
        except ValueError:
            return Response(
                {"detail": "limit and offset must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reviews = services.get_reviews_by_restaurant(restaurant_id, limit, offset)
        return Response({"results": reviews, "count": len(reviews)})