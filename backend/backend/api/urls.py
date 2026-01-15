from django.urls import path, include 
from .import views

urlpatterns = [
    path('restaurants', views.RestaurantView.as_view())
]
