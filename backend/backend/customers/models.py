from django.db import models

# Create your models here.

class Customer(models.Model):
    customer_id = models.AutoField(
        primary_key=True
    )
    name = models.CharField(max_length=20)
    address = models.CharField(max_length=200)
    phone = models.CharField(max_length=15)
    email = models.EmailField()
    password = models.CharField(max_length=20)
    