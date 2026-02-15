from django.db import models
from django.conf import settings

# Create your models here.

class Customer(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer_profile")
    wallet_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    