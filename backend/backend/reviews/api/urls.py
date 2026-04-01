from django.urls import path
from .views import OrderReviewView, RestaurantReviewListView

urlpatterns = [
    # POST / GET / PUT  →  create, fetch, or edit the review for an order
    path(
        "orders/<int:order_id>/",
        OrderReviewView.as_view(),
        name="order-review",
    ),

    # GET  →  all reviews for a restaurant (public, paginated)
    path(
        "restaurant/<int:restaurant_id>/",
        RestaurantReviewListView.as_view(),
        name="restaurant-reviews",
    ),
]

# ─── Add this one line to your root urls.py ───────────────────────────────────
#
#   path("api/reviews/", include("reviews.api.urls")),
#
# Final URLs — no conflicts with any existing route:
#   POST/GET/PUT  →  /api/reviews/orders/<order_id>/
#   GET           →  /api/reviews/restaurant/<restaurant_id>/