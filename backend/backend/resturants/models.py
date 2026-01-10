from django.db import models

# Create your models here.

class Resturant(models.Model):
    res_id = models.AutoField(
        primary_key= True
    )

    name = models.CharField(
        max_length = 50,
        null = False,
    )
    rating = models.DecimalField(
        max_digits = 3,
        decimal_places = 2,
    )
    total_rated = models.IntegerField()
    opening_time = models.TimeField()
    closing_time = models.TimeField()
    min_order = models.DecimalField(
        max_digits = 5,
        decimal_places= 2
    )

    def __str__(self):
        return self.name

class Discount(models.Model):
    resturant = models.ForeignKey(
        Resturant,
        on_delete = models.CASCADE,
        related_name = "discounts"
    )
    percentage = models.FloatField()
    description = models.CharField(
        max_length = 200
    )
