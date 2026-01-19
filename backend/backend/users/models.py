from django.db import models
from django.contrib.auth.models import AbstractUser
from addresses.models import Address
# Create your models here.
class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        CUSTOMER = "CUSTOMER", "Customer"
        RIDER = "RIDER", "Rider"
        RESTAURANT = "RESTAURANT", "Restaurant"
    
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.CUSTOMER)
    username = None
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True, unique=True)
    image_url = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    address = models.OneToOneField(Address, on_delete=models.CASCADE,  null= True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

