from django.db import models
from django.conf import settings
# Create your models here.
class Address(models.Model):
    address_id = models.AutoField(primary_key=True)
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)