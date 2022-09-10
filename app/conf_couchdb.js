const http = require('http');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env') });

function configureCouchDB(){
    array=["_global_changes","_users","_replicator", "refresh_tokens", "seats_updates"];
    array.forEach(element => {
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