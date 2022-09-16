var express = require('express');
var router = express.Router();
var http = require('http');
const couchdb_utils = require("../couchdb_utils.js")

/* Reindirizza al login se non autenticati. */
const redirectLogin = function(req, res, next){
    if(!req.session.userId){ res.redirect('/login') }
    else { next() }
}

/* GET admin page. */
router.get('/', redirectLogin, function(req, res) {
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

module.exports = router;