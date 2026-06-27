#backend/CV_AI_Project/CV_AI_app/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import User
class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        email = validated_token.get('user_id') # → ваш e-mail
        try:
            return User.objects.get(email=email)
        except User.DoesNotExist:
            return None