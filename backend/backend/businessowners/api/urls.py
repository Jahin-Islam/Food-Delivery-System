from django.urls import path, include 
from . import views

urlpatterns = [
    path('discounts/', views.RestaurantDiscountView.as_view()),
    path('discounts/<int:pk>/', views.RestaurantDiscountDetailedView.as_view()),
    path('categories/', views.CategoryView.as_view()),
    path('categories/<int:pk>/', views.CategoryDetailedView.as_view()),
]
