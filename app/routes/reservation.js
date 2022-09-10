var express = require('express');
var router = express.Router();
var http = require('http');
const couchdb_utils = require("../couchdb_utils.js")

/* Reindirizza al login se non autenticati. */
const redirectLogin = function(req, res, next){
    if(!req.session.userId){
        res.redirect('/login');
    } else {
        next();
    }
}

// /* GET reservation page. */
// router.get('/', redirectLogin, function(req, res) { seats_and_reservations_get(req, res) });

// function seats_and_reservations_get(req, res) {
//     // GET 0_all_seats view: http://localhost:5984/db/_design/Seat/_view/0_All_Seats/
//     couchdb_utils.get_from_couchdb('/db/_design/Seat/_view/0_All_Seats/', function(err, seats_response) {
//         if (err) { console.log(err) }
//         else { var seats = seats_response
//             // GET 0_all_reservations view: http://localhost:5984/db/_design/Reservation/_view/0_All_Reservations/
//             couchdb_utils.get_from_couchdb('/db/_design/Reservation/_view/0_All_Reservations/', function(err, reservations_response) {
//                 if (err) { console.log(err) }
//                 else { var reservations = reservations_response
//                     // Controlla se si deve effettuare l'aggiornamento dei posti
//                     seats_update(req, res, seats, reservations)
//                 }
//             })
//         }
//     })
// }
// function seats_update(req, res, seats, reservations) {
//     seats.rows.forEach(st => {
//         // Inizializzo variabili
//         const today               = new Date()
//         const today_YMD_str       = String((today.getFullYear()))+((String((today.getMonth()+1)).length == 1)?  "0"+String((today.getMonth()+1)):String((today.getMonth()+1)))+  ((String((today.getDate())).length == 1)?     "0"+String((today.getDate())):String((today.getDate())))
//         const today_YMDh_str      = String((today.getFullYear()))+((String((today.getMonth()+1)).length == 1)?  "0"+String((today.getMonth()+1)):String((today.getMonth()+1)))+  ((String((today.getDate())).length == 1)?     "0"+String((today.getDate())):String((today.getDate())))        +((String((today.getHours()+2)).length == 1)?  "0"+String((today.getHours()+2)):String((today.getHours()+2)))
//         var   start_date_YMD_str  = String(st.value.start_date.Y)+((String(st.value.start_date.M).length == 1)? "0"+String(st.value.start_date.M):String(st.value.start_date.M))+((String(st.value.start_date.D).length == 1)? "0"+String(st.value.start_date.D):String(st.value.start_date.D))
//         var   start_date_YMDh_str = String(st.value.start_date.Y)+((String(st.value.start_date.M).length == 1)? "0"+String(st.value.start_date.M):String(st.value.start_date.M))+((String(st.value.start_date.D).length == 1)? "0"+String(st.value.start_date.D):String(st.value.start_date.D))+((String(st.value.start_date.h).length == 1)? "0"+String(st.value.start_date.h):String(st.value.start_date.h))

//         // Controlla se il posto ha un data e un tempo precedenti a quelli odierni e quindi è da aggiornare
//         if (start_date_YMDh_str <= today_YMDh_str) {
//             // Se la data del posto corrente è di oggi ma l'orario è passato basta mettere expired nello stato del posto
//             if (start_date_YMD_str == today_YMD_str) {
//                 // Aggiorna lo stato del posto: http://localhost:5984/db
//                 const expired_seat_postData = JSON.stringify({
//                     "_id": st.id,
//                     "type": "Seat",
//                     "fields": {
//                         "dep_name": st.key,
//                         "typology": st.value.typology,
//                         "space_name": st.value.space_name,
//                         "position": st.value.position,
//                         "start_date": {
//                             "Y": st.value.start_date.Y,
//                             "M": st.value.start_date.M,
//                             "D": st.value.start_date.D,
//                             "h": st.value.start_date.h,
//                             "m": st.value.start_date.m,
//                             "s": st.value.start_date.s
//                         },
//                         "end_date": {
//                             "Y": st.value.end_date.Y,
//                             "M": st.value.end_date.M,
//                             "D": st.value.end_date.D,
//                             "h": st.value.end_date.h,
//                             "m": st.value.end_date.m,
//                             "s": st.value.end_date.s
//                         },
//                         "state": "Expired"
//                     },
//                     "_rev": st.value.rev
//                 });
//                 couchdb_utils.post_to_couchdb('/db/'+st.id, expired_seat_postData, function(err, response) {
//                     if (err) {console.log(err)}
//                     else {console.log("SEAT UPDATED EXPIRED: "+st.id)}
//                 })
//             }
//             // Se invece non è di oggi ma di un giorno precedente
//             else {
//                 // Inizializza i dati del nuovo giorno
//                 const st_date_plus_7 = new Date(st.value.start_date.Y, st.value.start_date.M, (st.value.start_date.D)+7)
//                 // Aggiorna il posto con il nuovo giorno corretto della settimana http://localhost:5984/db
//                 const update_seat_postData = JSON.stringify({
//                     "_id": st.id,
//                     "type": "Seat",
//                     "fields": {
//                         "dep_name": st.key,
//                         "typology": st.value.typology,
//                         "space_name": st.value.space_name,
//                         "position": 1,
//                         "start_date": {
//                             "Y": st_date_plus_7.getFullYear(),
//                             "M": st_date_plus_7.getMonth()+1,
//                             "D": st_date_plus_7.getDay(),
//                             "h": st.value.start_date.h,
//                             "m": 0,
//                             "s": 0
//                         },
//                         "end_date": {
//                             "Y": st_date_plus_7.getFullYear(),
//                             "M": st_date_plus_7.getMonth()+1,
//                             "D": st_date_plus_7.getDay(),
//                             "h": st.value.end_date.h,
//                             "m": 0,
//                             "s": 0
//                         },
//                         "state": "Active"
//                     },
//                     "_rev": st.value.rev
//                 });
//                 couchdb_utils.post_to_couchdb('/db/'+st.id, update_seat_postData, function(err, response) {
//                     if (err) {console.log(err)}
//                     else {console.log("SEAT UPDATED PLUS 7: "+st.id)}
//                 })
//             }

