from django.db import models
from cuisines.models import Cuisine
from addresses.models import Address
from django.conf import settings
# Create your models here.


class Restaurant(models.Model):
    class RestaurantCategoryType(models.TextChoices):
        RESTAURANT = "RESTAURANT", "Restaurant"
        CAFE = "CAFE", "Cafe"
        FAST = "FAST FOOD", "Fast Food"
        BAKERY = "BAKERY", "Bakery"
        DESERT = "DESERT", "Desert"
        CLOUD = "CLOUD", "Cloud"
        TRUCK = "FOOD TRUCK", "Food Truck",
        CATERING = "CATERING", "Catering"
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="restaurant_profiles")
    address = models.OneToOneField(Address, on_delete=models.SET_NULL, null=True)
    name = models.CharField(
        max_length=50,
    )
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.00,
    )
    total_rated = models.IntegerField(
        default=0,
    )
    restaurant_category = models.CharField(max_length=50, choices=RestaurantCategoryType.choices, default=RestaurantCategoryType.RESTAURANT, null=True, blank=True)
    opening_time = models.TimeField(null=True)
    closing_time = models.TimeField(null=True)
    phone = models.CharField(max_length=15, null=True)
    ##We will image_url later##
    image_url = models.CharField(max_length=500, null=True)
    image = models.ImageField(upload_to="restaurants/", blank=True, null=True)
    min_order = models.DecimalField(
        max_digits=5,
        decimal_places=2
    )

    def __str__(self):
        return self.name


class Discount(models.Model):
    resturant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="discounts"
    )
    discount_num = models.IntegerField(null=True)
    min_order = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True)
    percentage = models.FloatField()
    description = models.CharField(
        max_length=200
    )
    is_active = models.BooleanField(null=True)

    class Meta:
        unique_together = (('resturant', 'discount_num'),)


class Serve(models.Model):
    cuisine = models.ForeignKey(Cuisine, on_delete=models.CASCADE, null=True)
    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.CASCADE, null=True)
