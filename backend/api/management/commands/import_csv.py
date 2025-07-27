import csv
import re
from django.core.management.base import BaseCommand
from api.models import Transaction
from datetime import datetime

class Command(BaseCommand):
    help = "Import transactions from a CSV file"

    def handle(self, *args, **kwargs):
        successful_imports = 0

        with open('financial_transactions.csv', 'r') as file:
            reader = csv.DictReader(file)

            for idx, row in enumerate(reader, start=1):
                try:
                    # Strip all values
                    row = {k: v.strip() for k, v in row.items()}

                    # Sanitize & validate fields
                    if not all([row.get('transaction_id'), row.get('date'), row.get('customer_id'), row.get('amount'), row.get('type')]):
                        continue

                    # Clean and normalize transaction type
                    transaction_type = re.sub(r'[^a-zA-Z]', '', row['type'].lower())
                    if transaction_type not in ['credit', 'debit']:
                        transaction_type = 'credit'  # default fallback

                    # Clean and convert amount
                    amount_str = re.sub(r'[^\d\.\-]', '', row['amount'])
                    amount = float(amount_str) if amount_str else 0.0

                    # Normalize date with fallback formats
                    date_formats = ['%d-%m-%Y', '%Y/%m/%d', '%m/%d/%Y', '%Y-%m-%d', '%d/%m/%Y']
                    date = None
                    for fmt in date_formats:
                        try:
                            date = datetime.strptime(row['date'], fmt).date()
                            break
                        except ValueError:
                            continue
                    if not date:
                        date = datetime.today().date()  # fallback to today's date

                    # Insert or update
                    Transaction.objects.update_or_create(
                        transaction_id=int(re.sub(r'\D', '', row['transaction_id'])),
                        defaults={
                            'date': date,
                            'customer_id': int(re.sub(r'\D', '', row['customer_id'])),
                            'amount': amount,
                            'type': transaction_type
                        }
                    )

                    successful_imports += 1

                except Exception as e:
                    print(f"Skipping row {idx} due to error: {e}")

        self.stdout.write(f"Successfully imported {successful_imports} transactions")