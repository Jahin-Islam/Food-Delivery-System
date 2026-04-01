# business_owner/api/urls.py  (or wherever your /api/v1/vendor/ routes live)
# Add the two order-history paths — everything else stays as-is.

from django.urls import path
from . import views
# Import the two new history views from the restaurants app

urlpatterns = [
    # ── your existing vendor routes (keep all of these) ──────────
    path('discounts/', views.RestaurantDiscountView.as_view()),
    path('discounts/<int:pk>/', views.RestaurantDiscountDetailedView.as_view()),
    path('categories/', views.CategoryView.as_view()),
    path('categories/<int:pk>/', views.CategoryDetailedView.as_view()),
    path('items/', views.MenuItemView.as_view()),
    path('items/<int:pk>/', views.MenuItemDetailedView.as_view()),

    # ── NEW: order history ────────────────────────────────────────
    # GET /api/v1/vendor/order-history/
    path('order-history/', views.RestaurantOrderHistoryView.as_view()),
    # GET /api/v1/vendor/order-history/<order_id>/
    path('order-history/<int:order_id>/', views.RestaurantOrderHistoryDetailView.as_view()),
]