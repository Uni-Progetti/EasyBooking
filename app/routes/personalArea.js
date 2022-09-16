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
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      };

    const request = https.request(options, (response) => {
        console.log('statusCode:', response.statusCode);
        console.log('headers:', response.headers);
        
        response.on('data', (d) => {
            //process.stdout.write(d);
            data+=d.toString();
        });

        response.on('end', (end) =>{
          console.log('----- °°°°° -----');
          let parsed_data = JSON.parse(data);
          // console.log(parsed_data.items);            
          // res.send(parsed_data);
          var events_array = [];
          parsed_data.items.forEach(element => {
            // output [element.key] = element.value.fields;
            let titolo = element.summary;
            let inizio = element.start.dateTime;
            let fine = element.end.dateTime;

            let ini = '';
            let fin = '';
            for(let i=0; i < inizio.length-6; i++) {
              ini += inizio[i];
            }
            for(let i=0; i < fine.length-6; i++) {
              fin += fine[i];
            }

            console.log('title: ' + titolo);
            console.log('start: ' + ini);
            console.log('end: ' + fin);
            events_array.push({
              title  : titolo,
              start  : ini,
              end    : fin
            });
          });

          console.log(events_array);
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