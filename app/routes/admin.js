var express = require('express');
var router = express.Router();
var http = require('http');
const couchdb_utils = require("../couchdb_utils.js")
const security = require("../security.js");
const amqplib = require('amqplib');
const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5673';
var amqp = require('amqplib/callback_api');
const dayjs = require('dayjs');

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
              res.render('admin', { title: 'Express', users: users.rows, reservations: reservations.rows, departments: departments.rows, userId: req.session.userId, csrfToken: req.csrfToken(),location: req.location, role: req.session.role });
            }
          })
        }
      })
    }
  })
});

// Blocco e sblocco degli utenti
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
      queueLockEmail(user_to_lock);
      let msg_options={
        from: 'easybooking.adm@gmail.com',
        to: user_to_lock,
        subject: 'Account EasyBooking bloccato!',
        html: `Ciao ${user_to_lock} ci dispiace informarti che il tuo account è stato bloccato! Puo contattare un amministratore scrivendo a easybooking.adm@gmail.com e procedere con lo sblocco del tuo account.`,
      };
      deliverQueuedMessages('lock', req.transporter, msg_options);
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
      queueLockEmail(user_to_unlock);
      let msg_options={
        from: 'easybooking.adm@gmail.com',
        to: user_to_unlock,
        subject: 'Account EasyBooking sbloccato!',
        html: `Ciao ${user_to_unlock} siamo felici di informarti che il tuo account è stato sbloccato! Puoi effettuare l'accesso qui. <a href="https://localhost:8083/login">Accedi ad EasyBooking!</a>`,
      };
      deliverQueuedMessages('lock', req.transporter, msg_options);
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
  // update seat
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

function queueLockEmail(username){
  amqp.connect(process.env.AMQP_URL, function(error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function(error1, channel) {
      if (error1) {
        throw error1;
      }
      var queue = 'lock';
      var msg = process.argv.slice(2).join(' ') || "Accesso al sito bloccato per: "+username;
  
      channel.assertQueue(queue, {
        durable: true
      });
      let sent = channel.sendToQueue(queue, Buffer.from(msg), {
        persistent: true
      });
      if (sent){
        console.log(" [x] Sent '%s'", msg);
      };
      
    });
    setTimeout(function() {
      connection.close();
      //process.exit(0)
    }, 500);
  });
};
function deliverQueuedMessages(queue, transporter, msg_options){
  amqp.connect(process.env.AMQP_URL, function(error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function(error1, channel) {
      if (error1) {
        throw error1;
      }
  
      channel.assertQueue(queue, {
        durable: true
      });
      channel.prefetch(1);
      console.log(" [*] Waiting for messages in %s.", queue);
      channel.consume(queue, function(msg) {
        var secs = msg.content.toString().split('.').length - 1;

        transporter.sendMail(msg_options, function (err, info) {
          if (err) {
            res.json(err);
          } else {
            res.json(info);
            channel.ack(msg);
          }
        });

        console.log(" [x] Received %s", msg.content.toString());
        setTimeout(function() {
          console.log(" [x] Done");
          channel.ack(msg);
        }, secs * 1000);
      }, {
        // manual acknowledgment mode,
        // see ../confirms.html for details
        noAck: false
      });
    });
  });
}

module.exports = router;