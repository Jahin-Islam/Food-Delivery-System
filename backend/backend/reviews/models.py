from django.db import models
from orders.models import Order

# Create your models here.
class Review(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, null=True, blank=True, related_name="review")
    rating = models.DecimalField(max_digits=3, decimal_places=2)
    comment = models.TextField()
    