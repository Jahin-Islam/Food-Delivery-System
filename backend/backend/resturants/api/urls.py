from django.urls import path
from . import views

urlpatterns = [
    # ── Listing & detail ──────────────────────────────────────────────────
    path('',          views.RestaurantView.as_view()),
    path('<int:pk>/', views.RestaurantDetailedView.as_view()),

    # ── Restaurant self-management ────────────────────────────────────────
    path('update/',   views.RestaurantUpdateView.as_view()),

    # ── Order management ─────────────────────────────────────────────────
    path('orders/',                               views.RestaurantOrderListView.as_view()),
    path('orders/<int:order_id>/',                views.RestaurantOrderDetailView.as_view()),
    # FIX: dedicated cancel endpoint — clears rider_id on cancel
    path('orders/<int:order_id>/cancel/',         views.RestaurantCancelOrderView.as_view()),
]