from django.urls import path, include 
from . import views

urlpatterns = [
    path('', views.RestaurantView.as_view()),
    path('<int:pk>/', views.RestaurantDetailedView.as_view()),
    path('orders/', views.RestaurantOrderListView.as_view()),
    path('orders/<int:order_id>/', views.RestaurantOrderDetailView.as_view()),
    path('update/', views.RestaurantUpdateView.as_view()),  # ← NEW: PATCH /api/vendor/update/
]