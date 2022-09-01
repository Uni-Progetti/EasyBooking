#!/bin/bash
cd app
wait
npm install 
wait
npm run-script build
wait
cd ..
wait
sudo docker-compose up