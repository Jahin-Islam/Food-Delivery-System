from django.shortcuts import render
from rest_framework import mixins, generics
from resturants.models import Discount, Restaurant, Serve
from resturants.serializers import DiscountSerializer, RestaurantSerializer, ResturantDetailedSerializer
from items.serializers import ItemSerializer
from items.models import MenuItem, Category
# Create your views here.


class RestaurantView(mixins.ListModelMixin, generics.GenericAPIView):
    queryset = Restaurant.objects.raw("SELECT * FROM resturants_Restaurant")
    serializer_class = RestaurantSerializer

    def get(self, request):
        return self.list(request)


class RestaurantDetailedView(mixins.RetrieveModelMixin, generics.GenericAPIView):
    queryset = Restaurant.objects.all()
    serializer_class = ResturantDetailedSerializer

    def get(self, request, pk):
        return self.retrieve(request, pk)