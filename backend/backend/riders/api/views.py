from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from riders.api.services import (
    get_rider, get_rider_id,
    get_rider_stats, get_rider_history, update_rider_location,
)
from orders.api.services import (
    get_rider_orders, get_nearby_orders,
    accept_order, update_order_status_by_rider,
)
from exceptions import ValidationError, NotFoundError

RIDER_VALID_TRANSITIONS = {
    'PREPARING': ['PICKED_UP'],
    'PICKED_UP': ['DELIVERED'],
}
VALID_ORDER_STATUSES = {'PENDING', 'PREPARING', 'PICKED_UP', 'DELIVERED', 'CANCELLED'}


class RiderOrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rider_id = get_rider_id(request.user.id)
        if not rider_id:
            return Response(
                {"error": "Rider profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        status_filter = request.query_params.get('status', None)
        if status_filter:
            status_filter = status_filter.upper()
            if status_filter not in VALID_ORDER_STATUSES:
                return Response(
                    {
                        "error": f"'{status_filter}' is not a valid status.",
                        "valid_statuses": sorted(VALID_ORDER_STATUSES),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        orders = get_rider_orders(rider_id, status_filter)
        return Response(
            {
                "count":  len(orders),
                "orders": orders,
            },
            status=status.HTTP_200_OK,
        )


class NearbyOrdersView(APIView):
    permission_classes = [IsAuthenticated]

    def _parse_radius(self, request, default=5.0, max_radius=50.0):
        raw = request.query_params.get('radius', default)
        try:
            radius = float(raw)
            if radius <= 0:
                raise ValueError
        except (TypeError, ValueError):
            raise ValidationError("'radius' must be a positive number (kilometres).")
        return min(radius, max_radius)

    def get(self, request):
        rider = get_rider(request.user.id)
        if not rider:
            return Response(
                {"detail": "Rider profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if rider['latitude'] is None or rider['longitude'] is None:
            return Response(
                {"detail": "Rider location is not set. Please update your current position."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            radius_km = self._parse_radius(request)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        orders = get_nearby_orders(
            rider_lat=rider['latitude'],
            rider_lng=rider['longitude'],
            radius_km=radius_km,
        )

        return Response({
            "rider_location": {
                "latitude":  rider['latitude'],
                "longitude": rider['longitude'],
            },
            "radius_km": radius_km,
            "count":     len(orders),
            "orders":    orders,
        }, status=status.HTTP_200_OK)


class RiderUpdateOrderStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, order_id):
        rider_id = get_rider_id(request.user.id)
        if not rider_id:
            return Response(
                {"detail": "Rider profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get('status', '').strip().upper()

        if not new_status:
            return Response(
                {"detail": "'status' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        all_allowed_values = {v for vals in RIDER_VALID_TRANSITIONS.values() for v in vals}
        if new_status not in all_allowed_values:
            return Response(
                {
                    "detail": f"'{new_status}' is not a valid status for riders.",
                    "allowed_values": sorted(all_allowed_values),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            update_order_status_by_rider(order_id, rider_id, new_status)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"detail": f"Order status updated to {new_status}."},
            status=status.HTTP_200_OK,
        )


class RiderAcceptOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        rider_id = get_rider_id(request.user.id)
        if not rider_id:
            return Response(
                {"detail": "Rider profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order = accept_order(order_id, request.user.id)
        except (NotFoundError, ValueError) as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"detail": "Order accepted successfully.", "order_id": order_id, "order": order},
            status=status.HTTP_200_OK,
        )


class RiderStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rider_id = get_rider_id(request.user.id)
        if not rider_id:
            return Response(
                {"detail": "Rider profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )
        stats = get_rider_stats(rider_id)
        return Response(stats, status=status.HTTP_200_OK)


class RiderHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    MAX_DAYS = 365
    DEFAULT_DAYS = 30

    def get(self, request):
        rider_id = get_rider_id(request.user.id)
        if not rider_id:
            return Response(
                {"detail": "Rider profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            days = int(request.query_params.get('days', self.DEFAULT_DAYS))
            if days <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response(
                {"detail": "'days' must be a positive integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        days = min(days, self.MAX_DAYS)

        groups = get_rider_history(rider_id, days=days)
        total_orders = sum(g['order_count'] for g in groups)

        return Response({
            "days":   days,
            "count":  total_orders,
            "groups": groups,
        }, status=status.HTTP_200_OK)


class RiderLocationUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        rider_id = get_rider_id(request.user.id)
        if not rider_id:
            return Response(
                {"detail": "Rider profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        lat = request.data.get('current_latitude')
        lng = request.data.get('current_longitude')

        if lat is None or lng is None:
            return Response(
                {"detail": "Both 'current_latitude' and 'current_longitude' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lng = float(lng)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Latitude and longitude must be numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        update_rider_location(rider_id, lat, lng)
        return Response({"detail": "Location updated."}, status=status.HTTP_200_OK)