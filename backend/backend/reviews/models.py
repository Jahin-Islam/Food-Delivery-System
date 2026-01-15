from django.db import models

# Create your models here.
class Review(models.Model):
    rating = models.DecimalField(max_digits=3, decimal_places=2)
    comment = models.TextField()
    