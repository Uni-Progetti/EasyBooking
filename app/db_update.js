var express = require('express');
var router = express.Router();
var http = require('http');
const couchdb_utils = require('./couchdb_utils.js');

// Update with host: couchdb
function seats_and_reservations_get() {
    // GET all_seats view: http://localhost:5984/db/_design/Seat/_view/All_Seats/
    couchdb_utils.get_from_couchdb('/db/_design/Seat/_view/All_Seats/', function(err, seats_response) {
        if (err) { console.log(err) }
        else { var seats = seats_response
            // GET all_reservations view: http://localhost:5984/db/_design/Reservation/_view/All_Reservations/
            couchdb_utils.get_from_couchdb('/db/_design/Reservation/_view/All_Reservations/', function(err, reservations_response) {
                if (err) { console.log(err) }
                else { var reservations = reservations_response
                    // Controlla se si deve effettuare l'aggiornamento dei posti
                    seats_update( seats, reservations )
                }
            })
        }
    })
}
function seats_update( seats, reservations) {
    seats.rows.forEach(st => {
        // Inizializzo variabili
        const today               = new Date()
        const today_YMD_str       = String((today.getFullYear()))+((String((today.getMonth()+1)).length == 1)?  "0"+String((today.getMonth()+1)):String((today.getMonth()+1)))+  ((String((today.getDate())).length == 1)?     "0"+String((today.getDate())):String((today.getDate())))
        const today_YMDh_str      = String((today.getFullYear()))+((String((today.getMonth()+1)).length == 1)?  "0"+String((today.getMonth()+1)):String((today.getMonth()+1)))+  ((String((today.getDate())).length == 1)?     "0"+String((today.getDate())):String((today.getDate())))        +((String((today.getHours()+2)).length == 1)?  "0"+String((today.getHours()+2)):String((today.getHours()+2)))
        var   start_date_YMD_str  = String(st.value.fields.start_date.Y)+((String(st.value.fields.start_date.M).length == 1)? "0"+String(st.value.fields.start_date.M):String(st.value.fields.start_date.M))+((String(st.value.fields.start_date.D).length == 1)? "0"+String(st.value.fields.start_date.D):String(st.value.fields.start_date.D))
        var   start_date_YMDh_str = String(st.value.fields.start_date.Y)+((String(st.value.fields.start_date.M).length == 1)? "0"+String(st.value.fields.start_date.M):String(st.value.fields.start_date.M))+((String(st.value.fields.start_date.D).length == 1)? "0"+String(st.value.fields.start_date.D):String(st.value.fields.start_date.D))+((String(st.value.fields.start_date.h).length == 1)? "0"+String(st.value.fields.start_date.h):String(st.value.fields.start_date.h))

        // Controlla se il posto ha un data e un tempo precedenti a quelli odierni e quindi è da aggiornare
        if (start_date_YMDh_str <= today_YMDh_str) {
            // Se la data del posto corrente è di oggi ma l'orario è passato basta mettere expired nello stato del posto
            if (start_date_YMD_str == today_YMD_str) {
                // Aggiorna lo stato del posto: http://localhost:5984/db
                const expired_seat_postData = JSON.stringify({
                    "_id": st.id,
                    "key": st.key,
                    "type": "Seat",
                    "fields": {
                        "position": st.value.fields.position,
                        "start_date": {
                            "Y": st.value.fields.start_date.Y,
                            "M": st.value.fields.start_date.M,
                            "D": st.value.fields.start_date.D,
                            "h": st.value.fields.start_date.h,
                            "m": st.value.fields.start_date.m,
                            "s": st.value.fields.start_date.s
                        },
                        "end_date": {
                            "Y": st.value.fields.end_date.Y,
                            "M": st.value.fields.end_date.M,
                            "D": st.value.fields.end_date.D,
                            "h": st.value.fields.end_date.h,
                            "m": st.value.fields.end_date.m,
                            "s": st.value.fields.end_date.s
                        },
                        "state": "Expired"
                    },
                    "_rev": st.value.rev
                });
                couchdb_utils.post_to_couchdb('/db/'+st.id, expired_seat_postData, function(err, response) {
                    if (err) {console.log(err)}
                    else {
                        /*console.log("SEAT UPDATED EXPIRED: "+st.id)*/
                    }
                })
            }
            // Se invece non è di oggi ma di un giorno precedente
            else {
                // Inizializza i dati del nuovo giorno
                const st_date_plus_7 = new Date(st.value.fields.start_date.Y, st.value.fields.start_date.M-1, (st.value.fields.start_date.D)+7)
                // Aggiorna il posto con il nuovo giorno corretto della settimana http://localhost:5984/db
                const update_seat_postData = JSON.stringify({
                    "_id": st.id,
                    "key": st.key,
                    "type": "Seat",
                    "fields": {
                        "position": 1,
                        "start_date": {
                            "Y": st_date_plus_7.getFullYear(),
                            "M": st_date_plus_7.getMonth()+1,
                            "D": st_date_plus_7.getDate(),
                            "h": st.value.fields.start_date.h,
                            "m": 0,
                            "s": 0
                        },
                        "end_date": {
                            "Y": st_date_plus_7.getFullYear(),
                            "M": st_date_plus_7.getMonth()+1,
                            "D": st_date_plus_7.getDate(),
                            "h": st.value.fields.end_date.h,
                            "m": 0,
                            "s": 0
                        },
                        "state": "Active"
                    },
                    "_rev": st.value.rev
                });
                couchdb_utils.post_to_couchdb('/db/'+st.id, update_seat_postData, function(err, response) {
                    if (err) {console.log(err)}
                    else {/*console.log("SEAT UPDATED PLUS 7: "+st.id)*/}
                })
            }

            // Controlla tutte le prenotazioni e in caso le elimina
            reservations.rows.forEach(reserv => {
                // Se la prenotazione è del posto corrnte allora è scaduta e la elimina
                if (reserv.value.fields.seat_id == st.id) {
                    couchdb_utils.delete_from_couchdb('/db/'+reserv.id, function(err, response) {
                        if (err) {console.log(err)}
                        else {console.log("RESERVATION DELETED SUCCESFULLY: "+reserv.id)}
                    })
                }
            })
        }
    })
    return console.log("Reservation DB updated successfully!");
}

