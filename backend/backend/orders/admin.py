from django.contrib import admin
from .models import Order, OrderItemList
# Register your models here.
admin.site.register(OrderItemList)
admin.site.register(Order)