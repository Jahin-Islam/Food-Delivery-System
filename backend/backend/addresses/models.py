from django.db import models
from django.conf import settings
from customers.models import Customer
# Create your models here.
class Address(models.Model):
    address_id = models.AutoField(primary_key=True)
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)


class DeliveryAddress(models.Model):
    class AddressType(models.TextChoices):
        HOME = "HOME", "Home"
        WORK = "WORK", "Work"
        PARTNER = "PARTNER", "Partner"
        OTHER = "OTHER", "Other"
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="delivery_addresses")
    address_type = models.CharField(max_length=10, choices=AddressType.choices, default=AddressType.HOME)
    street_number = models.CharField(max_length=10, null= True)
    apartment_number = models.CharField(max_length=10, null=True)
    description = models.CharField(max_length=200, null= True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)