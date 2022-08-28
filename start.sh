#!/bin/bash
sudo npm install 
wait
npm run-script build
wait
sudo docker-compose up