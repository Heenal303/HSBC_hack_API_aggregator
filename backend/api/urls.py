from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransactionViewSet, upload_csv, transaction_insights

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet)

urlpatterns = [
    path('upload/', upload_csv),
     path('transactions/insights/', transaction_insights),
    path('', include(router.urls)),
]