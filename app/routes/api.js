var express = require('express');
var router = express.Router();
var crypto = require('crypto');
// const { render } = require('../app');
const http = require('http');
const https = require('https');
const amqplib = require('amqplib');
const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5673';
var amqp = require('amqplib/callback_api');
const dayjs = require('dayjs');
const jwt = require('jsonwebtoken');
const security = require('./../security.js');
const couchdb_utils = require('./../couchdb_utils.js');

/* curl -d '{"username": "matteo.user@gmail.com", "password": "Password.0"}' -H "Content-Type: application/json" -X POST http://localhost:8080/api/login */
router.post('/login', function (req, res) {
    const { username, password } = req.body;
    couchdb_utils.get_from_couchdb('/db/'+username, function(err, response){
        if (err){
            return res.status(500).send({error: err});
        } else {
            crypto.pbkdf2(password, Buffer.from(response.fields.salt), 310000, 32, 'sha256', function(err, hashedPassword){
                if (err){
                    return res.status(500).send({error: err});
                }
                if (!crypto.timingSafeEqual(Buffer.from(response.fields.password), hashedPassword)) {
                    console.log('credenziali errate');
                    return res.status(401).send({error: "Wrong credentials!"});
                }
                const accessToken = jwt.sign({ username: username,  role: response.fields.role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '20m' });
                const refreshToken = jwt.sign({ username: username,  role: response.fields.role }, process.env.REFRESH_TOKEN_SECRET);
                const post_data =JSON.stringify({"owner": username ,"refresh_token": refreshToken, "iat": dayjs() });
                couchdb_utils.update_or_create_to_couchdb("/refresh_tokens/"+accessToken, post_data, function(err, response){
                    if (err){ return res.status(500).send({error: err}); };
                    req.session.username = username;
                    return res.status(200).json({accessToken, refreshToken});
                });
            });
        }
    });
});

/* curl -d '{"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im1hdHRlby51c2VyQGdtYWlsLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjYzMjM3MDcxLCJleHAiOjE2NjMyMzgyNzF9.HMKEU7CH5beELE8mMgHvspXv8P5tNYJYjV2RJv1ESaI"}' -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im1hdHRlby51c2VyQGdtYWlsLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjYzMjM3MDcxLCJleHAiOjE2NjMyMzgyNzF9.HMKEU7CH5beELE8mMgHvspXv8P5tNYJYjV2RJv1ESaI" -X POST http://localhost:8080/api/logout  */
router.post('/logout', security.authenticateJWT ,function (req, res){
    console.log(req.session.username);
    const { token } = req.body;
    console.log(token);
    couchdb_utils.delete_from_couchdb("/refresh_tokens/"+token, function(err, response){
        if (err){return res.status(500).send({error: "Logout error: Refresh Token not removed"})};
        return res.send("Logout successful");
    });
});

/**
 * @api {get} /api/getDepartments/all Request All Departments information
 * @apiName GetDepartments
 * @apiGroup Department
 *
 * 
 *
 * @apiSuccess {String} name name of the Department.
 * @apiSuccess {String} manager manager of the Department.
 * @apiSuccess {String} floor floor of the Department.
 * @apiSuccess {String} via via of the Department.
 * @apiSuccess {String} civico civico of the Department.
 * @apiSuccess {String} cap cap of the Department.
 * @apiSuccess {String} citta citta of the Department.
 * @apiSuccess {String} provincia provincia of the Department.
 * @apiSuccess {String} latitude latitude of the Department.
 * @apiSuccess {String} longitude longitude of the Department.
 * @apiSuccess {String} description description of the Department.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
    {
        "Dipartimento di Donia": {
            "name": "Dipartimento di Donia",
            "manager": "donia.manager@gmail.com",
            "floors": 4,
            "number_of_spaces": 4,
            "via": "Via mura dei francesi",
            "civico": "10",
            "cap": "00043",
            "citta": "Ciampino",
            "provincia": "RM",
            "latitude": "41.80299",
            "longitude": "12.59893",
            "description": "Per gestire o testare questo dipartimento accedi come 'donia.manager@gmail.com'"
        },
        "Dipartimento di Francesco": {
            "name": "Dipartimento di Francesco",
            "manager": "fra.manager@gmail.com",
            "floors": 4,
            "number_of_spaces": 4,
            "via": "Piazzale Aldo Moro",
            "civico": "5",
            "cap": "00185",
            "citta": "Roma",
            "provincia": "RM",
            "latitude": "41.9012777",
            "longitude": "12.5145879",
            "description": "Per gestire o testare questo dipartimento accedi come 'fra.manager@gmail.com'"
        }
    }
 *
 * @apiError UserNotFound The id of the User was not found.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Nessun Dipartimento trovato"
 *     }
 */

