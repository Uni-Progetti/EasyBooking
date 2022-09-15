var express = require('express');
var router = express.Router();
var crypto = require('crypto');
// const { render } = require('../app');
const http = require('http');
const https = require('https');
const amqplib = require('amqplib');
const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5673';
var amqp = require('amqplib/callback_api');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');
var utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

/* Reindirizza al login se non autenticati. */
const redirectLogin = function(req, res, next){
    if(!req.session.userId){
        res.redirect('/login');
    } else {
        next();
    }
}

/* Reindirizza alla home se autenticati. */
const redirectHome = function(req, res, next){
    if(req.session.userId){
      res.redirect('/');
    } else {
      next();
    }
}

function check_body(body_template, body_received){
    var template_keys = Object.keys(body_template);
    var date_keys = ["Y","M","D","h"];
    try {
        template_keys.forEach(element => {
            if(element == "start_date" && element in body_received){
                date_keys.forEach(key => {
                    if(!(key in body_received[element])){
                        throw "Data non corretta!"
                    }
                })
            } else {
                if(!(element in body_received)){
                    console.log(element+" mancante\n")
                    throw element+" mancante nel body!"
                }
            };
        });
        return true
    } catch (e) {
        return {error: e};
    }
}

module.exports.redirectLogin = redirectLogin;
module.exports.redirectHome = redirectHome;
module.exports.authenticateJWT = authenticateJWT;
module.exports.check_body = check_body;