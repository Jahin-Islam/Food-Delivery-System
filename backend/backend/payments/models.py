from django.db import models
from orders.models import Order # Assuming your order model is here

class Payment(models.Model):
    class PaymentMethod(models.TextChoices):
        COD = 'COD', 'Cash on Delivery'
        CREDIT_CARD = 'CARD', 'Credit/Debit Card'
        PAYPAL = 'PAYPAL', 'PayPal'
        SSLCOMMERZ = 'SSLCOMMERZ', 'SSLCommerz'
        BKASH = 'BKASH', 'Bkash'
        WALLET = 'WALLET', 'In-App Wallet'

    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'
        
    order = models.ForeignKey(
        Order, 
        on_delete=models.CASCADE, 
        related_name="payments"
    )
    payment_num = models.IntegerField(null=True)

    transaction_id = models.CharField(max_length=100, null=True, blank=True)
    
    payment_method = models.CharField(
        max_length=20, 
        choices=PaymentMethod.choices, 
        default=PaymentMethod.COD
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20, 
        choices=PaymentStatus.choices, 
        default=PaymentStatus.PENDING
    )
    gateway_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (('order', 'payment_num'),) 

    def __str__(self):
        return f"Payment {self.id} for Order {self.order.order_id} - {self.status}"