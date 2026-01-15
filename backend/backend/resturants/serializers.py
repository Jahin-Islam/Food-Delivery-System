from .models import Discount, Restaurant
from rest_framework import serializers

class DiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discount
        fields = "__all__"

class RestaurantSerializer(serializers.ModelSerializer):
    discounts = DiscountSerializer(many = True, read_only = True)
    class Meta:
        model = Restaurant
        fields = "__all__"