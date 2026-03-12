from django.urls import path
from . import views

urlpatterns = [
    # Addresses  (GET = list, POST = create)
    path('me/addresses/', views.CustomerAddressListView.as_view(), name='customer-addresses'),
    # Addresses  (PUT = update)
    path('me/addresses/<int:address_id>/', views.CustomerAddressDetailView.as_view(), name='customer-address-detail'),

    # Orders  (GET = list)
    path('me/orders/', views.CustomerOrderListView.as_view(), name='customer-orders'),
    # Orders  (GET = detail with items)
    path('me/orders/<int:order_id>/', views.CustomerOrderDetailView.as_view(), name='customer-order-detail'),

    # Wallet  (GET = balance, POST = top-up)
    path('me/wallet/', views.CustomerWalletView.as_view(), name='customer-wallet'),
]