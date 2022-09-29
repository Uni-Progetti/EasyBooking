var express = require('express');
var router = express.Router();
const https = require('node:https');
const couchdb_utils = require("../couchdb_utils.js");
const security = require("../security.js")
const jsStringify = require('js-stringify');
const { Script } = require('node:vm');

// GET personal_area page
router.get('/', security.redirectLogin, function(req, res) {
	getCalendarEvents(req, res, req.session.access_token, '', '');
});
function getCalendarEvents(req, res, access_token, calendar, start_date){
	var events_array = [];

	if ('access_token' in req.session) {
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
				parsed_data.items.forEach(element => {
					let titolo = element.summary;
					let inizio = element.start.dateTime;
					let fine = element.end.dateTime;

					events_array.push({ title: titolo, start: inizio, end:   fine });
				});

				getPersonalAreaReservations(req, res, access_token, events_array, true);
			});
		});

		request.on('error', (e) => {
			console.error(e);
			return false;
		});
		request.end();
	}
	else {
		getPersonalAreaReservations(req, res, access_token, events_array, false);
	}
};
function getPersonalAreaReservations(req, res, access_token, events_array, is_google){
	// GET all_reservations view: http://localhost:5984/db/_design/Reservation/_view/All_Reservations/
	couchdb_utils.get_from_couchdb('/db/_design/Reservation/_view/All_Reservations/', function(err, reservations_response) {
		if (err) { console.log(err) }
		else { var reservations = reservations_response
			reservations.rows.forEach(element => {
				if(req.session.username == element.value.fields.email && element.value.fields.is_sync == false) {
					let tit = element.value.fields.dep_name+': '+element.value.fields.typology+' - '+element.value.fields.space_name;
					let ini = String(element.value.fields.start_date.Y)+'-'+((String(element.value.fields.start_date.M).length == 1)? "0"+String(element.value.fields.start_date.M):String(element.value.fields.start_date.M))+'-'+((String(element.value.fields.start_date.D).length == 1)? "0"+String(element.value.fields.start_date.D):String(element.value.fields.start_date.D))+'T'+((String(element.value.fields.start_date.h).length == 1)? "0"+String(element.value.fields.start_date.h):String(element.value.fields.start_date.h))+':00:00';
					let fin = String(element.value.fields.end_date.Y)+'-'+((String(element.value.fields.end_date.M).length == 1)? "0"+String(element.value.fields.end_date.M):String(element.value.fields.end_date.M))+'-'+((String(element.value.fields.end_date.D).length == 1)? "0"+String(element.value.fields.end_date.D):String(element.value.fields.end_date.D))+'T'+((String(element.value.fields.end_date.h).length == 1)? "0"+String(element.value.fields.end_date.h):String(element.value.fields.end_date.h))+':00:00';

					events_array.push({ title: tit, start: ini, end: fin });
				}
			});
			// Render dell'area personale
			res.render('personalArea', {userId: req.session.userId, reservations: reservations.rows, csrfToken: req.csrfToken(), location: req.location, cal_events: events_array, role: req.session.role, access_token: access_token, jsStringify, is_google: is_google});
		}
	})
};

// POST sync reservation on calendar
router.post('/sync_events', function(req, res) {
	var access_token = req.body.access_token;
	console.log('-°-°-°-°-')
	console.log('reser: ', req.body.reservation);
	var ress = JSON.parse(req.body.reservation);

	// Se l'evento non è gia sincronizzato lo sincronizza
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
			}
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
				console.log('----------------------', x);
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
						"is_sync": String(x.id),
						"state": "Active"
					},
					"_rev": ress.value.rev
				});
				couchdb_utils.post_to_couchdb('/db/'+ress.id, to_sync_postData, function(err, response) {
					if (err) {console.log(err)}
					else { res.redirect('/personalArea') }
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
	// Altrimenti lo desincronizza
	else {
		const post_options = {
			hostname: 'www.googleapis.com',
			port: 443,
			path: '/calendar/v3/calendars/primary/events/'+ress.value.fields.is_sync,
			method: 'DELETE',
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
				// var x = JSON.parse(data);
				console.log('----------------------', data, '***********************');
				res.header("Content-Type",'application/json');

				// aggiorna il campo is_sync della prenotazione
				const to_desync_postData = JSON.stringify({
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
						"is_sync": false,
						"state": "Active"
					},
					"_rev": ress.value.rev
				});
				couchdb_utils.post_to_couchdb('/db/'+ress.id, to_desync_postData, function(err, response) {
					if (err) {console.log(err)}
					else { res.redirect('/personalArea') }
				})
			});
		});

		usrs.on('error', error => {
			console.log(error);
			res.status(503);
		});

		usrs.end();
	};
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
				else { res.redirect('/personalArea') }
			})
		}
	})
})

module.exports = router;
