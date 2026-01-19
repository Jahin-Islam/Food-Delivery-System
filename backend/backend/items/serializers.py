from rest_framework import serializers
from .models import MenuItem, Category

class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = "__all__"
