from django.db import models
from resturants.models import Restaurant

# Create your models here.
class Item(models.Model):
    food_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50)

class MenuItem(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="items")
    item = models.ForeignKey(Item, on_delete = models.CASCADE, related_name = "restaurants")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_ammount = models.FloatField(null=True)
    discount_description = models.CharField(max_length=100, null=True)
    category = models.CharField(max_length=20, null=True)
    description = models.CharField(max_length= 200, null=True)
    image_url = models.CharField(max_length=100, null=True)


