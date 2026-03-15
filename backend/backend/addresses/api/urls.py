from django.urls import path, include
from .import views

urlpatterns = [
    path('delivery-addresses/', views.CustomerDeliveryAddressListView.as_view()),
    path('delivery-addresses/<int:address_id>/', views.CustomerDeliveryAddressDetailView.as_view()),
]