from django.db import models

# Create your models here.

class Rider(models.Model):
    VEHICLE_CHOICE = [
        ('BI', 'bike'),
        ('CY', 'by-cycle'),
        ('CA', 'car'),
    ]
    name = models.CharField(max_length=20)
    is_available = models.BooleanField(
        default= False
    )
    address = models.CharField(max_length=200)
    email = models.EmailField()
    password = models.CharField(max_length=20)
    vehicle = models.CharField(max_length= 2, choices=VEHICLE_CHOICE) 

    def __str__(self):
        return self.name
