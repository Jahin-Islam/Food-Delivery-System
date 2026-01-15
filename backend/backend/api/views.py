from django.shortcuts import render
from rest_framework import mixins, generics
from resturants.models import Discount, Restaurant, Serve
from resturants.serializers import DiscountSerializer, RestaurantSerializer
# Create your views here.


class RestaurantView(mixins.ListModelMixin, generics.GenericAPIView):
    queryset = Restaurant.objects.raw("SELECT * FROM resturants_Restaurant")
    serializer_class = RestaurantSerializer

    def get(self, request):
        return self.list(request)