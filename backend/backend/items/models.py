from django.db import models
from resturants.models import Restaurant
from cuisines.models import Cuisine

# Create your models here.
class Category(models.Model):
    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=100)

    def __str__(self):
        return self.category_name

class MenuItem(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="items")
    cuisine = models.ForeignKey(Cuisine, on_delete=models.SET_NULL, related_name="items", null=True, blank=True)
    food_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_ammount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount_description = models.CharField(max_length=100, null=True)
    description = models.TextField(null=True, blank=True)
    is_available = models.BooleanField(default=True)
    image_url = models.CharField(max_length=500, null=True, blank=True)
    image_path = models.ImageField(upload_to=f"{restaurant.name}/", blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, related_name="items", null=True, blank=True)    



