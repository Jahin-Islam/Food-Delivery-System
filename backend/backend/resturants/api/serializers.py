from ..models import Discount, Restaurant
from items.serializers import ItemSerializer
from rest_framework import serializers
# Import Address from wherever it lives in your project
# Adjust this import path if needed — common locations below:
try:
    from addresses.models import Address       # if you have an 'addresses' app
except ImportError:
    try:
        from customers.models import Address   # if Address lives in customers app
    except ImportError:
        from ..models import Address           # if Address is in the same app


# ── Nested address serializer ─────────────────────────────────────────────
class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Address
        fields = ['address_id', 'street_address', 'city', 'latitude', 'longitude']


# ── Discount serializer (unchanged) ──────────────────────────────────────
class DiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Discount
        fields = "__all__"


# ── Restaurant list serializer ────────────────────────────────────────────
class RestaurantSerializer(serializers.ModelSerializer):
    min_order_for_dis = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        allow_null=True,
        required=False
    )
    percentage  = serializers.FloatField(allow_null=True, required=False)
    description = serializers.CharField(max_length=200, allow_null=True, required=False)
    street_address = serializers.CharField(max_length=500, allow_null=True, required=False)

    # Nested address object — returns { address_id, street_address, city, latitude, longitude }
    # read_only=True so it doesn't break POST/PATCH (those still use address_id FK)
    address = AddressSerializer(read_only=True)

    class Meta:
        model  = Restaurant
        fields = "__all__"


# ── Restaurant detail serializer ──────────────────────────────────────────
class ResturantDetailedSerializer(serializers.ModelSerializer):
    address    = AddressSerializer(read_only=True)
    discounts  = DiscountSerializer(many=True, read_only=True)

    class Meta:
        model  = Restaurant
        fields = "__all__"