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
                    return res.status(200).json({accessToken, refreshToken});
                });
            });           
        }
    });
});

/* curl -d '{"token": "access_token"}' -H "Content-Type: application/json" -H "Authorization: Bearer access_token" -X POST http://localhost:8080/api/logout  */
router.post('/logout', security.authenticateJWT ,function (req, res){
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
router.get('/getDepartments/all', security.authenticateJWT ,function(req, res){
    couchdb_utils.get_from_couchdb('/db/_design/Department/_view/Departments_info', function(err, response){
        if(err){return res.status(404).send({error: err});};
        let output = {};
        response.rows.forEach(element => {
            output [element.key] = element.value.fields;
        });
        //res_json = JSON.parse(res_json);
        const isEmpty = Object.keys(output).lenght === 0;
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
// stampa tutti gli spazi
router.get('/getSpaces/all', function(req, res){
    const get_options = {
        hostname: 'couchdb',
        port: 5984,
        path: '/db/_design/Space/_view/Spaces_info',
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
            x.rows.forEach(element => {
                output [element.key] = element.value.fields;
            });
            const isEmpty = Object.keys(output).length === 0;
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
        res.status(503);
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
        path: '/db/_design/Space/_view/0_All_Spaces',
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
            console.log(x);
            var output = {};
            x.rows.forEach(element => {
                if (element.value.typology == req.params.typology) {
                    output [element.key] = element.value; 
                }
            });
            const isEmpty = Object.keys(output).length === 0;
            if (isEmpty) {
                res.status(404).send({error: "Nessun elemento trovato per la tipologia " + req.params.typology});
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

/**
 * @api {get} /getSeats/all Request all Seats 
 * @apiName GetSeats
 * @apiGroup Seats
 *
 * 
 *
 * @apiSuccess {String} name of the Seat.
 * @apiSuccess {String} info of the Seat.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 * 
        {
            [
                {
                    "id": "24a020e2735a757dd5c996cf3fd400c2",
                    "key": "Dipartimento di Michela",
                    "value": {
                        "typology": "Isola",
                        "space_name": "D",
                        "position": 1,
                        "start_date": {
                            "Y": 2022,
                            "M": 9,
                            "D": 12,
                            "h": 15,
                            "m": 0,
                            "s": 0
                        },
                        "end_date": {
                            "Y": 2022,
                            "M": 9,
                            "D": 12,
                            "h": 16,
                            "m": 0,
                            "s": 0
                        },
                        "state": "Active",
                        "rev": "1-5888c91af04950b7e4261b99fb7c31f4"
                    }
                },
                {
                    "id": "24a020e2735a757dd5c996cf3fd40857",
                    "key": "Dipartimento di Michela",
                    "value": {
                        "typology": "Aula",
                        "space_name": "106",
                        "position": 1,
                        "start_date": {
                            "Y": 2022,
                            "M": 9,
                            "D": 6,
                            "h": 8,
                            "m": 0,
                            "s": 0
                        },
                        "end_date": {
                            "Y": 2022,
                            "M": 9,
                            "D": 6,
                            "h": 9,
                            "m": 0,
                            "s": 0
                        },
                        "state": "Active",
                        "rev": "1-1265afe741f07a277661b658a5635a66"
                    }
                }
            ]
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
// stampa tutti i posti
router.get('/getSeats/all', function(req, res){
    const get_options = {
        hostname: 'couchdb',
        port: 5984,
        path: '/db/_design/Seat/_view/0_All_Seats',
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
            console.log(x);
            res.header("Content-Type",'application/json');
            res.status(200).send(JSON.stringify(x, null, 4));
        });
    });

    usrs.on('error', error => {
        console.log(error);
        res.status(503);
    });

    usrs.end();
});


// stampa tutti i posti di un dato spazio
router.get('/getSeats/:typology/:space_name', function(req, res) {
    const get_options = {
        hostname: 'couchdb',
        port: 5984,
        path: '/db/_design/Seat/_view/Seats_By_Typology',
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
            console.log(x);
            var output = {};
            x.rows.forEach(element => {
                if (element.value.typology == req.params.typology && element.value.space_name == req.params.space_name) {
                    output [element.key] = element.value;
                }
            });
            const isEmpty = Object.keys(output).length === 0;
            if (isEmpty) {
                res.status(404).send({error: "Nessun elemeneto trovato per lo spazio " + req.params.typology + " " + req.params.space_name});
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
})


// stampa le mie prenotazioni
// elimina prenotazioni
// stampa utenti (se sei admin)

module.exports = router;