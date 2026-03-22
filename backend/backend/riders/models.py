from django.db import models
from django.conf import settings
from addresses.models import Address
# Create your models here.

class Rider(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="rider_profile")
    is_available = models.BooleanField(
        default= False
    )
    vehicle = models.CharField(max_length= 50,
            choices= [('BIKE', 'Motorbike'), ('CYCLE', 'Bicycle'), ('SCOOTER', 'Scooter')]) 
    license_plate = models.CharField(max_length=50)
    verfied = models.IntegerField(default=0)
    current_latitude = models.FloatField(blank=True, null=True)
    current_longitude = models.FloatField(blank=True, null=True)


class Rider_Additional_Information(models.Model):
    rider = models.OneToOneField(Rider, on_delete=models.CASCADE)
    address = models.OneToOneField(Address, on_delete=models.SET_NULL, null=True)
    nid_front = models.ImageField()
    nid_back = models.ImageField()
    nid_number = models.CharField(max_length=50)
    wallet_balace = models.DecimalField(max_digits=8, decimal_places=2)
    gender = models.CharField(max_length=10)
    emergency_contact_name = models.CharField(max_length=20)
    emergency_contact_number = models.CharField(max_length=20)


