var express = require('express');
var router = express.Router();
var crypto = require('crypto');
// const { render } = require('../app');
const http = require('http');
const https = require('https');
const amqplib = require('amqplib');
const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5673';
var amqp = require('amqplib/callback_api');
const dayjs = require('dayjs');

// stampa tutti i dipartimenti
router.get('/getDepartments/all', function(req, res){
    const get_options = {
        hostname: 'couchdb',
        port: 5984,
        path: '/db/_design/Department/_view/0_All_Departments',
        method: 'GET',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
    };

    var data = "";
    const usrs = http.request(get_options, out => {
        console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            console.log(x);
            res.status(200).json(x);
        });
    });

    usrs.on('error', error => {
        console.log(error);
        res.status(503);
    });

    usrs.end();
});


// stampa tutti gli spazi
router.get('/getSpaces/all', function(req, res){
    const get_options = {
        hostname: 'couchdb',
        port: 5984,
        path: '/db/_design/Space/_view/0_All_Spaces',
        method: 'GET',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
    };

    var data = "";
    const usrs = http.request(get_options, out => {
        console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            console.log(x);
            res.status(200).json(x);
        });
    });

    usrs.on('error', error => {
        console.log(error);
        res.status(503);
    });

    usrs.end();
});


// stampa tutti gli spazi per tipologia
router.get('/getSpaces/:typology', function(req, res){
    const get_options = {
        hostname: 'couchdb',
        port: 5984,
        path: '/db/_design/Space/_view/0_All_Spaces',
        method: 'GET',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
    };

    var data = "";
    const usrs = http.request(get_options, out => {
        console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            console.log(x);
            var output = {};
            x.rows.forEach(element => {
                if (element.value.typology == req.params.typology) {
                    output [element.key] = element.value; 
                }
            });
            const isEmpty = Object.keys(output).length === 0;
            if (isEmpty) {
                res.status(404).send({message: "Nessun elemento trovato per la tipologia " + req.params.typology});
            }
            else {
                res.status(200).json(output);
            }
        });
    });

    usrs.on('error', error => {
        console.log(error);
        res.status(503);
    });

    usrs.end();
});


// stampa tutti i posti
router.get('/getSeats/all', function(req, res){
    const get_options = {
        hostname: 'couchdb',
        port: 5984,
        path: '/db/_design/Seat/_view/0_All_Seats',
        method: 'GET',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
    };

    var data = "";
    const usrs = http.request(get_options, out => {
        console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            console.log(x);
            res.status(200).json(x);
        });
    });

    usrs.on('error', error => {
        console.log(error);
        res.status(503);
    });

    usrs.end();
})


// stampa tutti i posti di un dato spazio

// localizza dipartimento
// stampa le mie prenotazioni
// elimina prenotazioni
// stampa utenti (se sei admin)


module.exports = router;