/* curl http://localhost:8080/api/getDepartments/all -H "Authorization: Bearer access_token" */
// stampa dipartimenti
router.get('/getDepartments/all' ,function(req, res){
    couchdb_utils.get_from_couchdb('/db/_design/Department/_view/All_Departments', function(err, response){
        if(err){return res.status(404).send({error: err});};
        let output = {};
        response.rows.forEach(element => {
            output [element.key] = element.value.fields;
        });
        // res_json = JSON.parse(res_json);
        const isEmpty = Object.keys(output).length === 0;
        if (isEmpty){
            res.status(404).send({error: "Nessun Dipartimento trovato"});
        } else {
            res.header("Content-Type",'application/json');
            res.status(200).send(JSON.stringify(output, null, 4));
        }
    });
});

/**
 * @api {get} /api/getSpaces/all Request All Spacess information
 * @apiName GetSpaces
 * @apiGroup Spaces
 *
 * 
 *
 * @apiSuccess {String} name of the Space.
 * @apiSuccess {String} info of the Space.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *           "total_rows": 20,
 *           "offset": 0,
 *           "rows": [
 *               {
 *                   "id": "24a020e2735a757dd5c996cf3f4944fc",
 *                   "key": "106",
 *                   "value": {
 *                       "typology": "Aula",
 *                       "dep_name": "Dipartimento di Matteo",
 *                       "number_of_seats": 4,
 *                       "rev": "1-331117824a1cd0bf38b0b6b590ecc580"
 *                   }
 *               },
 *               {
 *                   "id": "24a020e2735a757dd5c996cf3f49c7fe",
 *                   "key": "106",
 *                   "value": {
 *                       "typology": "Aula",
 *                       "dep_name": "Dipartimento di Michela",
 *                       "number_of_seats": 4,
 *                       "rev": "1-9117b7c941553cc65d4bc6f71a71b08c"
 *                   }
 *               },
 *           ]
 *       }
 *
 * @apiError NotFound No Space was found.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Nessuno Spazio trovato"
 *     }
 */
// stampa tutti gli spazi: tipologia, nome e dipartimento
router.get('/getSpaces/all', function(req, res){
    const get_options = {
        hostname: 'couchdb',
        port: 5984,
        path: '/db/_design/Space/_view/All_Spaces_keys',
        method: 'GET',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
    };

    var data = "";
    const usrs = http.request(get_options, out => {
        console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            let output = {};
            let isEmpty = Object.keys(output).length === 0;
            x.rows.forEach(element => {
                isEmpty = Object.keys(output).length === 0;
                if(isEmpty || !(element.key in output)){
                    let typology_key = element.value.typology;
                    let output_value = {};
                    output_value[typology_key] = [element.value.name];
                    output [element.key] = output_value;
                } else {
                    let old_obj = output[element.key];
                    if(element.value.typology in old_obj){
                        let old_obj_val = old_obj[element.value.typology];
                        old_obj_val.push(element.value.name);
                        old_obj [element.value.typology] = old_obj_val.sort();
                        output [element.key] = old_obj;
                    } else {
                        old_obj [element.value.typology] = [element.value.name];
                        output [element.key] = old_obj;
                    }
                }
            });
            isEmpty = Object.keys(output).length === 0;
            if (isEmpty) {
                res.status(404).send({error: "Nessuno spazio trovato"});
            }
            else {
                res.header("Content-Type",'application/json');
                res.status(200).send(JSON.stringify(output, null, 4));
            }

            // res.status(200).send(x);
        });
    });

    usrs.on('error', error => {
        console.log(error);
        return res.status(503);
    });

    usrs.end();
});

/**
 * @api {get} /getSpaces/:typology Request Spaces information for that specific typology
 * @apiParam {String} typology Space typology (ex. Aula, Laboratorio, Isola )
 * @apiName GetSpacesTypology
 * @apiGroup Spaces
 *
 * 
 *
 * @apiSuccess {String} name of the Space.
 * @apiSuccess {String} info of the Space.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
    {
        "106": {
            "typology": "Aula",
            "dep_name": "Dipartimento di Francesco",
            "number_of_seats": 4,
            "rev": "1-c15c271bfe56e4d74a78d049a0179425"
        },
        "204": {
            "typology": "Aula",
            "dep_name": "Dipartimento di Michela",
            "number_of_seats": 8,
            "rev": "1-9d9197a3186a799b7a1b7ef455d24e67"
        }
    }
 *
 * @apiError NotFound No Space was found.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Nessun elemento trovato per la tipologia ${typology}"
 *     }
 */
