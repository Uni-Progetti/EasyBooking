FROM nginx:latest

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/certs/nginx.key /etc/nginx/certs/nginx.key
COPY ./nginx/certs/nginx.crt /etc/nginx/certs/nginx.crt
COPY ./nginx/certs/dhparam.pem /etc/nginx/certs/dhparam.pem

EXPOSE 443
EXPOSE 80