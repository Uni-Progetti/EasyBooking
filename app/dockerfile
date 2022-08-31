# Immagine sorgente
FROM node:16

# Directory dell'app
WORKDIR /usr/src/app

COPY package*.json ./

# Installa dipendenze app
RUN npm install

# Bundle sorgente app
COPY . .

EXPOSE 3000

# Comando all'avvio
CMD ["node", "./bin/www"]
