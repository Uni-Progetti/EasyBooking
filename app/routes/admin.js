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


module.exports = router;