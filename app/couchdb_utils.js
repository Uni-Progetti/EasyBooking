const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env') })
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
const jwt = require('jsonwebtoken');
const host = "couchdb";

// 
function get_http(get_options, callback) {
    var data = "";
    const response = http.request(get_options, out => {
        //console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            return callback(null, x);
        });
    });

    response.on('error', error => {
        console.log(error);
        return callback(error, null);
    });

    response.end();   
    
}

function get_from_couchdb(path, callback) {
    const get_options = {
        hostname: host,
        port: 5984,
        path: path,
        method: 'GET',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
    };
    var data = "";
    const response = http.request(get_options, out => {
        //console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            if (x.error){
                console.log(x.error);
                return callback(x.error, null);
            }
            return callback(null, x);
        });
    });
    response.on('error', error => {
        console.log(error);
        return callback(error, null);
    });
    response.end();   
}

function post_to_couchdb(path, post_data ,callback) {
    const post_options = {
        hostname: host,
        port: 5984,
        path: path,
        method: 'PUT',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(post_data)
        },
    };
    const request = http.request(post_options, (out) => {
        //console.log(`STATUS: ${out.statusCode}`);
        //console.log(`HEADERS: ${JSON.stringify(out.headers)}`);
        out.setEncoding('utf8');
        out.on('data', (chunk) => {
          //console.log(`BODY: ${chunk}`);
        });
        out.on('end', () => {
          //console.log('No more data in response.');
          return callback(null, true);
        });
    });
      
    request.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
        return callback(e, false);
    });
      
    // Write data to request body
    request.write(post_data);
    request.end();
}

function update_or_create_to_couchdb(path, update_data ,callback) {
    get_from_couchdb(path, function(err, response){
        if (err){
            post_to_couchdb(path, update_data, function(err, post_response){
                if(err){ callback(err, false); };
                return callback(null, post_response);
            });
        }else{
            const post_data = JSON.parse(update_data);
            post_data ["_rev"] = response._rev;
            post_to_couchdb(path, JSON.stringify(post_data), function(err, rev_post_response){
                if(err){ callback(err, false); };
                return callback(null, rev_post_response);
            });
        }
    });
}

function delete_from_couchdb(path, callback){
    get_from_couchdb(path, function(err, response){
        if(err){return callback(err, null)};
        const delete_options = {
            hostname: host,
            port: 5984,
            path: path,
            method: 'DELETE',
            auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
            headers: {
                'Accept': 'application/json',
                'If-Match': response._rev
            },
        };
        const request = http.request(delete_options, (out) => {
            console.log(`STATUS: ${out.statusCode}`);
            console.log(`HEADERS: ${JSON.stringify(out.headers)}`);
            out.setEncoding('utf8');
            out.on('data', (chunk) => {
              console.log(`BODY: ${chunk}`);
            });
            out.on('end', () => {
              console.log('No more data in response.');
              return callback(null, true);
            });
        });
        request.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            return callback(e, false);
        });
        request.end();
    });
}

// 
function get_from_couchdb_out(path, callback) {
    const get_options = {
        hostname: '127.0.0.1',
        port: 5984,
        path: path,
        method: 'GET',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
    };
    var data = "";
    const response = http.request(get_options, out => {
        console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            if (x.error){
                console.log(x.error);
                return callback(x.error, null);
            }
            return callback(null, x);
        });
    });
    response.on('error', error => {
        console.log(error);
        return callback(error, null);
    });
    response.end();   
}

function post_to_couchdb_out(path, post_data ,callback) {
    const post_options = {
        hostname: '127.0.0.1',
        port: 5984,
        path: path,
        method: 'PUT',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(post_data)
        },
    };
    const request = http.request(post_options, (out) => {
        console.log(`STATUS: ${out.statusCode}`);
        //console.log(`HEADERS: ${JSON.stringify(out.headers)}`);
        out.setEncoding('utf8');
        out.on('data', (chunk) => {
          //console.log(`BODY: ${chunk}`);
        });
        out.on('end', () => {
          //console.log('No more data in response.');
          return callback(null, true);
        });
    });
      
    request.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
        return callback(e, false);
    });
      
    // Write data to request body
    request.write(post_data);
    request.end();
}

function update_or_create_to_couchdb_out(path, update_data ,callback) {
    get_from_couchdb_out(path, function(err, response){
        if (err){
            post_to_couchdb_out(path, update_data, function(err, post_response){
                if(err){ callback(err, false); };
                return callback(null, post_response);
            });
        }else{
            const post_data = JSON.parse(update_data);
            post_data ["_rev"] = response._rev;
            post_to_couchdb_out(path, JSON.stringify(post_data), function(err, rev_post_response){
                if(err){ callback(err, false); };
                return callback(null, rev_post_response);
            });
        }
    });
}

function delete_from_couchdb_out(path, callback){
    get_from_couchdb_out(path, function(err, response){
        if(err){return callback(err, null)};
        const delete_options = {
            hostname: '127.0.0.1',
            port: 5984,
            path: path,
            method: 'DELETE',
            auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
            headers: {
                'Accept': 'application/json',
                'If-Match': response._rev
            },
        };
        const request = http.request(delete_options, (out) => {
            console.log(`STATUS: ${out.statusCode}`);
            //console.log(`HEADERS: ${JSON.stringify(out.headers)}`);
            out.setEncoding('utf8');
            out.on('data', (chunk) => {
              //console.log(`BODY: ${chunk}`);
            });
            out.on('end', () => {
              console.log('No more data in response.');
              return callback(null, true);
            });
        });
        request.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            return callback(e, false);
        });
        request.end();
    });
}

module.exports.post_to_couchdb = post_to_couchdb;
module.exports.get_http = get_http;
module.exports.update_or_create_to_couchdb = update_or_create_to_couchdb;
module.exports.delete_from_couchdb = delete_from_couchdb;
module.exports.get_from_couchdb = get_from_couchdb;
module.exports.post_to_couchdb_out = post_to_couchdb_out;
module.exports.update_or_create_to_couchdb_out = update_or_create_to_couchdb_out;
module.exports.delete_from_couchdb_out = delete_from_couchdb_out;
module.exports.get_from_couchdb_out = get_from_couchdb_out;