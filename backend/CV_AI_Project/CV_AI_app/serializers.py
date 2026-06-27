#backend/CV_AI_Project/CV_AI_app/serializers.py
from django.contrib.auth.hashers import make_password
from rest_framework import serializers
from .models import User, Dialog, Message, Resume


class UserSerializer(serializers.ModelSerializer):
    # Клиент присылает raw-пароль, мы не отдаём его обратно
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,                # по желанию
        style={'input_type': 'password'}
    )

    class Meta:
        model  = User
        fields = (
            'id', 'email',
            'first_name', 'last_name',
            'password',               # ← вместо password_hash
        )
        extra_kwargs = {
            'password': {'write_only': True},
        }

    # ---------- создание ----------
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)   # ← один единственный хеш!
        user.save()
        return user

    # ---------- обновление профиля / смена пароля ----------
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ['id', 'file', 'uploaded_at', 'original_filename']
        read_only_fields = ['id', 'uploaded_at', 'original_filename']

class DialogSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    attachments = ResumeSerializer(many=True, read_only=True)  # Добавлено новое поле

    class Meta:
        model = Dialog
        fields = ['id', 'title', 'user', 'created_at', 'attachments']
        read_only_fields = ['id', 'user', 'created_at', 'attachments']

    def validate_title(self, value):
        if len(value.strip()) < 1:
            raise serializers.ValidationError("Title cannot be empty")
        return value

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'dialog', 'sender', 'content', 'timestamp']
        read_only_fields = ['id', 'timestamp']

