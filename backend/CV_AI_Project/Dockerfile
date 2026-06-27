#backend/CV_AI_Project/Dockerfile
FROM python:3.13.4-slim as build

WORKDIR /app

COPY requirements.txt ./

RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD [ "uvicorn", "CV_AI_Project.asgi:application", "--host", "0.0.0.0", "--port", "8000" ]
