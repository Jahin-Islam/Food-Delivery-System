from django.urls import path
from . import views

urlpatterns = [
    path('me/orders/', views.CustomerOrderListView.as_view(), name='customer-orders'),
    path('me/orders/<int:order_id>/', views.CustomerOrderDetailView.as_view(), name='customer-order-detail'),

    path('me/addresses/', views.CustomerAddressListView.as_view(), name='customer-addresses'),
    path('me/addresses/<int:address_id>/', views.CustomerAddressDetailView.as_view(), name='customer-address-detail'),    
]