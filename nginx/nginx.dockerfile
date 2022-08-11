FROM nginx:latest

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80