# resturants/api/urls.py  — COMPLETE REPLACEMENT
# Adds the two new order-history endpoints.

from django.urls import path
from . import views

urlpatterns = [
    # ── existing ──────────────────────────────────────────────────
    path('',        views.RestaurantView.as_view()),
    path('<int:pk>/', views.RestaurantDetailedView.as_view()),
    path('orders/', views.RestaurantOrderListView.as_view()),
    path('orders/<int:order_id>/', views.RestaurantOrderDetailView.as_view()),
    path('update/', views.RestaurantUpdateView.as_view()),

]