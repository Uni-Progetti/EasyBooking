var express = require('express');
var router = express.Router();
var http = require('http');
const couchdb_utils = require("../couchdb_utils.js")
const security = require("../security.js")


/* GET home page. */
router.get('/', security.redirectLogin ,function(req, res) {
        // GET all_departments view: http://localhost:5984/db/_design/Department/_view/All_Departments/
        couchdb_utils.get_from_couchdb('/db/_design/Department/_view/All_Departments/', function(err, departments_response) {
          if (err) { console.log(err) }
          else { var departments = departments_response
            // GET all_reservations view: http://localhost:5984/db/_design/Reservation/_view/All_Reservations/
            couchdb_utils.get_from_couchdb('/db/_design/Reservation/_view/All_Reservations/', function(err, reservations_response) {
              if (err) { console.log(err) }
              else { var reservations = reservations_response
                  // Render della pagina home
                  res.render('home', { title: 'Express', reservations: reservations.rows, departments: departments.rows, userId: req.session.userId ,csrfToken: req.csrfToken(), location: req.location, role: req.session.role});
              }
            })
          }
      })
});

module.exports = router;