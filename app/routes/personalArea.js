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
router.get('/', redirectLogin, function(req, res) {
  getCalendarEvents(req, res, req.session.access_token, '', '');
});

function getCalendarEvents(req, res, access_token, calendar, start_date){
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
				reservations.rows.forEach(element => {
					console.log('°°°°°-----°°°°°');
					console.log(element.value.fields);
					let tit = element.value.fields.dep_name + ' - ' + element.value.fields.typology + ' ' + element.value.fields.space_name;
					let ini = String(element.value.fields.start_date.Y)+'-'+((String(element.value.fields.start_date.M).length == 1)? "0"+String(element.value.fields.start_date.M):String(element.value.fields.start_date.M))+'-'+((String(element.value.fields.start_date.D).length == 1)? "0"+String(element.value.fields.start_date.D):String(element.value.fields.start_date.D))+'T'+((String(element.value.fields.start_date.h).length == 1)? "0"+String(element.value.fields.start_date.h):String(element.value.fields.start_date.h))+':00:00';
					let fin = String(element.value.fields.end_date.Y)+'-'+((String(element.value.fields.end_date.M).length == 1)? "0"+String(element.value.fields.end_date.M):String(element.value.fields.end_date.M))+'-'+((String(element.value.fields.end_date.D).length == 1)? "0"+String(element.value.fields.end_date.D):String(element.value.fields.end_date.D))+'T'+((String(element.value.fields.end_date.h).length == 1)? "0"+String(element.value.fields.end_date.h):String(element.value.fields.end_date.h))+':00:00';
					console.log(tit);
					console.log(ini);
					console.log(fin);

					events_array.push({
						title : tit,
						start : ini,
						end :   fin
					});
				});
				// Render della pagina home
				res.render('personalArea', {userId: req.session.userId, reservations: reservations.rows, csrfToken: req.csrfToken(), location: req.location, cal_events: events_array, role: req.session.role, access_token: access_token, jsStringify});
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


// POST
router.post('/sync_events', function(req, res) {
  	var access_token = req.body.access_token;
	console.log('-°-°-°-°-')
	console.log('reser: ', req.body.reservation);
	var ress = JSON.parse(req.body.reservation);

	if(!(ress.value.fields.is_sync)) {

		console.log(ress.value);
		console.log('dip : ', ress.value.fields.dep_name + ' - ' + ress.value.fields.typology + ' ' + ress.value.fields.space_name);
		console.log('inizio : ', ress.value.fields.start_date);
		console.log('fine : ', ress.value.fields.end_date);

		const postData = JSON.stringify({
			'summary': `${ress.value.fields.dep_name + ' - ' + ress.value.fields.typology + ' ' + ress.value.fields.space_name}`,
			'start': { 
				'dateTime': `${String(ress.value.fields.start_date.Y)+'-'+((String(ress.value.fields.start_date.M).length == 1)? "0"+String(ress.value.fields.start_date.M):String(ress.value.fields.start_date.M))+'-'+((String(ress.value.fields.start_date.D).length == 1)? "0"+String(ress.value.fields.start_date.D):String(ress.value.fields.start_date.D))+'T'+((String(ress.value.fields.start_date.h).length == 1)? "0"+String(ress.value.fields.start_date.h):String(ress.value.fields.start_date.h))+':00:00'}`,
				'timeZone': 'Europe/Rome',
			},
			'end': { 
				'dateTime': `${String(ress.value.fields.end_date.Y)+'-'+((String(ress.value.fields.end_date.M).length == 1)? "0"+String(ress.value.fields.end_date.M):String(ress.value.fields.end_date.M))+'-'+((String(ress.value.fields.end_date.D).length == 1)? "0"+String(ress.value.fields.end_date.D):String(ress.value.fields.end_date.D))+'T'+((String(ress.value.fields.end_date.h).length == 1)? "0"+String(ress.value.fields.end_date.h):String(ress.value.fields.end_date.h))+':00:00'}`,
				'timeZone': 'Europe/Rome',
			},
		});

		const post_options = {
			hostname: 'www.googleapis.com',
			port: 443,
			path: '/calendar/v3/calendars/primary/events',
			method: 'POST',
			headers: { Authorization: `Bearer ${access_token}` },
		};

		var data = "";
		const usrs = https.request(post_options, out => {
			console.log(`statusCode: ${out.statusCode}`);
			out.setEncoding('utf8');
			out.on('data', d => {
				data += d.toString();
				//process.stdout.write(d);
			});
			out.on('end', function() {
				var x = JSON.parse(data);
				res.header("Content-Type",'application/json');
				// aggiorna il campo is_sync della prenotazione
				const to_sync_postData = JSON.stringify({
					"key": ress.id,
					"type": "Reservation",
					"fields": {
						"email": ress.value.fields.email,
						"dep_name": ress.value.fields.dep_name,
						"typology": ress.value.fields.typology,
						"space_name": ress.value.fields.space_name,
						"seat_id": ress.value.fields.seat_id,
						"seat_number": ress.value.fields.position,
						"start_date": {
							"Y": parseInt(ress.value.fields.start_date.Y),
							"M": parseInt(ress.value.fields.start_date.M),
							"D": parseInt(ress.value.fields.start_date.D),
							"h": parseInt(ress.value.fields.start_date.h),
							"m": parseInt(ress.value.fields.start_date.m),
							"s": parseInt(ress.value.fields.start_date.s)
						},
						"end_date": {
							"Y": parseInt(ress.value.fields.end_date.Y),
							"M": parseInt(ress.value.fields.end_date.M),
							"D": parseInt(ress.value.fields.end_date.D),
							"h": parseInt(ress.value.fields.end_date.h),
							"m": parseInt(ress.value.fields.end_date.m),
							"s": parseInt(ress.value.fields.end_date.s)
						},
						"is_sync": true,
						"state": "Active"
					},
					"_rev": ress.value.rev
				});
				couchdb_utils.post_to_couchdb('/db/'+ress.id, to_sync_postData, function(err, response) {
					if (err) {console.log(err)}
					else {
						res.redirect('/personalArea');
					}
				})
			});
		});

		usrs.on('error', error => {
			console.log(error);
			res.status(503);
		});

		usrs.write(postData);
		usrs.end();
	}
});

module.exports = router;