from ..models import Discount, Restaurant
from items.serializers import ItemSerializer
from rest_framework import serializers

class DiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discount
        fields = "__all__"

class RestaurantSerializer(serializers.ModelSerializer):
    min_order_for_dis = serializers.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        allow_null=True, 
        required=False
    )
    
    percentage = serializers.FloatField(allow_null=True, required=False)
    description = serializers.CharField(max_length=200, allow_null=True, required=False)
    street_address = serializers.CharField(max_length = 500, allow_null=True, required = False)
    class Meta:
        model = Restaurant
        fields = "__all__"

class ResturantDetailedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = "__all__"
