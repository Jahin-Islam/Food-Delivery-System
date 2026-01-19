from django.urls import path, include 
from .import views

urlpatterns = [
    path('restaurants/', views.RestaurantView.as_view()),
    path('restaurants/<int:pk>/', views.RestaurantDetailedView.as_view()),
]
