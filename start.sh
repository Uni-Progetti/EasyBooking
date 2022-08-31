#!/bin/bash
cd app
wait
sudo npm install 
wait
npm run-script build
wait
cd ..
wait
sudo docker-compose up