from django.db import models

# Create your models here.
class Cuisine(models.Model):
    cuisine_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=20)