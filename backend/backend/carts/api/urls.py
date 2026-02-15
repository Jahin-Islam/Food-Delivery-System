from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.AllCartsView.as_view()),
    path('<int:restaurant_id>/', views.SingleRestaurantCart.as_view()),
]