from django.shortcuts import render
from rest_framework import mixins, generics
from resturants.models import Discount, Restaurant, Serve
from resturants.serializers import DiscountSerializer, RestaurantSerializer, ResturantDetailedSerializer
from items.serializers import ItemSerializer
from items.models import MenuItem, Category
# Create your views here.


class RestaurantView(mixins.ListModelMixin, generics.GenericAPIView):
    query = """
            SELECT *
            FROM (
                SELECT 
                res.*, 
                disc.percentage, 
                disc.min_order as min_order_for_dis, 
                disc.description,
                ROW_NUMBER() OVER (PARTITION BY res.id ORDER BY disc.percentage DESC) as rank_id
                FROM resturants_Restaurant res
                LEFT JOIN resturants_Discount disc ON res.id = disc.resturant_id
            ) AS ranked_results
            WHERE rank_id = 1;
        """
    queryset = Restaurant.objects.raw(query)
    serializer_class = RestaurantSerializer

    def get(self, request):
        return self.list(request)


class RestaurantDetailedView(mixins.RetrieveModelMixin, generics.GenericAPIView):
    queryset = Restaurant.objects.all()
    serializer_class = ResturantDetailedSerializer

    def get(self, request, pk):
        return self.retrieve(request, pk)