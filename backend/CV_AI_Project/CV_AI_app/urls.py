#backend/CV_AI_Project/CV_AI_app/urls.py
from django.urls import path
from .views import RegisterView, LoginView, DialogAPIView, MessageAPIView, UserDetailUpdateView, ResumeAPIView, RestorePasswordView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('restore-password/', RestorePasswordView.as_view(), name='restore-password'),
    path("dialogs/", DialogAPIView.as_view(), name="dialog-create"),
    path("dialogs/<int:dialog_id>/", DialogAPIView.as_view(), name="dialog-detail"),
    path("dialogs/<int:dialog_id>/messages/", MessageAPIView.as_view(), name="message-send"),
    path('user/', UserDetailUpdateView.as_view(), name='user-detail'),
    path("dialogs/<int:dialog_id>/attachments/", ResumeAPIView.as_view(), name="pdf-attachments"),  # Новый маршрут
    
]