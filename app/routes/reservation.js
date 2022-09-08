var express = require('express');
var router = express.Router();
var http = require('http');

var departments = ""
var weekdays = ""
var spaces = ""
var seats = ""
var reservations = ""

/* Reindirizza al login se non autenticati. */
const redirectLogin = function(req, res, next){
    if(!req.session.userId){
        res.redirect('/login');
    } else {
        next();
    }
}

/* GET reservation page. */
router.get('/', redirectLogin, function(req, res) {

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
                                            res.render('reservation', { userId: req.session.username, deps: departments, wds: weekdays, sps: spaces, sts: seats, reservs: reservations, csrfToken: req.csrfToken(), location: req.location } )
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

router.post('/make_res', function(req, res){
    // increase seat position: http://localhost:5984/db
    const increase_st_position_postData = JSON.stringify({
            "_id": req.body.id,
            "type": "Seat",
            "fields": {
                "dep_name": req.body.key,
                "typology": req.body.typology,
                "space_name": req.body.space_name,
                "position": (parseInt(req.body.position)+1),
                "start_date": {
                    "Y": req.body.start_Y,
                    "M": req.body.start_M,
                    "D": req.body.start_D,
                    "h": req.body.start_h,
                    "m": req.body.start_m,
                    "s": req.body.start_s
                },
                "end_date": {
                    "Y": req.body.end_Y,
                    "M": req.body.end_M,
                    "D": req.body.end_D,
                    "h": req.body.end_h,
                    "m": req.body.end_m,
                    "s": req.body.end_s
                },
                "state": "Active"
            },
            "_rev": req.body.rev
        });
    const increase_st_position_options = {
        host: 'couchdb',
        port: 5984,
        path: '/db/'+req.body.id,
        method: 'PUT',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(increase_st_position_postData)
        }
    };
    var increase_st_position_sock = http.request(increase_st_position_options, function(response) {
        response.setEncoding('utf8');
        response.on('data', function (increase_st_position_chunk) { console.log(increase_st_position_chunk) });
        response.on('end', function () { make_res(req, res) });
        response.on('error', error => { console.error(error); res.redirect('/reservation') });
    });

    increase_st_position_sock.write(increase_st_position_postData)
    increase_st_position_sock.end()

})
function make_res(req, res) {

    // make reservation: http://localhost:5984/db
    const make_res_postData = JSON.stringify({
        "id": req.body.id+"Reservation"+req.body.position,
        "type": "Reservation",
        "fields": {
            "email": req.body.email,
            "dep_name": req.body.key,
            "typology": req.body.typology,
            "space_name": req.body.space_name,
            "seat_id": req.body.id,
            "seat_number": req.body.position,
            "start_date": {
                "Y": req.body.start_Y,
                "M": req.body.start_M,
                "D": req.body.start_D,
                "h": req.body.start_h,
                "m": req.body.start_m,
                "s": req.body.start_s
            },
            "end_date": {
                "Y": req.body.end_Y,
                "M": req.body.end_M,
                "D": req.body.end_D,
                "h": req.body.end_h,
                "m": req.body.end_m,
                "s": req.body.end_s
            },
            "state": "Active"
        }
    });
    const make_res_options = {
        host: 'couchdb',
        port: 5984,
        path: '/db/'+req.body.id+"Reservation",
        method: 'PUT',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(make_res_postData)
        }
    };
    var make_res_sock = http.request(make_res_options, function(response) {
        response.setEncoding('utf8');
        response.on('data', function (make_res_chunk) { console.log(make_res_chunk) });
        response.on('end', function () { res.redirect('/reservation')});
        response.on('error', error => { console.error(error); res.redirect('/reservation') });
    });

    make_res_sock.write(make_res_postData)
    make_res_sock.end()

}

module.exports = router;