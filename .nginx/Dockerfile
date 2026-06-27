FROM python:3.13.4-slim AS build
WORKDIR /app
COPY ./backend/CV_AI_Project/requirements.txt .
RUN pip install -r requirements.txt
COPY ./backend/CV_AI_Project/. .
RUN python manage.py collectstatic --noinput

FROM nginx:stable-alpine
COPY --from=build /app/static /var/www/static/
COPY ./.nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]