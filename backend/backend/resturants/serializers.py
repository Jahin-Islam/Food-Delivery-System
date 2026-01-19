from .models import Discount, Restaurant
from items.serializers import ItemSerializer
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

class ResturantDetailedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = "__all__"

    discounts = DiscountSerializer(many = True, read_only = True)
    items = ItemSerializer(many = True, read_only = True)
