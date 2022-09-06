#!/bin/bash
cd app
wait
npm install 
wait
npm run-script build
wait
cd .. && sudo docker-compose build
wait
sudo docker-compose --env-file .env up -d
wait
node app/conf_couchdb.js