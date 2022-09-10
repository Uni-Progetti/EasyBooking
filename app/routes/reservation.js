var express = require('express');
var router = express.Router();
var http = require('http');

/* Reindirizza al login se non autenticati. */
const redirectLogin = function(req, res, next){
    if(!req.session.userId){
        res.redirect('/login');
    } else {
        next();
    }
}

/* GET reservation page. */
router.get('/', redirectLogin, function(req, res) { seats_and_reservations_get(req, res) });

function seats_and_reservations_get(req, res) {
    var seats = ''
    var reservations = ''
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
        response.on('end', function () { console.log(sts_str); seats = JSON.parse(sts_str)
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
                    seats_update(req, res, seats, reservations)
                })
                response.on('error', error => { console.error(error); res.redirect('/') });
            }); reservs_sock.end();
        });
        response.on('error', error => { console.error(error); res.redirect('/') });
    }); sts_sock.end();
}
function seats_update(req, res, seats, reservations) {
    seats.rows.forEach(st => {
        // Inizializzo variabili
        const today               = new Date()
        const today_YMD_str       = String((today.getFullYear()))+((String((today.getMonth()+1)).length == 1)?  "0"+String((today.getMonth()+1)):String((today.getMonth()+1)))+  ((String((today.getDate())).length == 1)?     "0"+String((today.getDate())):String((today.getDate())))
        const today_YMDh_str      = String((today.getFullYear()))+((String((today.getMonth()+1)).length == 1)?  "0"+String((today.getMonth()+1)):String((today.getMonth()+1)))+  ((String((today.getDate())).length == 1)?     "0"+String((today.getDate())):String((today.getDate())))        +((String((today.getHours()+2)).length == 1)?  "0"+String((today.getHours()+2)):String((today.getHours()+2)))
        var   start_date_YMD_str  = String(st.value.start_date.Y)+((String(st.value.start_date.M).length == 1)? "0"+String(st.value.start_date.M):String(st.value.start_date.M))+((String(st.value.start_date.D).length == 1)? "0"+String(st.value.start_date.D):String(st.value.start_date.D))
        var   start_date_YMDh_str = String(st.value.start_date.Y)+((String(st.value.start_date.M).length == 1)? "0"+String(st.value.start_date.M):String(st.value.start_date.M))+((String(st.value.start_date.D).length == 1)? "0"+String(st.value.start_date.D):String(st.value.start_date.D))+((String(st.value.start_date.h).length == 1)? "0"+String(st.value.start_date.h):String(st.value.start_date.h))

        // Controlla se il posto ha un data e un tempo precedenti a quelli odierni e quindi è da aggiornare
        if (start_date_YMDh_str <= today_YMDh_str) {
            // Se la data del posto corrente è di oggi ma l'orario è passato basta mettere expired nello stato del posto
            if (start_date_YMD_str == today_YMD_str) {
                // expired seat state: http://localhost:5984/db
                const expired_seat_postData = JSON.stringify({
                    "_id": st.id,
                    "type": "Seat",
                    "fields": {
                        "dep_name": st.key,
                        "typology": st.value.typology,
                        "space_name": st.value.space_name,
                        "position": st.value.position,
                        "start_date": {
                            "Y": st.value.start_date.Y,
                            "M": st.value.start_date.M,
                            "D": st.value.start_date.D,
                            "h": st.value.start_date.h,
                            "m": st.value.start_date.m,
                            "s": st.value.start_date.s
                        },
                        "end_date": {
                            "Y": st.value.end_date.Y,
                            "M": st.value.end_date.M,
                            "D": st.value.end_date.D,
                            "h": st.value.end_date.h,
                            "m": st.value.end_date.m,
                            "s": st.value.end_date.s
                        },
                        "state": "Expired"
                    },
                    "_rev": st.value.rev
                });
                const expired_seat_options = {
                    method: 'PUT',
                    path: '/db/'+st.id,
                    host: 'couchdb', port: 5984,
                    auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(expired_seat_postData)
                    }
                };
                var expired_seat_sock = http.request(expired_seat_options, function(response) {
                    response.setEncoding('utf8');
                    response.on('data', function (expired_seat_chunk) { console.log(expired_seat_chunk) });
                    response.on('error', error => { console.error(error); res.redirect('/home') });
                }); expired_seat_sock.write(expired_seat_postData); expired_seat_sock.end()
            }
            // Se invece non è di oggi ma di un giorno precedente
            else {
                // Inizializza i dati del nuovo giorno
                const st_date_plus_7 = new Date(st.value.start_date.Y, st.value.start_date.M, (st.value.start_date.D)+7)
                // Aggiorna il posto con il nuovo giorno corretto della settimana http://localhost:5984/db
                const update_seat_postData = JSON.stringify({
                    "_id": st.id,
                    "type": "Seat",
                    "fields": {
                        "dep_name": st.key,
                        "typology": st.value.typology,
                        "space_name": st.value.space_name,
                        "position": 1,
                        "start_date": {
                            "Y": st_date_plus_7.getFullYear(),
                            "M": st_date_plus_7.getMonth()+1,
                            "D": st_date_plus_7.getDay(),
                            "h": st.value.start_date.h,
                            "m": 0,
                            "s": 0
                        },
                        "end_date": {
                            "Y": st_date_plus_7.getFullYear(),
                            "M": st_date_plus_7.getMonth()+1,
                            "D": st_date_plus_7.getDay(),
                            "h": st.value.end_date.h,
                            "m": 0,
                            "s": 0
                        },
                        "state": "Active"
                    },
                    "_rev": st.value.rev
                });
                const update_seat_options = {
                    host: 'couchdb',
                    port: 5984,
                    path: '/db/'+st.id,
                    method: 'PUT',
                    auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(update_seat_postData)
                    }
                };
                var update_seat_sock = http.request(update_seat_options, function(response) {
                    response.setEncoding('utf8');
                    response.on('data', function (update_seat_chunk) { console.log(update_seat_chunk) });
                    response.on('error', error => { console.error(error); res.redirect('/') });
                }); update_seat_sock.write(update_seat_postData); update_seat_sock.end()
            }

            // Controlla tutte le prenotazioni e in caso le elimina
            reservations.rows.forEach(reserv => {
                // Se la prenotazione è del posto corrnte allora è scaduta e la elimina
                if (reserv.value.seat_id == st.id) {
                    var rm_res_options = {
                        method: 'DELETE',
                        path: '/db/'+reserv.id,
                        host: 'couchdb', port: '5984',
                        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
                        headers: {
                            'Accept': 'application/json',
                            'If-Match': reserv.value.rev
                        }
                    };
                    var rm_res_sock = http.request(rm_res_options, function(response) {
                        response.on('data',  function (rm_res_chunk) { console.log(rm_res_chunk) });
                        response.on('error', error => { console.error(error); res.redirect('/') });
                    }); rm_res_sock.end();
                }
            })
        }
    })
    variales_get_and_render(req, res, seats, reservations);
}

