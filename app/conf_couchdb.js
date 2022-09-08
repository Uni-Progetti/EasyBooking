const dotenv = require('dotenv').config()
const http = require('http');
const https = require('https');

function configureCouchDB(){
    array=["_global_changes","_users","_replicator"];
    array.forEach(element => {
        console.log(process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD);
        const post_options = {
            hostname: '127.0.0.1',
            port: 5984,
            path: '/'+element,
            method: 'PUT',
            auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
            headers: {
                'Content-Type': 'application/json',
            },
            };
        
            const request = http.request(post_options, (out) => {
            console.log(`STATUS: ${out.statusCode}`);
            console.log(`HEADERS: ${JSON.stringify(out.headers)}`);
            out.setEncoding('utf8');
            out.on('data', (chunk) => {
                console.log(`BODY: ${chunk}`);
            });
            out.on('end', () => {
                console.log('No more data in response.');
            });
            });
        
            request.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            });
        
            // Write data to request body
            request.end();
    });

};

configureCouchDB();