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
"""
{
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc3MDYzODEyNCwiaWF0IjoxNzcwNTUxNzI0LCJqdGkiOiI4MDM4MzBlNGY4ZjM0ZTVkOGNhYWI5MjUwMTIwMjhhMiIsInVzZXJfaWQiOiIzMyIsInJvbGUiOiJDVVNUT01FUiIsImVtYWlsIjoiY3VzdG9tZXIxQGV4YW1wbGUuY29tIn0.u4BrGXC5fIQtN8dk31eCvDIgaehHa-hO_-FtQgumZG0",
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcwNTU1MzI0LCJpYXQiOjE3NzA1NTE3MjQsImp0aSI6ImI2NzFjZWE5MzI1NDQ1ZjlhYjU1NGE3M2U2ZjJmYWU2IiwidXNlcl9pZCI6IjMzIiwicm9sZSI6IkNVU1RPTUVSIiwiZW1haWwiOiJjdXN0b21lcjFAZXhhbXBsZS5jb20ifQ.-GaT3preLYnU_cRCOCXUooyHfMfnmbt9KHnkkv0EKYU",
    "role": "CUSTOMER",
    "email": "customer1@example.com",
    "user_id": 33
}
"""