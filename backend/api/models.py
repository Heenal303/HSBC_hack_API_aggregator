from django.db import models

class Transaction(models.Model):
    transaction_id = models.IntegerField(primary_key=True, unique=True)
    date = models.DateField()
    customer_id = models.IntegerField()
    amount = models.FloatField()
    type = models.CharField(max_length=10)  # 'credit' or 'debit'

    def __str__(self):
        return f"{self.transaction_id} - {self.type} - {self.amount}"