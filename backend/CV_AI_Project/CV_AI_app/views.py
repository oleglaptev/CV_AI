#backend/CV_AI_Project/CV_AI_app/views.py
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password, make_password
from .serializers import UserSerializer, MessageSerializer, DialogSerializer, ResumeSerializer
from .models import User, Dialog, Message, Resume
from .llm_api import ask_deepseek
import logging
from rest_framework.parsers import MultiPartParser, FormParser
import pdfplumber

from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
logger = logging.getLogger('CV_AI_app')


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()                  # ← пароль уже захеширован
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                'tokens': {
                    'access':  str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'user': UserSerializer(user).data
            },
            status=status.HTTP_201_CREATED
        )

        logger.error(f"Registration errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get('email')
        password = request.data.get('password')

        user = authenticate(request, email=email, password=password)
        if not user:
            return Response({'detail': 'Invalid credentials'},
                            status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'tokens': {
                    'access':  str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'user': UserSerializer(user).data
            }
        )
class RestorePasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        new_password = request.data.get('new_password')

        if not email or not new_password:
            return Response(
                {"error": "Email и новый пароль обязательны"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Пользователь с таким email не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Хеширование нового пароля
        user.password = make_password(new_password)
        user.save()

        return Response(
            {"message": "Пароль успешно изменен"},
            status=status.HTTP_200_OK
        )

from rest_framework.permissions import IsAuthenticated

class UserDetailUpdateView(APIView):
    """GET — отдать текущего пользователя, PUT/PATCH — обновить"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class DialogAPIView(APIView):
    """Создание, получение, обновление и удаление диалогов."""
    #Получение
    def get(self, request):
        dialogs = Dialog.objects.filter(user=request.user)
        serializer = DialogSerializer(dialogs, many=True)
        logger.debug(f"Retrieved {len(dialogs)} dialogs for user: {request.user.email}")
        return Response(serializer.data)
    #Создание
    def post(self, request):
        user = request.user
        title = request.data.get("title", "New Dialog")

        dialog = Dialog.objects.create(user=user, title=title)
        logger.info(f"Dialog created - ID: {dialog.id}, User: {user.email}")
        return Response(
            {"dialog_id": dialog.id, "title": title},
            status=status.HTTP_201_CREATED
        )
    #Обновление
    def patch(self, request, dialog_id=None):
        try:
            dialog = Dialog.objects.get(id=dialog_id, user=request.user)
            serializer = DialogSerializer(dialog, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except Dialog.DoesNotExist:
            return Response(
                {"error": "Dialog not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    #Удаление
    def delete(self, request, dialog_id=None):
        try:
            dialog = Dialog.objects.get(id=dialog_id, user=request.user)
            dialog.delete()
            logger.info(f"Dialog deleted - ID: {dialog_id}, User: {request.user.email}")
            return Response(
                {"message": "Dialog deleted successfully"},
                status=status.HTTP_204_NO_CONTENT
            )
        except Dialog.DoesNotExist:
            return Response(
                {"error": "Dialog not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class MessageAPIView(APIView):
    """Отправка сообщения и получение ответа от DeepSeek."""

    def get(self, request, dialog_id):
        try:
            messages = Message.objects.filter(
                dialog_id=dialog_id,
                dialog__user=request.user
            ).order_by('timestamp')

            serializer = MessageSerializer(messages, many=True)
            logger.debug(f"Retrieved {len(messages)} messages for dialog: {dialog_id}")
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error fetching messages: {str(e)}")
            return Response(
                {"error": "Failed to retrieve messages"},
                status=status.HTTP_400_BAD_REQUEST
            )

    def post(self, request, dialog_id):
        user = request.user
        user_message = request.data.get("message")

        if not user_message:
            logger.warning("Empty message received")
            return Response(
                {"error": "Message cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            dialog = Dialog.objects.get(id=dialog_id, user=user)

            # Save user message
            Message.objects.create(
                dialog=dialog,
                sender="user",
                content=user_message
            )
            logger.debug(f"User message saved - Dialog: {dialog_id}")

            # Get dialog history
            dialog_history = Message.objects.filter(dialog=dialog).order_by("timestamp")

            # Get resume text from the latest resume
            resume_text = ""
            latest_resume = dialog.attachments.order_by('-uploaded_at').first()
            if latest_resume:
                resume_text = latest_resume.extracted_text or ""
            
            # Handle mock interview start
            if user_message == "start_mock_interview":
                if not resume_text:
                    logger.warning(f"No resume found for mock interview in dialog {dialog_id}")
                    return Response(
                        {"error": "Резюме не найдено. Загрузите резюме перед началом мок-интервью."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                try:
                    ai_response = ask_deepseek(user_message, dialog_history, resume_text=resume_text)
                    Message.objects.create(
                        dialog=dialog,
                        sender="bot",
                        content=ai_response
                    )
                    logger.info(f"Mock interview started - Dialog: {dialog_id}")
                    return Response({
                        "bot_response": ai_response
                    })
                except Exception as e:
                    logger.error(f"DeepSeek API error: {str(e)}", exc_info=True)
                    return Response(
                        {"error": "AI service unavailable"},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )

            # Get AI response
            try:
                ai_response = ask_deepseek(user_message, dialog_history, resume_text=resume_text)
                Message.objects.create(
                    dialog=dialog,
                    sender="bot",
                    content=ai_response
                )
                logger.info(f"AI response generated - Dialog: {dialog_id}")

                return Response({
                    "user_message": user_message,
                    "bot_response": ai_response,
                })

            except Exception as e:
                logger.error(f"DeepSeek API error: {str(e)}", exc_info=True)
                return Response(
                    {"error": "AI service unavailable"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        except Dialog.DoesNotExist:
            logger.error(f"Dialog not found - ID: {dialog_id}, User: {user.email}")
            return Response(
                {"error": "Dialog not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class ResumeAPIView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, dialog_id):
        try:
            dialog = Dialog.objects.get(id=dialog_id, user=request.user)
            pdf_file = request.FILES.get('file')

            if not pdf_file:
                return Response(
                    {"error": "No file provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not pdf_file.name.endswith('.pdf'):
                return Response(
                    {"error": "Only PDF files are allowed"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Извлечение текста из PDF
            text = ""
            try:
                with pdfplumber.open(pdf_file) as pdf:
                    for page in pdf.pages:
                        text += page.extract_text() or ""
            except Exception as e:
                logger.error(f"Error extracting text from PDF: {str(e)}")
                text = "Ошибка при извлечении текста из резюме."

            # Сохранение резюме с текстом
            attachment = Resume.objects.create(
                dialog=dialog,
                file=pdf_file,
                original_filename=pdf_file.name,
                extracted_text=text
            )

            # Добавить сообщение в диалог
            Message.objects.create(
                dialog=dialog,
                sender="bot",
                content=f"Резюме '{pdf_file.name}' загружено и добавлено в чат."
            )

            return Response(
                ResumeSerializer(attachment).data,
                status=status.HTTP_201_CREATED
            )

        except Dialog.DoesNotExist:
            return Response(
                {"error": "Dialog not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    def get(self, request, dialog_id):
        try:
            dialog = Dialog.objects.get(id=dialog_id, user=request.user)
            attachments = dialog.attachments.all()
            serializer = ResumeSerializer(attachments, many=True)
            return Response(serializer.data)
        except Dialog.DoesNotExist:
            return Response(
                {"error": "Dialog not found"},
                status=status.HTTP_404_NOT_FOUND
            )