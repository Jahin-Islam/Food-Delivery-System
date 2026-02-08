from django.urls import path, include 
from . import views

urlpatterns = [
    path('', views.RestaurantView.as_view()),
    path('<int:pk>/', views.RestaurantDetailedView.as_view()),
]