//             // Controlla tutte le prenotazioni e in caso le elimina
//             reservations.rows.forEach(reserv => {
//                 // Se la prenotazione è del posto corrnte allora è scaduta e la elimina
//                 if (reserv.value.seat_id == st.id) {
//                     couchdb_utils.delete_from_couchdb('/db/'+reserv.id, function(err, response) {
//                         if (err) {console.log(err)}
//                         else {console.log("RESERVATION DELETED SUCCESFULLY: "+reserv.id)}
//                     })
//                 }
//             })
//         }
//     })
//     variables_get_and_render(req, res, seats, reservations);
// }

/* GET reservation page. */
router.get('/', redirectLogin, function(req, res) { variables_get_and_render(req, res, '', '') });

function variables_get_and_render(req, res, seats, reservations) {
    // GET 0_all_departments view: http://localhost:5984/db/_design/Department/_view/0_All_Departments/
    couchdb_utils.get_from_couchdb('/db/_design/Department/_view/0_All_Departments/', function(err, departments_response) {
        if (err) { console.log(err) }
        else { var departments = departments_response
            // GET 0_all_weekdays view: http://localhost:5984/db/_design/WeekDay/_view/0_All_WeekDays/
            couchdb_utils.get_from_couchdb('/db/_design/WeekDay/_view/0_All_WeekDays/', function(err, weekdays_response) {
                if (err) { console.log(err) }
                else { var weekdays = weekdays_response
                    // GET 0_all_spaces view: http://localhost:5984/db/_design/Space/_view/0_All_Spaces/
                    couchdb_utils.get_from_couchdb('/db/_design/Space/_view/0_All_Spaces/', function(err, spaces_response) {
                        if (err) { console.log(err) }
                        else { var spaces = spaces_response
                            // GET 0_all_seats view: http://localhost:5984/db/_design/Seat/_view/0_All_Seats/
                            couchdb_utils.get_from_couchdb('/db/_design/Seat/_view/0_All_Seats/', function(err, seats_response) {
                                if (err) { console.log(err) }
                                else { var seats = seats_response
                                    // GET 0_all_reservations view: http://localhost:5984/db/_design/Reservation/_view/0_All_Reservations/
                                    couchdb_utils.get_from_couchdb('/db/_design/Reservation/_view/0_All_Reservations/', function(err, reservations_response) {
                                        if (err) { console.log(err) }
                                        else { var reservations = reservations_response
                                            // Render della pagina di per effettuare le prenotazioni
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
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            })
        }
    })
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
    couchdb_utils.post_to_couchdb('/db/'+req.body.id, increase_st_position_postData, function(err, response) {
        if (err) {console.log(err)}
        else {console.log("SEAT POSITION INCREASED: "+req.body.id)}
    })
    // Crea la prenotazione
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
    couchdb_utils.post_to_couchdb('/db/'+req.body.id+"Reservation"+req.body.position, make_res_postData, function(err, response) {
        if (err) {console.log(err)}
        else {console.log("RESERVATION CREATED: "+'/db/'+req.body.id+"Reservation"+req.body.position); res.redirect('/reservation')}
    })
})

router.post('/rm_res', function(req, res){
    // Delete reservation: http://localhost:5984/db
    couchdb_utils.delete_from_couchdb('/db/'+req.body.res_id, function(err, response) {
        if (err) {console.log(err)}
        else {console.log("RESERVATION DELETED: "+req.body.res_id)}
    })
    // Decrease seat position: http://localhost:5984/db
    const decrease_st_position_postData = JSON.stringify({
        "_id": req.body.id,
        "type": "Seat",
        "fields": {
            "dep_name": req.body.key,
            "typology": req.body.typology,
            "space_name": req.body.space_name,
            "position": (parseInt(req.body.position)-1),
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
    couchdb_utils.post_to_couchdb('/db/'+req.body.id, decrease_st_position_postData, function(err, response) {
        if (err) {console.log(err)}
        else {console.log("SEAT POSITION DECREASED: "+req.body.id); res.redirect('/reservation')}
    })
})

module.exports = router;