from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('me/orders/', views.RiderOrderListView.as_view()),
    path('orders/nearby/', views.NearbyOrdersView.as_view()),
    path('orders/update-status/<int:order_id>/', views.RiderUpdateOrderStatusView.as_view()),
    path('orders/accept/<int:order_id>/', views.RiderAcceptOrderView.as_view()),
]