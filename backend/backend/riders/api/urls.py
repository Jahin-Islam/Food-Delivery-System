from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    # Orders
    path('me/orders/',                           views.RiderOrderListView.as_view()),
    path('orders/nearby/',                       views.NearbyOrdersView.as_view()),
    path('orders/update-status/<int:order_id>/', views.RiderUpdateOrderStatusView.as_view()),
    path('orders/accept/<int:order_id>/',        views.RiderAcceptOrderView.as_view()),

    # Stats & History
    path('me/stats/',                            views.RiderStatsView.as_view()),
    path('me/history/',                          views.RiderHistoryView.as_view()),

    # Location
    path('location/',                            views.RiderLocationUpdateView.as_view()),
]