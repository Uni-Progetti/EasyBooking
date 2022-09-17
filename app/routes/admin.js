var express = require('express');
var router = express.Router();
var http = require('http');
const couchdb_utils = require("../couchdb_utils.js")
const security = require("../security.js");

/* GET admin page. */
router.get('/', security.redirectLogin, security.isAdmin , function(req, res) {
  // GET all_departments view: http://localhost:5984/db/_design/Department/_view/All_Departments/
  couchdb_utils.get_from_couchdb('/db/_design/Department/_view/All_Departments/', function(err, departments_response) {
    if (err) { console.log(err) }
    else { var departments = departments_response
      // GET all_reservations view: http://localhost:5984/db/_design/Reservation/_view/All_Reservations/
      couchdb_utils.get_from_couchdb('/db/_design/Reservation/_view/All_Reservations/', function(err, reservations_response) {
        if (err) { console.log(err) }
        else { var reservations = reservations_response
          // GET all_users view: http://localhost:5984/db/_design/User/_view/0_All_Users/
          couchdb_utils.get_from_couchdb('/db/_design/User/_view/0_All_Users/', function(err, users_response) {
            if (err) { console.log(err) }
            else { var users = users_response
              // Render della pagina adimin
              res.render('admin', { title: 'Express', users: users.rows, reservations: reservations.rows, departments: departments.rows, userId: req.session.userId, csrfToken: req.csrfToken() });
            }
          })
        }
      })
    }
  })
});

router.post('/lock', security.redirectLogin, security.isAdmin, function(req , res){
  var user_to_lock = req.body.user_to_lock;
  couchdb_utils.get_from_couchdb('/db/'+user_to_lock, function(err_1, response_1){
    if(err_1){console.log('errore blocco utente'); res.redirect('back')};
    response_1["locked"]='true';
    console.log(response_1);
    console.log(JSON.stringify(response_1));
    couchdb_utils.update_or_create_to_couchdb('/db/'+user_to_lock, JSON.stringify(response_1), function(err_2, response_2){
      if(err_2){console.log('errore update utente bloccato'); res.redirect('back')};
      console.log(`utente ${user_to_lock} bloccato con successo!`);
      req.session.message = {
        type: 'info',
        intro: ' ',
        message: `Utente ${user_to_lock} bloccato con successo!`
      }
      res.redirect('back');
    })
  })
});

router.post('/unlock', security.redirectLogin, security.isAdmin, function(req , res){
  var user_to_unlock = req.body.user_to_unlock;
  couchdb_utils.get_from_couchdb('/db/'+user_to_unlock, function(err_1, response_1){
    if(err_1){console.log('errore sblocco utente'); res.redirect('back')};
    response_1["locked"]='false';
    console.log(response_1);
    console.log(JSON.stringify(response_1));
    couchdb_utils.update_or_create_to_couchdb('/db/'+user_to_unlock, JSON.stringify(response_1), function(err_2, response_2){
      if(err_2){console.log('errore update utente sbloccato'); res.redirect('back')};
      console.log(`utente ${user_to_unlock} sbloccato con successo!`);
      req.session.message = {
        type: 'info',
        intro: ' ',
        message: `Utente ${user_to_unlock} sbloccato con successo!`
      }
      res.redirect('back');
    })
  })
});

// POST remove reservation + decrease seat position
router.post('/rm_res', function(req, res){
  // Delete reservation
  couchdb_utils.delete_from_couchdb('/db/'+req.body.res_id, function(err, response) {
    if (err) {console.log(err)}
    else {/*console.log("RESERVATION DELETED: "+req.body.res_id)*/}
  })
  // GET seat
  couchdb_utils.get_from_couchdb('/db/'+req.body.seat_id, function(err, seat_response) {
    if (err) { console.log(err) }
    else { var seat = seat_response 
      // Decrease seat position
      const decrease_st_position_postData = JSON.stringify({
        "key": seat.key,
        "type": "Seat",
        "fields": {
          "position": (seat.fields.position)-1,
          "start_date": {
            "Y": seat.fields.start_date.Y,
            "M": seat.fields.start_date.M,
            "D": seat.fields.start_date.D,
            "h": seat.fields.start_date.h,
            "m": seat.fields.start_date.m,
            "s": seat.fields.start_date.s
          },
          "end_date": {
            "Y": seat.fields.end_date.Y,
            "M": seat.fields.end_date.M,
            "D": seat.fields.end_date.D,
            "h": seat.fields.end_date.h,
            "m": seat.fields.end_date.m,
            "s": seat.fields.end_date.s
          },
          "state": "Active"
        },
        "_rev": seat._rev
      });
      couchdb_utils.post_to_couchdb('/db/'+seat._id, decrease_st_position_postData, function(err, response) {
        if (err) {console.log(err)}
        else { res.redirect('/admin') }
      })
    }
  })
})

// POST remove department + all his spaces, seats and weekdays
router.post('/rm_dep', function(req, res){
  // GET all_weekdays view: http://localhost:5984/db/_design/WeekDay/_view/All_WeekDays/
  couchdb_utils.get_from_couchdb('/db/_design/WeekDay/_view/All_WeekDays/', function(err, weekdays_response) {
    if (err) { console.log(err) }
    else { var weekdays = weekdays_response.rows
      // GET all_spaces view: http://localhost:5984/db/_design/Space/_view/All_Spaces/
      couchdb_utils.get_from_couchdb('/db/_design/Space/_view/All_Spaces/', function(err, spaces_response) {
        if (err) { console.log(err) }
        else { var spaces = spaces_response.rows
          // GET all_seats view: http://localhost:5984/db/_design/Seat/_view/All_Seats/
          couchdb_utils.get_from_couchdb('/db/_design/Seat/_view/All_Seats/', function(err, seats_response) {
            if (err) { console.log(err) }
            else { var seats = seats_response.rows
              // GET all_reservations view: http://localhost:5984/db/_design/Reservation/_view/All_Reservations/
              couchdb_utils.get_from_couchdb('/db/_design/Reservation/_view/All_Reservations/', function(err, reservations_response) {
                if (err) { console.log(err) }
                else { var reservations = reservations_response.rows
                  // Delete weekdays
                  weekdays.forEach(function(wd){
                    if (wd.key.dep_name == req.body.dep_name) {
                      couchdb_utils.delete_from_couchdb('/db/'+wd.id, function(err, response) {
                        if (err) {console.log(err)}
                      })
                    }
                  })
                  // Delete spaces
                  spaces.forEach(function(sp){
                    if (sp.key.dep_name == req.body.dep_name) {
                      couchdb_utils.delete_from_couchdb('/db/'+sp.id, function(err, response) {
                        if (err) {console.log(err)}
                      })
                    }
                  })
                  // Delete seats
                  seats.forEach(function(st){
                    if (st.key.dep_name == req.body.dep_name) {
                      couchdb_utils.delete_from_couchdb('/db/'+st.id, function(err, response) {
                        if (err) {console.log(err)}
                      })
                    }
                  })
                  // Delete reservations
                  reservations.forEach(function(res){
                    if (res.value.fields.dep_name == req.body.dep_name) {
                      couchdb_utils.delete_from_couchdb('/db/'+res.id, function(err, response) {
                        if (err) {console.log(err)}
                      })
                    }
                  })
                  // Delete department
                  couchdb_utils.delete_from_couchdb('/db/'+req.body.dep_id, function(err, response) {
                    if (err) {console.log(err)}
                    else { res.redirect('/admin') }
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

module.exports = router;