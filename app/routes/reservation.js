var express = require('express');
var router = express.Router();

  
/* GET reservation page. */
router.get('/', function(req, res) {
    res.render('reservation');
});

module.exports = router;var express = require('express');
var router = express.Router();
var http = require('http');

var departments = ""
var weekdays = ""
var spaces = ""
var seats = ""
var reservations = ""

/* GET reservation page. */
router.get('/', function(req, res) {

    // departments view: http://localhost:5984/db/_design/Department/_view/0_All_Departments/
    var dep_options = {
        host: 'couchdb',
        path: '/db/_design/Department/_view/0_All_Departments/',
        port: '5984',
        method: 'GET',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
    };
    var dep_sock = http.request(dep_options, function(response) {
        var dep_str = ''
        response.on('data', function (dep_chunk) { dep_str += dep_chunk; });
        response.on('end', function () {
            console.log(dep_str)
            departments = JSON.parse(dep_str)
            // weekdays view: http://localhost:5984/db/_design/WeekDay/_view/0_All_WeekDays/
            var wd_options = {
                host: 'couchdb',
                path: '/db/_design/WeekDay/_view/0_All_WeekDays/',
                port: '5984',
                method: 'GET',
                auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
            };
            var wd_sock = http.request(wd_options, function(response) {
                var wd_str = ''
                response.on('data', function (wd_chunk) { wd_str += wd_chunk; });
                response.on('end', function () {
                    console.log(wd_str)
                    weekdays = JSON.parse(wd_str)
                    // spaces view: http://localhost:5984/db/_design/Space/_view/0_All_Spaces/
                    var sp_options = {
                        host: 'couchdb',
                        path: '/db/_design/Space/_view/0_All_Spaces/',
                        port: '5984',
                        method: 'GET',
                        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
                    };
                    var sp_sock = http.request(sp_options, function(response) {
                        var sp_str = ''
                        response.on('data', function (sp_chunk) { sp_str += sp_chunk; });
                        response.on('end', function () {
                            console.log(sp_str)
                            spaces = JSON.parse(sp_str)
                            // seats view: http://localhost:5984/db/_design/Seat/_view/0_All_Seats/
                            var sts_options = {
                                host: 'couchdb',
                                path: '/db/_design/Seat/_view/0_All_Seats/',
                                port: '5984',
                                method: 'GET',
                                auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
                            };
                            var sts_sock = http.request(sts_options, function(response) {
                                var sts_str = ''
                                response.on('data', function (sts_chunk) { sts_str += sts_chunk; });
                                response.on('end', function () {
                                    console.log(sts_str)
                                    seats = JSON.parse(sts_str)
                                    // reservations view: http://localhost:5984/db/_design/Reservation/_view/0_All_Reservations/
                                    var reservs_options = {
                                        host: 'couchdb',
                                        path: '/db/_design/Reservation/_view/0_All_Reservations/',
                                        port: '5984',
                                        method: 'GET',
                                        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
                                    };
                                    var reservs_sock = http.request(reservs_options, function(response) {
                                        var reservs_str = ''
                                        response.on('data', function (reservs_chunk) { reservs_str += reservs_chunk; });
                                        response.on('end', function () {
                                            console.log(reservs_str)
                                            reservations = JSON.parse(reservs_str)
                                            res.render('reservation', { deps: departments, wds: weekdays, sps: spaces, sts: seats, reservs: reservations } )
                                        });
                                        response.on('error', error => { console.error(error); res.redirect('/') });
                                    });
                                    reservs_sock.end();
                                });
                                response.on('error', error => { console.error(error); res.redirect('/') });
                            });
                            sts_sock.end();
                        });
                        response.on('error', error => { console.error(error); res.redirect('/') });
                    });
                    sp_sock.end();
                });
                response.on('error', error => { console.error(error); res.redirect('/') });
            });
            wd_sock.end();
        });
        response.on('error', error => { console.error(error); res.redirect('/') });
    });
    dep_sock.end();
});

module.exports = router;