// Update with host: 127.0.0.1
function seats_and_reservations_get_seed() {
    // GET all_seats view: http://localhost:5984/db/_design/Seat/_view/All_Seats/
    couchdb_utils.get_from_couchdb_out('/db/_design/Seat/_view/All_Seats/', function(err, seats_response) {
        if (err) { console.log(err) }
        else { var seats = seats_response
            // GET all_reservations view: http://localhost:5984/db/_design/Reservation/_view/All_Reservations/
            couchdb_utils.get_from_couchdb_out('/db/_design/Reservation/_view/All_Reservations/', function(err, reservations_response) {
                if (err) { console.log(err) }
                else { var reservations = reservations_response
                    // Controlla se si deve effettuare l'aggiornamento dei posti
                    seats_update_seed( seats, reservations )
                }
            })
        }
    })
}
function seats_update_seed( seats, reservations) {
    seats.rows.forEach(st => {
        // Inizializzo variabili
        const today               = new Date()
        const today_YMD_str       = String((today.getFullYear()))+((String((today.getMonth()+1)).length == 1)?                "0"+String((today.getMonth()+1)):String((today.getMonth()+1)))+                ((String((today.getDate())).length == 1)?            "0"+String((today.getDate())):String((today.getDate())))
        const today_YMDh_str      = String((today.getFullYear()))+((String((today.getMonth()+1)).length == 1)?                "0"+String((today.getMonth()+1)):String((today.getMonth()+1)))+                ((String((today.getDate())).length == 1)?            "0"+String((today.getDate())):String((today.getDate())))                      +((String((today.getHours())).length == 1)?           "0"+String((today.getHours())):String((today.getHours())))
        var   start_date_YMD_str  = String(st.value.fields.start_date.Y)+((String(st.value.fields.start_date.M).length == 1)? "0"+String(st.value.fields.start_date.M):String(st.value.fields.start_date.M))+((String(st.value.fields.start_date.D).length == 1)? "0"+String(st.value.fields.start_date.D):String(st.value.fields.start_date.D))
        var   start_date_YMDh_str = String(st.value.fields.start_date.Y)+((String(st.value.fields.start_date.M).length == 1)? "0"+String(st.value.fields.start_date.M):String(st.value.fields.start_date.M))+((String(st.value.fields.start_date.D).length == 1)? "0"+String(st.value.fields.start_date.D):String(st.value.fields.start_date.D))+((String(st.value.fields.start_date.h).length == 1)? "0"+String(st.value.fields.start_date.h):String(st.value.fields.start_date.h))

        // Controlla se il posto ha un data e un tempo precedenti a quelli odierni e quindi è da aggiornare
        if (start_date_YMDh_str <= today_YMDh_str) {
            // Se la data del posto corrente è di oggi ma l'orario è passato basta mettere expired nello stato del posto
            if (start_date_YMD_str == today_YMD_str) {
                // Aggiorna lo stato del posto: http://localhost:5984/db
                const expired_seat_postData = JSON.stringify({
                    "_id": st.id,
                    "key": st.key,
                    "type": "Seat",
                    "fields": {
                        "position": st.value.fields.position,
                        "start_date": {
                            "Y": st.value.fields.start_date.Y,
                            "M": st.value.fields.start_date.M,
                            "D": st.value.fields.start_date.D,
                            "h": st.value.fields.start_date.h,
                            "m": st.value.fields.start_date.m,
                            "s": st.value.fields.start_date.s
                        },
                        "end_date": {
                            "Y": st.value.fields.end_date.Y,
                            "M": st.value.fields.end_date.M,
                            "D": st.value.fields.end_date.D,
                            "h": st.value.fields.end_date.h,
                            "m": st.value.fields.end_date.m,
                            "s": st.value.fields.end_date.s
                        },
                        "state": "Expired"
                    },
                    "_rev": st.value.rev
                });
                couchdb_utils.post_to_couchdb_out('/db/'+st.id, expired_seat_postData, function(err, response) {
                    if (err) {console.log(err)}
                    else {/*console.log("SEAT UPDATED EXPIRED: "+st.id)*/}
                })
            }
            // Se invece non è di oggi ma di un giorno precedente
            else {
                // Inizializza i dati del nuovo giorno
                const st_date_plus_7 = new Date(st.value.fields.start_date.Y, st.value.fields.start_date.M-1, (st.value.fields.start_date.D)+7)
                // Aggiorna il posto con il nuovo giorno corretto della settimana http://localhost:5984/db
                const update_seat_postData = JSON.stringify({
                    "_id": st.id,
                    "key": st.key,
                    "type": "Seat",
                    "fields": {
                        "position": 1,
                        "start_date": {
                            "Y": st_date_plus_7.getFullYear(),
                            "M": st_date_plus_7.getMonth()+1,
                            "D": st_date_plus_7.getDate(),
                            "h": st.value.fields.start_date.h,
                            "m": 0,
                            "s": 0
                        },
                        "end_date": {
                            "Y": st_date_plus_7.getFullYear(),
                            "M": st_date_plus_7.getMonth()+1,
                            "D": st_date_plus_7.getDate(),
                            "h": st.value.fields.end_date.h,
                            "m": 0,
                            "s": 0
                        },
                        "state": "Active"
                    },
                    "_rev": st.value.rev
                });
                couchdb_utils.post_to_couchdb_out('/db/'+st.id, update_seat_postData, function(err, response) {
                    if (err) {console.log(err)}
                    else {/*console.log("SEAT UPDATED PLUS 7: "+st.id)*/}
                })
            }

            // Controlla tutte le prenotazioni e in caso le elimina
            reservations.rows.forEach(reserv => {
                // Se la prenotazione è del posto corrnte allora è scaduta e la elimina
                if (reserv.value.fields.seat_id == st.id) {
                    couchdb_utils.delete_from_couchdb_out('/db/'+reserv.id, function(err, response) {
                        if (err) {console.log(err)}
                        else {console.log("RESERVATION DELETED SUCCESFULLY: "+reserv.id)}
                    })
                }
            })
        }
    })
    return console.log("DB updated successfully!");
}

module.exports.seats_and_reservations_get = seats_and_reservations_get;
module.exports.seats_and_reservations_get_seed = seats_and_reservations_get_seed;