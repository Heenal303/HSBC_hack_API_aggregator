from rest_framework import viewsets, status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from django.db.models import Sum, Count
from .models import Transaction
from .serializers import TransactionSerializer
import csv
import io
from datetime import datetime

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer

# CSV Upload Endpoint — still present, but optional now
@api_view(['POST'])
@parser_classes([MultiPartParser])
def upload_csv(request):
    csv_file = request.FILES.get('file')

    if not csv_file or not csv_file.name.endswith('.csv'):
        return Response({'error': 'Please upload a valid CSV file.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        decoded_file = csv_file.read().decode('utf-8')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)

        created = 0
        for row in reader:
            try:
                date = row.get('date')
                if date:
                    try:
                        date = datetime.strptime(date, '%Y-%m-%d').date()
                    except ValueError:
                        continue  # skip invalid date

                Transaction.objects.create(
                    date=date,
                    description=row.get('description', ''),
                    amount=float(row.get('amount', 0)),
                    category=row.get('category', '')
                )
                created += 1
            except Exception:
                continue  # skip invalid rows

        return Response({'message': f'Successfully uploaded {created} transactions.'}, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def transaction_insights(request):
    total_amount = Transaction.objects.aggregate(Sum('amount'))['amount__sum'] or 0
    total_count = Transaction.objects.count()

    category_breakdown = (
        Transaction.objects
        .values('type')
        .annotate(total=Sum('amount'), count=Count('transaction_id'))
        .order_by('-total')
    )

    return Response({
        "total_transactions": total_count,
        "total_amount": total_amount,
       
    })