// stampa tutti gli spazi per tipologia
router.get('/getSpaces/:typology', function(req, res){
    const get_options = {
        hostname: 'couchdb',
        port: 5984,
        path: '/db/_design/Space/_view/All_Spaces_keys',
        method: 'GET',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
    };

    var data = "";
    const usrs = http.request(get_options, out => {
        console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            let output = {};
            let isEmpty = Object.keys(output).length === 0;
            let tip = req.params.typology;
            console.log(tip);
            x.rows.forEach(element => {
                isEmpty = Object.keys(output).length === 0;
                console.log(element.value.typology);
                if((isEmpty || (!(element.key in output))) && element.value.typology == tip){
                    let typology_key = element.value.typology;
                    let output_value = {};
                    output_value [typology_key] = [element.value.name];
                    output [element.key] = output_value;
                } else if (element.value.typology == tip){
                    let old_obj = output[element.key];
                    if(element.value.typology in old_obj){
                        let old_obj_val = old_obj[element.value.typology];
                        old_obj_val.push(element.value.name);
                        old_obj [element.value.typology] = old_obj_val.sort();
                        output [element.key] = old_obj;
                    } else {
                        old_obj [element.value.typology] = [element.value.name];
                        output [element.key] = old_obj;
                    }
                }
            });
            isEmpty = Object.keys(output).length === 0;
            if (isEmpty) {
                res.status(404).send({error: "Nessuno spazio trovato per la tipologia: "+tip});
            }
            else {
                res.header("Content-Type",'application/json');
                res.status(200).send(JSON.stringify(output, null, 4));
            }

        });
    });

    usrs.on('error', error => {
        console.log(error);
        res.status(503);
    });

    usrs.end();
});

// effettua una prenotazione

// stampa le mie prenotazioni
router.get('/getReservations', security.authenticateJWT ,function(req, res){
    const get_options = {
        hostname: 'couchdb',
        port: 5984,
        path: '/db/_design/Reservation/_view/All_Reservations',
        method: 'GET',
        auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
    };

    var data = "";
    const usrs = http.request(get_options, out => {
        console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            let output = {};
            let isEmpty = Object.keys(output).length === 0;
            let usr_email = req.user.username;
            x.rows.forEach(element => {
                let department_key = element.value.fields.dep_name;
                let element_email = element.value.fields.email;
                let element_format = {
                    "Spazio": element.value.fields.typology+' - '+element.value.fields.space_name,
                    "Posto": element.value.fields.position,
                    "Inizio": (((element.value.fields.start_date.D).length == 1)? "0"+(element.value.fields.start_date.D):(element.value.fields.start_date.D))+'/'+(((element.value.fields.start_date.M).length == 1)? "0"+(element.value.fields.start_date.M):(element.value.fields.start_date.M))+'/'+element.value.fields.start_date.Y+' - '+(((element.value.fields.start_date.h).length == 1)? "0"+(element.value.fields.start_date.h):(element.value.fields.start_date.h))+':'+(((element.value.fields.start_date.m).length == 1)? "0"+(element.value.fields.start_date.m):(element.value.fields.start_date.m))+':'+(((element.value.fields.start_date.s).length == 1)? "0"+(element.value.fields.start_date.s):(element.value.fields.start_date.s)),
                    "Fine": (((element.value.fields.end_date.D).length == 1)? "0"+(element.value.fields.end_date.D):(element.value.fields.end_date.D))+'/'+(((element.value.fields.end_date.M).length == 1)? "0"+(element.value.fields.end_date.M):(element.value.fields.end_date.M))+'/'+element.value.fields.end_date.Y+' - '+(((element.value.fields.end_date.h).length == 1)? "0"+(element.value.fields.end_date.h):(element.value.fields.end_date.h))+':'+(((element.value.fields.end_date.m).length == 1)? "0"+(element.value.fields.end_date.m):(element.value.fields.end_date.m))+':'+(((element.value.fields.end_date.s).length == 1)? "0"+(element.value.fields.end_date.s):(element.value.fields.end_date.s))
                };
                isEmpty = Object.keys(output).length === 0;
                if((isEmpty || (!(department_key in output))) && element_email == usr_email){
                    output[department_key] = [element_format];
                }
                else if (element_email == usr_email){
                    let old_obj = output[department_key];
                    old_obj.push(element_format);
                    output[department_key] = old_obj;
                }
            });
            isEmpty = Object.keys(output).length === 0;
            if (isEmpty) {
                res.header("Content-Type",'application/json');
                res.status(200).send(JSON.stringify({message: "Nessuna prenotazione trovata"}, null, 4));
            }
            else {
                res.header("Content-Type",'application/json');
                res.status(200).send(JSON.stringify(output, null, 4));
            }

            // res.status(200).send(x);
        });
    });

    usrs.on('error', error => {
        console.log(error);
        return res.status(503);
    });

    usrs.end();
});

