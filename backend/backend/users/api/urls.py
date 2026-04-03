# users/api/urls.py
# COMPLETE FILE — added path('address/', DeliveryAddressView.as_view())
# This is what the Header.jsx POSTs to when user confirms a delivery address

from django.urls import path
from .views import RegisterView, MyLoginView, UserProfileView, DeliveryAddressView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/',        RegisterView.as_view(),         name='register'),
    path('login/',           MyLoginView.as_view(),          name='login'),
    path('token/refresh/',   TokenRefreshView.as_view(),     name='token_refresh'),
    path('profile/',         UserProfileView.as_view(),      name='profile'),
    path('address/',         DeliveryAddressView.as_view(),  name='delivery-address'),
]
