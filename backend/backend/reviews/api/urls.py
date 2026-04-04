from django.urls import path
from .views import OrderReviewView, RestaurantReviewListView

urlpatterns = [
    path(
        "orders/<int:order_id>/",
        OrderReviewView.as_view(),
        name="order-review",
    ),
    path(
        "restaurant/<int:restaurant_id>/",
        RestaurantReviewListView.as_view(),
        name="restaurant-reviews",
    ),
]