/* curl -d '{"email": "matteo.user@gmail.com","dep_name": "Dipartimento di Matteo", "typology": "Aula", "space_name": "106", "start_date": {"Y": "2022", "M": "9", "D": "14", "h": "9" }}' -H "Content-Type: application/json" -X POST http://localhost:8080/api/make_res  */
router.post('/make_res', function(req, res){
    var _rev = null;
    var _id = '';
    var position = '';
    var body_template = {"email": "matteo.user@gmail.com","dep_name": "Dipartimento di Matteo", "typology": "Aula", "space_name": "106", "start_date": {"Y": "2022", "M": "9", "D": "14", "h": "9" }};
    var check_body = security.check_body(body_template, req.body);
    console.log(req.body, check_body);
    if (check_body != true){
        return res.status(403).send(check_body);
    }
    couchdb_utils.get_from_couchdb('/db/_design/Seat/_view/Active_Seats', function(err_1, response){
        if(err_1){return console.log(err_1+"ricerca view");};
        if(response.rows.length == 0){
            console.log('active seat not found!');
            return res.status(404).send(JSON.stringify({error:'No reservable seat found!'}, null, 4));
        } else {
            var error = null;
            var result = null;
            var element = null;
            response.rows.forEach(element_seat => {
                if(element_seat.key.dep_name == req.body.dep_name && element_seat.key.typology == req.body.typology && element_seat.key.space_name == req.body.space_name && element_seat.value.fields.start_date.Y == req.body.start_date.Y && element_seat.value.fields.start_date.M == req.body.start_date.M && element_seat.value.fields.start_date.D == req.body.start_date.D && element_seat.value.fields.start_date.h == req.body.start_date.h){
                    element = element_seat;
                };
            });
            if(!element){
                return res.status(404).send(JSON.stringify({error: "Seat not found!"}, null, 4));
            } else {
                var prom = new Promise((resolve, reject) => {
                    console.log(element, "ELEMENT DELLA PROMISE")
                    space_is_full(element.key.space_name, element.key.dep_name, element.key.typology, element.value._id, function(err_2, response_2){
                        console.log("RESPONSE DI SPACE IS FULL",response_2);
                        if(err_2){console.log(err_2); error = {error:err_2}; return resolve(error)};
                        if(response_2 == true){
                            error = {error:'No seats available for that date!'};
                            return resolve(error)
                        } else {
                            date_already_reserved(req.body.start_date, req.body.email, function(err_3, response_3){
                                console.log("RESPONSE DI DATE ALREADY RESERVED",response_3);
                                if(err_3){console.log(err_3); error = {error:err_3}; return resolve(error)};
                                if(response_3 == true){
                                    console.log(response_2, response_3);
                                    error = {error:'Already have a reservation for that date!'};
                                    return resolve(error);
                                } else {
                                    console.log("RAMO ELSE DI DATE ALREADY RESERVED",element);
                                    return resolve(element);
                                }
                            });
                        }
                    });
                });
                
                prom.then((output) => {
                    console.log(output);
                    if(output.error){
                        console.log("output.error")
                        return res.status(403).send(output);
                    } else {
                        console.log("_rev DI PROM.THEN", element);
                        _rev = output.value._rev;
                        _id = output.value._id;
                        position = output.value.fields.position;
                        var pos = parseInt(position);
                        pos += 1;
                        const increase_st_position_postData = JSON.stringify({
                            "key": { dep_name: req.body.dep_name, typology: req.body.typology, space_name: req.body.space_name },
                            "type": "Seat",
                            "fields": {
                                "position": pos,
                                "start_date": {
                                    "Y": parseInt(req.body.start_date.Y),
                                    "M": parseInt(req.body.start_date.M),
                                    "D": parseInt(req.body.start_date.D),
                                    "h": parseInt(req.body.start_date.h),
                                    "m": 0,
                                    "s": 0
                                },
                                "end_date": {
                                    "Y": parseInt(req.body.start_date.Y),
                                    "M": parseInt(req.body.start_date.M),
                                    "D": parseInt(req.body.start_date.D),
                                    "h": (parseInt(req.body.start_date.h)+1),
                                    "m": 0,
                                    "s": 0
                                },
                                "state": "Active"
                            },
                        });
                        //console.log(increase_st_position_postData);
                        couchdb_utils.update_or_create_to_couchdb('/db/'+_id, increase_st_position_postData, function(err_4, response_4) {
                            if (err_4) {console.log(err_4); error = {error:err_4}; return res.send(err_4);}
                            else {
                                console.log("SEAT POSITION INCREASED: "+_id);
                                // Crea la prenotazione
                                const make_res_postData = JSON.stringify({
                                    "key": _id+"Reservation"+position,
                                    "type": "Reservation",
                                    "fields": {
                                        "email": req.body.email,
                                        "dep_name": req.body.dep_name,
                                        "typology": req.body.typology,
                                        "space_name": req.body.space_name,
                                        "seat_id": _id,
                                        "seat_number": position,
                                        "start_date": {
                                            "Y": parseInt(req.body.start_date.Y),
                                            "M": parseInt(req.body.start_date.M),
                                            "D": parseInt(req.body.start_date.D),
                                            "h": parseInt(req.body.start_date.h),
                                            "m": 0,
                                            "s": 0
                                        },
                                        "end_date": {
                                            "Y": parseInt(req.body.start_date.Y),
                                            "M": parseInt(req.body.start_date.M),
                                            "D": parseInt(req.body.start_date.D),
                                            "h": (parseInt(req.body.start_date.h)+1),
                                            "m": 0,
                                            "s": 0
                                        },
                                        "state": "Active"
                                    }
                                });
                                couchdb_utils.post_to_couchdb('/db/'+_id+"Reservation"+position, make_res_postData, function(err_5, response_5) {
                                    if (err_5) {console.log(err_5); error = {error:err_5}; return res.send(err_5);}
                                    else {
                                        console.log("RESERVATION CREATED: "+'/db/'+_id+"Reservation"+position); 
                                        result = {message:'Prenotazione effettuata con successo', reservation_id: _id+"Reservation"+position};
                                        console.log(result);
                                        return res.send(result);
                                    }
                                })                        
                            }
                        })
                    }
                });
            }
        }
    });
});

