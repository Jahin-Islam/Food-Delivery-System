from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from riders.api.services import (
    get_rider, get_nearby_orders, get_rider_id,
    update_order_status_by_rider, accept_order,
    get_rider_stats, get_rider_history, update_rider_location,
)
from orders.api.services import get_rider_orders
from exceptions import ValidationError, NotFoundError

RIDER_VALID_TRANSITIONS = {
    'PREPARING': ['PICKED_UP'],
    'PICKED_UP': ['DELIVERED'],
}
VALID_ORDER_STATUSES = {'PENDING', 'PREPARING', 'PICKED_UP', 'DELIVERED', 'CANCELLED'}

class RiderOrderListView(APIView):
    """
    GET /api/riders/me/orders/
    GET /api/riders/me/orders/?status=DELIVERED
 
    Returns all orders assigned to the authenticated rider,
    optionally filtered by the `status` query parameter.
    """
    permission_classes = [IsAuthenticated]
 
    def get(self, request):
 
        # ── 1. Resolve rider profile ──
        rider_id = get_rider_id(request.user.id)
        if not rider_id:
            return Response(
                {"error": "Rider profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        # ── 2. Parse and validate optional status filter ──
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
 
        # ── 3. Fetch and return ──
        orders = get_rider_orders(rider_id, status_filter)
        return Response(
            {
                "count":  len(orders),
                "orders": orders,
            },
            status=status.HTTP_200_OK,
        )


class NearbyOrdersView(APIView):
    """
    GET /orders/nearby/

    Query parameters:
        radius  (float, optional) – search radius in km, default 5, max 50

    The authenticated user must be a Rider.
    The rider's stored current_latitude / current_longitude are used as the
    centre of the search circle.

    Response 200:
        {
            "rider_location": { "latitude": ..., "longitude": ... },
            "radius_km": 5.0,
            "count": 3,
            "orders": [ { order fields + distance_km + items[] }, ... ]
        }
    """
    permission_classes = [IsAuthenticated]

    # ── 1. Confirm the user has a rider profile ──────────────────────────

    # ── 2. Parse and clamp the radius query param ────────────────────────
    def _parse_radius(self, request, default=5.0, max_radius=50.0):
        raw = request.query_params.get('radius', default)
        try:
            radius = float(raw)
            if radius <= 0:
                raise ValueError
        except (TypeError, ValueError):
            raise ValidationError("'radius' must be a positive number (kilometres).")
        return min(radius, max_radius)   # never exceed max_radius

    # ── 3. Main handler ──────────────────────────────────────────────────
    def get(self, request):
        # Authenticate as rider
        rider = get_rider(request.user.id)
        if not rider:
            return Response(
                {"detail": "Rider profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validate rider has a known location
        if rider['latitude'] is None or rider['longitude'] is None:
            return Response(
                {"detail": "Rider location is not set. Please update your current position."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse radius
        try:
            radius_km = self._parse_radius(request)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch nearby orders
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
    """

    Body:
        { "status": "PICKED_UP" }   or   { "status": "DELIVERED" }

    Rules:
        - Caller must be an authenticated rider.
        - The order must already be assigned to this rider.
        - Only the transitions below are permitted:
              PREPARING  → PICKED_UP
              PICKED_UP  → DELIVERED
        - Marking an order DELIVERED automatically stamps delivered_at.

    Responses:
        200  { "detail": "Order status updated to PICKED_UP." }
        400  bad / missing status value, or invalid transition
        403  user has no rider profile
        404  order not found or not assigned to this rider
    """
    permission_classes = [IsAuthenticated]

    ALLOWED_STATUSES = set(RIDER_VALID_TRANSITIONS.keys())   # PREPARING, PICKED_UP

    def patch(self, request, order_id):

        # ── 1. Resolve rider profile ──
        rider_id = get_rider_id(request.user.id)
        if not rider_id:
            return Response(
                {"detail": "Rider profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── 2. Parse and validate the requested new status ──
        new_status = request.data.get('status', '').strip().upper()

        if not new_status:
            return Response(
                {"detail": "'status' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Flat list of all values a rider is ever allowed to set
        all_allowed_values = {v for vals in RIDER_VALID_TRANSITIONS.values() for v in vals}
        if new_status not in all_allowed_values:
            return Response(
                {
                    "detail": f"'{new_status}' is not a valid status for riders.",
                    "allowed_values": sorted(all_allowed_values),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 3. Delegate to the service ──
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
    """
    POST /orders/<order_id>/accept/

    No request body needed — the rider is resolved from the auth token.

    Rules:
        - Caller must be an authenticated rider.
        - Order must be in PENDING or PREPARING status.
        - Order must not already be assigned to another rider.

    Responses:
        200  { "detail": "Order accepted successfully.", "order_id": 42 }
        400  order already taken or wrong status
        403  user has no rider profile
        404  order not found
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):

        # ── 1. Resolve rider profile ──
        rider_id = get_rider_id(request.user.id)
        if not rider_id:
            return Response(
                {"detail": "Rider profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── 2. Delegate to the service ──
        try:
            accept_order(order_id, rider_id)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"detail": "Order accepted successfully.", "order_id": order_id},
            status=status.HTTP_200_OK,
        )

class RiderStatsView(APIView):
    """
    GET /api/riders/me/stats/

    Returns live header stats for the rider dashboard:
        {
            "orders_today":   3,
            "today_earnings": 145.50,
            "wallet_balance": 1240.75
        }
    """
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
    """
    GET /api/riders/me/history/
    GET /api/riders/me/history/?days=7

    Query params:
        days (int, optional) — look-back window, default 30, max 365

    Returns delivered orders grouped by date (Dhaka local time):
        {
            "days":  30,
            "count": 12,
            "groups": [
                {
                    "date":           "2025-07-15",
                    "label":          "Today",
                    "order_count":    4,
                    "total_earnings": 210.00,
                    "orders": [
                        {
                            "order_id":        42,
                            "completed_at":    "2025-07-15T13:32:00",
                            "restaurant_name": "KFC Gulshan",
                            "customer_name":   "Hassan Ali",
                            "total_amount":    380.00,
                            "delivery_charge": 40.00,
                            "rider_tip":       20.00,
                            "earnings":        30.00
                        },
                        ...
                    ]
                },
                ...
            ]
        }
    """
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

        # Parse ?days param
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
    """
    PATCH /api/riders/location/

    Body: { "current_latitude": 23.78, "current_longitude": 90.40 }

    Updates the rider's GPS coordinates in the database.
    """
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