function variales_get_and_render(req, res, seats, reservations) {

    var departments = ""
    var weekdays = ""
    var spaces = ""

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
        response.on('end', function () { console.log(dep_str); departments = JSON.parse(dep_str)
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
                response.on('end', function () { console.log(wd_str); weekdays = JSON.parse(wd_str)
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
                        response.on('end', function () { console.log(sp_str); spaces = JSON.parse(sp_str)
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
                                response.on('end', function () { console.log(sts_str); seats = JSON.parse(sts_str)
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
                                        response.on('end', function () { console.log(reservs_str); reservations = JSON.parse(reservs_str)
                                            res.render('reservation', {
                                                userId: req.session.username,
                                                deps: departments,
                                                wds: weekdays,
                                                sps: spaces,
                                                sts: seats,
                                                reservs: reservations,
                                                csrfToken: req.csrfToken(),
                                                location: req.location
                                            })
                                        });
                                        response.on('error', error => { console.error(error); res.redirect('/') });
                                    }); reservs_sock.end();
                                });
                                response.on('error', error => { console.error(error); res.redirect('/') });
                            }); sts_sock.end();
                        });
                        response.on('error', error => { console.error(error); res.redirect('/') });
                    }); sp_sock.end();
                });
                response.on('error', error => { console.error(error); res.redirect('/') });
            }); wd_sock.end();
        });
        response.on('error', error => { console.error(error); res.redirect('/') });
    }); dep_sock.end();
}

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
        path: '/db/'+req.body.id+"Reservation"+req.body.position,
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