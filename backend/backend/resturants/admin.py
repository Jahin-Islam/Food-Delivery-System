from django.contrib import admin
from .models import Restaurant, Discount, Serve
# Register your models here.

admin.site.register(Restaurant)
admin.site.register(Discount)
admin.site.register(Serve)