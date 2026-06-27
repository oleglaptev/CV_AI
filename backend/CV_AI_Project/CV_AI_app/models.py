#backend/CV_AI_Project/CV_AI_app/models.py
from django.db import models
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import BaseUserManager
from django.core.validators import FileExtensionValidator

# Создаем собственный UserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)         # ← Хэшируется один раз!
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra)

class User(AbstractBaseUser, PermissionsMixin):
    email       = models.EmailField(unique=True)
    first_name  = models.CharField(max_length=30, blank=True)
    last_name   = models.CharField(max_length=30, blank=True)
    is_active   = models.BooleanField(default=True)
    is_staff    = models.BooleanField(default=False)

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

# Модель Dialogs
class Dialog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dialogs')  # Один-ко-многим с User
    title = models.CharField(max_length=255, null=False)  # Поле title с ограничением на длину
    created_at = models.DateTimeField(auto_now_add=True)  # Автоматическое добавление текущей даты при создании

    def __str__(self):
        return self.title

# Модель Messages
class Message(models.Model):
    DIALOG_SENDERS = [
        ('user', 'User'),
        ('bot', 'Bot'),
    ]

    dialog = models.ForeignKey(Dialog, on_delete=models.CASCADE, related_name='messages')  # Много-к-одному с Dialog
    sender = models.CharField(max_length=4, choices=DIALOG_SENDERS, null=False)  # Поле sender с ограничением на выбор
    content = models.TextField(null=False)  # Поле content для текста сообщения
    timestamp = models.DateTimeField(auto_now_add=True)  # Автоматическое добавление текущей даты при создании

    def __str__(self):
        return f"{self.sender}: {self.content[:50]}"

# Модель Resume
class Resume(models.Model):
    dialog = models.ForeignKey(Dialog, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(
        upload_to='pdf_attachments/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf'])]
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    original_filename = models.CharField(max_length=255)
    extracted_text = models.TextField(blank=True, null=True)  # Новое поле для текста резюме

    def __str__(self):
        return f"PDF for {self.dialog.title} ({self.original_filename})"