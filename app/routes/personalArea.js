var express = require('express');
var router = express.Router();
const https = require('node:https');
const couchdb_utils = require("../couchdb_utils.js");
const jsStringify = require('js-stringify');
const { Script } = require('node:vm');

/* Reindirizza al login se non autenticati. */
const redirectLogin = function(req, res, next){
    if(!req.session.userId){
      res.redirect('/login');
    } else {
      next();
    }
}

/* GET personal_area page. */
router.get('/', redirectLogin ,function(req, res) {
    getCalendarEvents(req, res, req.session.access_token, '', '');
});

function getCalendarEvents(req, res, access_token , calendar, start_date){
    let data = '';
    const options = {
        hostname: 'www.googleapis.com',
        port: 443,
        path: '/calendar/v3/calendars/primary/events',
        method: 'GET',
        headers: { Authorization: `Bearer ${access_token}` },
      };

    const request = https.request(options, (response) => {
        console.log('statusCode:', response.statusCode);
        console.log('headers:', response.headers);
        response.on('data', (d) => {
            //process.stdout.write(d);
            data+=d.toString();
        });

        response.on('end', (end) =>{
          let parsed_data = JSON.parse(data);
          var events_array = [];
          parsed_data.items.forEach(element => {
            let titolo = element.summary;
            let inizio = element.start.dateTime;
            let fine = element.end.dateTime;

            events_array.push({
              title : titolo,
              start : inizio,
              end :   fine
            });
          });

          // GET all_reservations view: http://localhost:5984/db/_design/Reservation/_view/All_Reservations/
          couchdb_utils.get_from_couchdb('/db/_design/Reservation/_view/All_Reservations/', function(err, reservations_response) {
            if (err) { console.log(err) }
            else { var reservations = reservations_response
              // Render della pagina home
              res.render('personalArea', {userId: req.session.userId, reservations: reservations.rows, csrfToken: req.csrfToken(), location: req.location, cal_events: events_array, jsStringify});
            }
          })

        });
      });

    request.on('error', (e) => {
        console.error(e);
        return false;
    });
    request.end();
};

module.exports = router;