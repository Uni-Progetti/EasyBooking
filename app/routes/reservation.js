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

// GET reservation page
router.get('/', redirectLogin, function(req, res) {
    // GET all_departments view: http://localhost:5984/db/_design/Department/_view/All_Departments/
    couchdb_utils.get_from_couchdb('/db/_design/Department/_view/All_Departments/', function(err, departments_response) {
        if (err) { console.log(err) }
        else { var departments = departments_response
            // GET all_weekdays view: http://localhost:5984/db/_design/WeekDay/_view/All_WeekDays/
            couchdb_utils.get_from_couchdb('/db/_design/WeekDay/_view/All_WeekDays/', function(err, weekdays_response) {
                if (err) { console.log(err) }
                else { var weekdays = weekdays_response
                    // GET all_spaces view: http://localhost:5984/db/_design/Space/_view/All_Spaces/
                    couchdb_utils.get_from_couchdb('/db/_design/Space/_view/All_Spaces/', function(err, spaces_response) {
                        if (err) { console.log(err) }
                        else { var spaces = spaces_response
                            // GET all_seats view: http://localhost:5984/db/_design/Seat/_view/All_Seats/
                            couchdb_utils.get_from_couchdb('/db/_design/Seat/_view/All_Seats/', function(err, seats_response) {
                                if (err) { console.log(err) }
                                else { var seats = seats_response
                                    // GET all_reservations view: http://localhost:5984/db/_design/Reservation/_view/All_Reservations/
                                    couchdb_utils.get_from_couchdb('/db/_design/Reservation/_view/All_Reservations/', function(err, reservations_response) {
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
                                                location: req.location,
                                                role: req.session.role
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
})

// POST increase seat position + make reservation
router.post('/make_res', function(req, res){
    // increase seat position: http://localhost:5984/db
    const increase_st_position_postData = JSON.stringify({
        "key": { dep_name: req.body.dep_name, typology: req.body.typology, space_name: req.body.space_name },
        "type": "Seat",
        "fields": {
            "position": (parseInt(req.body.position)+1),
            "start_date": {
                "Y": parseInt(req.body.start_Y),
                "M": parseInt(req.body.start_M),
                "D": parseInt(req.body.start_D),
                "h": parseInt(req.body.start_h),
                "m": parseInt(req.body.start_m),
                "s": parseInt(req.body.start_s)
            },
            "end_date": {
                "Y": parseInt(req.body.end_Y),
                "M": parseInt(req.body.end_M),
                "D": parseInt(req.body.end_D),
                "h": parseInt(req.body.end_h),
                "m": parseInt(req.body.end_m),
                "s": parseInt(req.body.end_s)
            },
            "state": "Active"
        },
        "_rev": req.body.rev
    });
    couchdb_utils.post_to_couchdb('/db/'+req.body.id, increase_st_position_postData, function(err, response) {
        if (err) {console.log(err)}
        else {/*console.log("SEAT POSITION INCREASED: "+req.body.id)*/}
    })
    // Crea la prenotazione
    const make_res_postData = JSON.stringify({
        "key": req.body.id+"Reservation"+req.body.position,
        "type": "Reservation",
        "fields": {
            "email": req.body.email,
            "dep_name": req.body.dep_name,
            "typology": req.body.typology,
            "space_name": req.body.space_name,
            "seat_id": req.body.id,
            "seat_number": req.body.position,
            "start_date": {
                "Y": parseInt(req.body.start_Y),
                "M": parseInt(req.body.start_M),
                "D": parseInt(req.body.start_D),
                "h": parseInt(req.body.start_h),
                "m": parseInt(req.body.start_m),
                "s": parseInt(req.body.start_s)
            },
            "end_date": {
                "Y": parseInt(req.body.end_Y),
                "M": parseInt(req.body.end_M),
                "D": parseInt(req.body.end_D),
                "h": parseInt(req.body.end_h),
                "m": parseInt(req.body.end_m),
                "s": parseInt(req.body.end_s)
            },
            "is_sync": false,
            "state": "Active"
        }
    });
    couchdb_utils.post_to_couchdb('/db/'+req.body.id+"Reservation"+req.body.position, make_res_postData, function(err, response) {
        if (err) {console.log(err)}
        else {
            // console.log("RESERVATION CREATED: "+'/db/'+req.body.id+"Reservation"+req.body.position)
            res.redirect('/reservation')
        }
    })
})
// POST decrease seat position + remove reservation
router.post('/rm_res', function(req, res){
    // Delete reservation: http://localhost:5984/db
    couchdb_utils.delete_from_couchdb('/db/'+req.body.res_id, function(err, response) {
        if (err) {console.log(err)}
        else {/*console.log("RESERVATION DELETED: "+req.body.res_id)*/}
    })
    // Decrease seat position: http://localhost:5984/db
    const decrease_st_position_postData = JSON.stringify({
        "key": { dep_name: req.body.dep_name, typology: req.body.typology, space_name: req.body.space_name },
        "type": "Seat",
        "fields": {
            "position": (parseInt(req.body.position)-1),
            "start_date": {
                "Y": parseInt(req.body.start_Y),
                "M": parseInt(req.body.start_M),
                "D": parseInt(req.body.start_D),
                "h": parseInt(req.body.start_h),
                "m": parseInt(req.body.start_m),
                "s": parseInt(req.body.start_s)
            },
            "end_date": {
                "Y": parseInt(req.body.end_Y),
                "M": parseInt(req.body.end_M),
                "D": parseInt(req.body.end_D),
                "h": parseInt(req.body.end_h),
                "m": parseInt(req.body.end_m),
                "s": parseInt(req.body.end_s)
            },
            "state": "Active"
        },
        "_rev": req.body.rev
    });
    couchdb_utils.post_to_couchdb('/db/'+req.body.id, decrease_st_position_postData, function(err, response) {
        if (err) {console.log(err)}
        else {
            // console.log("SEAT POSITION DECREASED: "+req.body.id)
            res.redirect('/reservation')
        }
    })
})

module.exports = router;