function space_is_full( space_name, dep_name, typology, seat_id,callback ){
    couchdb_utils.get_from_couchdb('/db/_design/Space/_view/All_Spaces', function(err, response){
        if(err){return callback(err, null)};
        var total_seats = null;
        if(response.rows.length == 0){
            return callback({error:"Space not found!"}, null);
        }
        response.rows.forEach(element => {
            if(element.key.name == space_name && element.key.dep_name == dep_name && element.key.typology == typology){
                total_seats = element.value.fields.number_of_seats;
                console.log(element.key+" FUNZIONE SPACE IS FULL");
            }
        });
        if(total_seats){
            couchdb_utils.get_from_couchdb('/db/'+seat_id, function(err, response_2){
                if(err){return callback(err, null)};
                if(parseInt(response_2.fields.position) > parseInt(total_seats)){
                    return callback(null, true);
                } else {
                    return callback(null, false);
                }
            });
        } else {
            return callback({error:"Space not found!"}, null);
        }
    });
};

function date_already_reserved(start_date, username, callback){
    couchdb_utils.get_from_couchdb('/db/_design/Reservation/_view/All_Reservations', function(err, response){
        if(err){return callback(err, null)};
        if(response.rows.length == 0){
            return callback(null, false);
        } else {
            var reserved = false;
            var prom = new Promise((resolve, reject) => {
                response.rows.forEach(element => {
                    console.log('\nentrato nel ciclo\n');
                    if(element.value.fields.email == username && element.value.fields.start_date.Y == start_date.Y && element.value.fields.start_date.M == start_date.M && element.value.fields.start_date.D == start_date.D && element.value.fields.start_date.h == start_date.h){
                        reserved = true;
                        return resolve(reserved);
                    }
                });
                resolve(false);
            });
            
            prom.then((reserved) => {
                console.log('All done! DATE_ALREADY_RESERVED');
                return callback(null, reserved);
            });
        }
    })
}

// elimina prenotazioni

module.exports = router;