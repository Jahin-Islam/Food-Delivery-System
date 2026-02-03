from django.db import models
from resturants.models import Restaurant
from customers.models import Customer
from items.models import MenuItem
from riders.models import Rider
from addresses.models import Address

# Create your models here.

class Order(models.Model):

    class OrderStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PREPARING = 'PREPARING', 'Preparing'
        PICKED_UP = 'PICKED_UP', 'Picked Up'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'

    restaurant = models.ForeignKey(Restaurant, on_delete=models.SET_NULL, related_name="orders", null=True)
    rider = models.ForeignKey(Rider, on_delete=models.SET_NULL, related_name="orders", null=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, related_name="orders", null= True)
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null= True, blank=True)

    order_id = models.AutoField(primary_key=True)
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    est_pickup = models.DateTimeField(null=True)
    est_delivery = models.DateTimeField(null=True)
    delivered_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(null=True)


class OrderItem(models.Model):
    item = models.ForeignKey(MenuItem, on_delete=models.SET_NULL, related_name="orders", null=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items", null=True)
    quantity = models.IntegerField()
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2, blank=True)

    def save(self, *args, **kwargs):
        if not self.price_at_purchase and self.item:
            self.price_at_purchase = self.item.price
        super().save(*args, **kwargs)