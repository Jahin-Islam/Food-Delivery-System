from django.db import models
from django.conf import settings
# Create your models here.

class Rider(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="rider_profile")
    is_available = models.BooleanField(
        default= False
    )
    vehicle = models.CharField(max_length= 50,
            choices= [('BIKE', 'Motorbike'), ('CYCLE', 'Bicycle'), ('SCOOTER', 'Scooter')]) 
    license_plate = models.CharField(max_length=50)

    current_latitude = models.FloatField(blank=True, null=True)
    current_longitude = models.FloatField(blank=True, null=True)


    def __str__(self):
        return self.user.username
