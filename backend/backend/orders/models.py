from django.db import models
from resturants.models import Restaurant
from customers.models import Customer
from items.models import Item
from riders.models import Rider

# Create your models here.

class Order(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.SET_NULL, related_name="orders", null=True)
    rider = models.ForeignKey(Rider, on_delete=models.SET_NULL, related_name="orders", null=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, related_name="orders", null= True)


    order_id = models.AutoField(primary_key=True)
    status = models.CharField(max_length=10)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    est_pickup = models.DateTimeField(null=True)
    est_delivery = models.DateTimeField(null=True)
    delivered_at = models.DateTimeField(null=True)

class OrderItemList(models.Model):
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, related_name="orders", null=True)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, related_name="items", null=True)
    quantity = models.IntegerField()
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2, blank=True)