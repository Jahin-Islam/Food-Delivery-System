from django.db import models
from cuisines.models import Cuisine
from django.conf import settings
# Create your models here.


class Restaurant(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="restaurant_profiles")
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
    opening_time = models.TimeField()
    closing_time = models.TimeField()
    phone = models.CharField(max_length=15, null=True)
    ######### Address Need some Fixing ###########
    address = models.CharField(max_length=200)
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

    class Meta:
        unique_together = (('resturant', 'discount_num'),)


class Serve(models.Model):
    cuisine = models.ForeignKey(Cuisine, on_delete=models.CASCADE, null=True)
    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.CASCADE, null=True)
