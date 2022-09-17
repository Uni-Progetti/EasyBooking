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

/* Reindirizza al login se non autenticati. */
const redirectLogin = function(req, res, next){
  if(!req.session.userId){
    res.redirect('/login');
  } else {
    next();
  }
}

/* Reindirizza alla home se autenticati. */
const redirectHome = function(req, res, next){
  if(req.session.userId){
    res.redirect('/');
  } else {
    next();
  }
}

router.get('/', function(req,res){
  res.redirect('/home');
});

/* Reindirizza al login con google. */
router.get('/google', redirectHome , function(req, res, next){
  const stringifiedParams = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: 'https://localhost:8083/oauth2callback',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar',
    ].join(' '), // stringhe separate dagli spazi
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  });
  const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${stringifiedParams}`;
  res.redirect(googleLoginUrl);
});

router.get('/oauth2callback', function(req, res, next){
  if(req.query.code){
    //console.log("req.query---->",req.query);
    //console.log("req.query.code---->",req.query.code);
    getToken(req,res,req.query.code);
  } else {
    res.redirect('login');
  };
});

/* GET login page. */
router.get('/login', redirectHome , function(req, res, next) {
    res.render('login',{csrfToken: req.csrfToken(), location: req.location});
});

router.get('/test', function(req, res, next) {
    console.log('esempio di richiesta api');
    res.redirect('/');
});

// curl -kX POST https://localhost:8083/login/password -H 'Content-Type: application/json' -d '{"username":"matteo.manager@gmail.com","password":"Password.0"}'
router.post('/login/password', redirectHome ,function (req, res, next) {
  console.log('richiesta autenticazione con username:');
  console.log(req.body.username);

  const options = {
    hostname: 'couchdb',
    port: 5984,
    path: '/db/'+req.body.username.toLowerCase(),
    method: 'GET',
    auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
  };

  if (req.body.username && req.body.password){ 
    authenticateSession(options,req,res);
  }

});

router.get('/logout', redirectLogin ,function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) { return next(err); }
    res.clearCookie(process.env.SESS_NAME);
    res.redirect('/home');
  });
});

router.post('/logout', redirectLogin ,function(req, res, next) {
    req.session.destroy(function(err) {
      if (err) { return next(err); }
      res.clearCookie(process.env.SESS_NAME);
      res.redirect('/home');
    });
});

router.get('/signup', redirectHome ,function(req, res, next) {
    res.render('signup', {csrfToken: req.csrfToken()});
});

router.post('/signup', redirectHome , function(req, res, next) {
  var passCheck = CheckPassword(req.body.password);
  var emailCheck = CheckEmail(req.body.username);
  if(req.body.username && req.body.password && req.body.password_confirmation && req.body.password_confirmation==req.body.password && passCheck && emailCheck){
    var salt = crypto.randomBytes(16);
    crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256', function(err, hashedPassword) {
      if (err) { return next(err); }
      createUser(req, res, salt, hashedPassword);
    });
  } else if (!(req.body.password_confirmation==req.body.password)){
    console.log("password e password confirmation non coincidono");
    req.session.message = {
      type: 'danger',
      intro: 'Errore credenziali! ',
      message: 'I campi password e password confirmation non coincidono.'
    }
    res.redirect('/signup');
  } else if (!passCheck){
    console.log("password troppo debole");
    req.session.message = {
      type: 'danger',
      intro: 'Password non valida! ',
      message: 'Controlla la password! N.B. La password deve contenere almeno 8 caratteri tra cui un numero, un simbolo, una maiuscola, una minuscola.'
    }
    res.redirect('/signup');
  } else if (!emailCheck){
    console.log("Email non conforme");
    req.session.message = {
      type: 'danger',
      intro: 'Email non valida! ',
      message: 'Controlla email! N.B. Inserisci un indirizzo email valido.'
    }
    res.redirect('/signup');
  } else {
    console.log("Errore di registrazione");
    req.session.message = {
      type: 'danger',
      intro: 'Errore di registrazione! ',
      message: "Si è verificato un errore durante la registrazione! Per favore riprova più tardi."
    }
    res.redirect('/signup');   
  };
});

router.get('/password_recovery', (req, res) =>{
  res.render('recovery',{csrfToken: req.csrfToken()});
});

router.post('/password_recovery', (req, res, next) =>{
  let user_email = req.body.username.toLowerCase();
  const get_options = {
    hostname: 'couchdb',
    port: 5984,
    path: '/db/'+user_email,
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

      if (out.statusCode == 404){
        console.log("email errata");
        req.session.message = {
          type: 'danger',
          intro: 'Credenziali errate! ',
          message: 'Inserisci un indirizzo email valido.'
        }
        return res.redirect('/password_recovery');
      }else{
        crypto.randomBytes(48, function(err, buffer) {
          var token = buffer.toString('hex');
          const postData = JSON.stringify({
            "type": "User",
            "fields": {
              "email": x.fields.email,
              "password": x.fields.password,
              "role": x.fields.role,
              "salt": x.fields.salt,
            },
            "confirmed_at": null,
            "confirmation_expires": null,
            "confirmation_token": x.confirmation_token,
            "password_recovery_token": token,
            "password_recovery_expires_at": dayjs().add(1, 'day'),
            "_rev": x._rev,
            "_id": x._id,
          });
          const post_options = {
            hostname: 'couchdb',
            port: 5984,
            path: '/db/'+user_email,
            method: 'PUT',
            auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            },
          };
        
          const request = http.request(post_options, (out) => {
            console.log(`STATUS: ${res.statusCode}`);
            console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
            out.setEncoding('utf8');
            out.on('data', (chunk) => {
              console.log(`BODY: ${chunk}`);
            });
            out.on('end', () => {
              console.log('No more data in response.');
              queueRegistrationEmail(user_email);
              let msg_options={
                from: 'easybooking.adm@gmail.com',
                to: user_email,
                subject: 'Password dimenticata su EasyBooking!',
                html: `Ciao hai richeisto il reset della password su EasyBooking! Per resettare la password del tuo account clicca sul seguente link <a href=https://localhost:8083/password_recovery_tkn/${token}/${user_email}>Reset password email!</a>`,
              };
              deliverQueuedMessages('registration', req.transporter, msg_options);
              req.session.message = {
                type: 'info',
                intro: ' ',
                message: 'Mail di reset inviata con successo.'
              }
              res.redirect('/login');
            });
          });
          
          request.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            req.session.message = {
              type: 'danger',
              intro: 'Richiesta reset password fallita!',
              message: e.message
            }
            res.redirect('/signup');
          });
          
          // Write data to request body
          request.write(postData);
          request.end();
        });
      }
    });
  });

  usrs.on('error', error => {
    console.error(error);
    res.redirect('/login');
  });

  usrs.end();
});

router.get('/password_recovery_tkn/:token/:userEmail', (req, res) => {
  console.log(req.params.token);
  const get_options = {
    hostname: 'couchdb',
    port: 5984,
    path: '/db/'+req.params.userEmail,
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
      if (x && dayjs().isBefore(x.password_recovery_expires_at)){
        req.session.email = req.params.userEmail;
        return res.redirect('/new_password');
      } else {
        console.log("errore reset password!");
        req.session.message = {
          type: 'danger',
          intro: 'Errore reset password! ',
          message: 'Token non valido.'
        }
        res.redirect('/signup');
      }
    });
  });

  usrs.on('error', error => {
    console.error(error);
  });

  usrs.end();
});

router.get('/new_password', (req, res) =>{
  console.log(req.session.email);
  res.render('recoverytkn',{csrfToken: req.csrfToken()});
});

router.post('/password_recovery_tkn', (req, res) => {
  console.log(req.session.email);
  var passCheck = CheckPassword(req.body.password);
  if(req.body.password && req.body.password_confirmation && req.body.password_confirmation==req.body.password && passCheck){
    const get_options = {
      hostname: 'couchdb',
      port: 5984,
      path: '/db/'+req.session.email,
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
        var salt = crypto.randomBytes(16);
        crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256', function(err, hashedPassword) {
          if (err) { return next(err); }
          const postData = JSON.stringify({
            "type": "User",
            "fields": {
              "email": x.fields.email,
              "password": hashedPassword,
              "role": "user",
              "salt": salt,
            },
            "confirmed_at": dayjs(),
            "confirmation_expires": null,
            "confirmation_token": x.confirmation_token,
            "password_recovery_token": null,
            "password_recovery_expires_at": null,
            "_rev": x._rev,
            "_id": x._id,
          });
          const post_options = {
            hostname: 'couchdb',
            port: 5984,
            path: '/db/'+req.session.email,
            method: 'PUT',
            auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            },
          };
        
          const request = http.request(post_options, (out) => {
            console.log(`STATUS: ${res.statusCode}`);
            out.setEncoding('utf8');
            out.on('data', (chunk) => {
              console.log(`BODY: ${chunk}`);
            });
            out.on('end', () => {
              console.log('No more data in response.');
              req.session.destroy(function(err) {
                if (err) { return next(err); }
                res.clearCookie(process.env.SESS_NAME);
                res.redirect('/login');
              });
            });
          });
          
          request.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            req.session.message = {
              type: 'danger',
              intro: 'Cambio password fallito!',
              message: 'Tentativo di cambio password fallito: '+e.message
            }
            res.redirect('/signup');
          });
          
          // Write data to request body
          request.write(postData);
          request.end();
        });
      });
    });
    
    usrs.on('error', error => {
      console.error(error);
    });
    
    usrs.end();
  } else if (!(req.body.password_confirmation==req.body.password)){
    console.log("password e password confirmation non coincidono");
    req.session.message = {
      type: 'danger',
      intro: 'Errore credenziali! ',
      message: 'I campi password e password confirmation non coincidono.'
    }
    res.redirect('/new_password');
  } else if (!passCheck){
    console.log("password troppo debole");
    req.session.message = {
      type: 'danger',
      intro: 'Password non valida! ',
      message: 'Controlla la password! N.B. La password deve contenere almeno 8 caratteri tra cui un numero, un simbolo, una maiuscola, una minuscola.'
    }
    res.redirect('/new_password');
  } else {
    console.log("Errore generico");
    req.session.message = {
      type: 'danger',
      intro: 'Errore ! ',
      message: "Si è verificato un errore durante la procedura di reset della password! Per favore riprova più tardi."
    }
    res.redirect('/new_password');   
  };
});


/* Gestisce processo di registrazione. */
function createUser(req, res, salt, hashedPassword){
  let user_email = req.body.username.toLowerCase();
  const get_options = {
    hostname: 'couchdb',
    port: 5984,
    path: '/db/'+user_email,
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

      if (out.statusCode == 404){
        crypto.randomBytes(48, function(err, buffer) {
          var token = buffer.toString('hex');
          const postData = JSON.stringify({
            "type": "User",
            "fields": {
              "email": user_email,
              "password": hashedPassword,
              "role": "user",
              "salt": salt,
            },
            "locked": 'false',
            "confirmed_at": null,
            "confirmation_expires": dayjs().add(1, 'day'),
            "confirmation_token": token,
          });
          const post_options = {
            hostname: 'couchdb',
            port: 5984,
            path: '/db/'+user_email,
            method: 'PUT',
            auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            },
          };
        
          const request = http.request(post_options, (out) => {
            console.log(`STATUS: ${res.statusCode}`);
            console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
            out.setEncoding('utf8');
            out.on('data', (chunk) => {
              console.log(`BODY: ${chunk}`);
            });
            out.on('end', () => {
              console.log('No more data in response.');
              queueRegistrationEmail(user_email);
              let msg_options={
                from: 'easybooking.adm@gmail.com',
                to: user_email,
                subject: 'Benvenuto su EasyBooking!',
                html: `Ciao sei registrato su EasyBooking! Per attivare il tuo account clicca sul seguente link <a href="https://localhost:8083/users/verify/${token}/${user_email}">Verifica email!</a>`,
              };
              deliverQueuedMessages('registration', req.transporter, msg_options);
              req.session.message = {
                type: 'info',
                intro: ' ',
                message: 'Registrazione avvenuta con successo.'
              }
              res.redirect('/login');
            });
          });
          
          request.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            req.session.message = {
              type: 'danger',
              intro: 'Registrazione fallita!',
              message: 'Tentativo di registrazione fallito: '+e.message
            }
            res.redirect('/signup');
          });
          
          // Write data to request body
          request.write(postData);
          request.end();
        });

      } else {
        console.log("utente già registrato!");
        req.session.message = {
          type: 'danger',
          intro: 'Email già in uso!',
          message: "L'email inserita è gia in uso ! Per favore inserisci un altro indirizzo mail."
        }
        res.redirect('/signup');
      }
    });
  });

  usrs.on('error', error => {
    console.error(error);
    return null;
  });

  usrs.end();


};

/* Gestisce processo di autenticazione. */
function authenticateSession(options, req, res){
  var data = "";
  const usrs = http.request(options, out => {
    console.log(`statusCode: ${out.statusCode}`);
    out.setEncoding('utf8');
    out.on('data', d => {
      data += d.toString();
      //process.stdout.write(d);
    });
    out.on('end', function() {
      var x = JSON.parse(data);
      console.log(x);

      if (out.statusCode == 404){
        console.log("email errata");
        req.session.message = {
          type: 'danger',
          intro: 'Credenziali errate! ',
          message: 'Controlla email e password.'
        }
        res.redirect('/login');
      }else if(x.fields.password){
        crypto.pbkdf2(req.body.password, Buffer.from(x.fields.salt), 310000, 32, 'sha256', function(err, hashedPassword) {
          if (err) { res.redirect('/login'); }
          if (!crypto.timingSafeEqual(Buffer.from(x.fields.password), hashedPassword)) {
            console.log('credenziali errate');
            req.session.message = {
              type: 'danger',
              intro: 'Credenziali errate! ',
              message: 'Controlla email e password.'
            }
            res.redirect('/login');
            return;
          }
        });
        if(x.confirmed_at == null){
          console.log("Account non attivo");
          req.session.message = {
            type: 'danger',
            intro: 'Account non attivo! ',
            message: 'Controlla la tua email e segui le istruzioni per attivare il tuo account.'
          }
          res.redirect('/login');
          return;
        };
        if(x.locked == "true"){
          console.log("Account bloccato");
          req.session.message = {
            type: 'danger',
            intro: 'Account bloccato! ',
            message: 'Controlla la tua email e segui le istruzioni per sbloccare il tuo account.'
          }
          res.redirect('/login');
          return;
        }
        req.session.userId = req.body.username.toLowerCase();
        req.session.username = req.body.username.toLowerCase();
        req.session.role = x.fields.role;
        console.log('credenziali corrette');
        req.session.message = {
          type: 'info',
          intro: '',
          message: 'Login effettuato correttamente!'
        }
        res.redirect('/home',);
      }else{
        console.log("password errata");
        req.session.message = {
          type: 'danger',
          intro: 'Credenziali errate! ',
          message: 'Controlla email e password.'
        }
        res.redirect('/login');
      }
    });
  });

  usrs.on('error', error => {
    console.error(error);
    res.redirect('/login');
  });

  usrs.end();
};

function CheckPassword(password) { 
  const decimal =  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;
  if(password.match(decimal)) { 
    console.log('password conforme');
    return true;
  } else { 
    console.log('password non conforme');
    return false;
  }
};

function CheckEmail(email) { 
  let regex = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])");
  if(regex.test(email)) { 
    console.log('email conforme');
    return true;
  } else { 
    console.log('email non conforme');
    return false;
  }
};

function getToken(req, res, code){
  const postData = JSON.stringify({
    'client_id': process.env.GOOGLE_CLIENT_ID,
    'client_secret': process.env.GOOGLE_CLIENT_SECRET,
    'redirect_uri': 'https://localhost:8083/oauth2callback',
    'grant_type': 'authorization_code',
    'code': code,
  });
  const options = {
    hostname: 'oauth2.googleapis.com',
    port: 443,
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
  };

  const request = https.request(options, (out) => {
    var bodyData='';
    console.log(`STATUS: ${res.statusCode}`);
    //console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    out.setEncoding('utf8');
    out.on('data', (chunk) => {
      //console.log(`BODY: ${chunk}`);
      bodyData += chunk.toString();
    });
    out.on('end', () => {
      const x = JSON.parse(bodyData);
      console.log('No more data in response.');
      if(x && x.access_token){
        getGoogleEmail(req, res, x.access_token, x.refresh_token);
      } else {
        res.redirect('/login');
      };
    });
  });
  
  request.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    req.session.message = {
      type: 'danger',
      intro: 'Login fallito!',
      message: 'Tentativo di login fallito: '+e.message
    }
    res.redirect('/login');
  });
  
  // Write data to request body
  request.write(postData);
  request.end();
};

function getGoogleEmail(req, res, access_token, refresh_token){
  const options = {
    hostname: 'www.googleapis.com',
    port: 443,
    path: '/oauth2/v2/userinfo',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  };

  var data = "";
  const usrs = https.request(options, out => {
    console.log(`statusCode: ${out.statusCode}`);
    out.setEncoding('utf8');
    out.on('data', d => {
      data += d.toString();
      //process.stdout.write(d);
    });
    out.on('end', function() {
      var x = JSON.parse(data);
      //console.log("\n\n\nTEST GET EMAIL--->",x);
      if(x.email){
        var salt = crypto.randomBytes(16);
        var AddToDB = '';
        crypto.pbkdf2(access_token, salt, 310000, 32, 'sha256', function(err, hashedPassword) {
          if (err) { return next(err); }
          AddToDB = addGoogleUserToDB(x.email, access_token, refresh_token,hashedPassword,salt);
        });
        if(AddToDB && AddToDB=="locked"){
          req.session.message = {
            type: 'danger',
            intro: 'Errore autenticazione!',
            message: 'Il tuo account è stato bloccato da un amministratore, controlla la mail per visualizzare istruzioni sullo sblocco dell\' account.'
          }
          return res.redirect('/login'); 
        }
        req.session.userId = x.email;
        req.session.username = x.email;
        req.session.access_token = access_token;
        req.session.refresh_token = refresh_token;
        req.session.role = "user";
        req.session.message = {
          type: 'info',
          intro: ' ',
          message: 'Login avvenuto con successo.'
        }
        res.redirect('/home');
      }else{
        req.session.message = {
          type: 'danger',
          intro: 'Errore login con Google! ',
          message: 'Errore nella ricezione delle credenziali da Google. Riprova.'
        }
        res.redirect('/login');
      };
    });
  });

  usrs.on('error', error => {
    console.error(error);
    req.session.message = {
      type: 'danger',
      intro: 'Errore login con Google! ',
      message: error.message
    }
    res.redirect('/login');
  });

  usrs.end();

};

function addGoogleUserToDB(email, access_token, refresh_token, hashedPassword, salt){
  console.log("\n\n\n---->",email,"\n\n\n\n");
  const get_options = {
    hostname: 'couchdb',
    port: 5984,
    path: '/db/'+email,
    method: 'GET',
    auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
  };
  console.log("\n\n\n---->",get_options,"\n\n\n\n");

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

      if (out.statusCode==404){
        const postData = JSON.stringify({
          "_id": email,
          "type": "User",
          "fields": {
            "email": email,
            "password": hashedPassword,
            "role": "user",
            "salt": salt,
            "refresh_token": refresh_token,
            "access_token": access_token,
          },
          "locked": 'false',
          "confirmed_at": dayjs(),
          "confirmation_expires": null,
          "confirmation_token": null,
        });
        const options = {
          hostname: 'couchdb',
          port: 5984,
          path: '/db/'+email,
          method: 'PUT',
          auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
        };
      
        const request = http.request(options, (out) => {
          console.log(`STATUS: ${out.statusCode}`);
          console.log(`HEADERS: ${JSON.stringify(out.headers)}`);
          out.setEncoding('utf8');
          out.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
          });
          out.on('end', () => {
            console.log('No more data in response.');
            return true;
          });
        });
        
        request.on('error', (e) => {
          console.error(`problem with request: ${e.message}`);
          return false;
        });
        
        // Write data to request body
        request.write(postData);
        request.end();
      } else {
        console.log("utente già registrato!");
        if(x.locked=='false'){
          const postData = JSON.stringify({
            "_id": x._id,
            "type": "User",
            "fields": {
              "email": x.fields.email,
              "password": x.fields.password,
              "role": "user",
              "salt": x.fields.salt,
              "refresh_token": refresh_token,
              "access_token": access_token,
            },
            "locked": x.locked,
            "confirmed_at": x.confirmed_at,
            "confirmation_expires": x.confirmation_expires,
            "confirmation_token": x.confirmation_token,
            "_rev": x._rev,
          });
          const options = {
            hostname: 'couchdb',
            port: 5984,
            path: '/db/'+email,
            method: 'PUT',
            auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            },
          };
        
          const request = http.request(options, (out) => {
            console.log(`STATUS: ${out.statusCode}`);
            console.log(`HEADERS: ${JSON.stringify(out.headers)}`);
            out.setEncoding('utf8');
            out.on('data', (chunk) => {
              console.log(`BODY: ${chunk}`);
            });
            out.on('end', () => {
              console.log('No more data in response.');
              return true;
            });
          });
          
          request.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            return false;
          });
          
          // Write data to request body
          request.write(postData);
          request.end();
        } else {
          return "locked"
        }
      }
    });
  });

  usrs.on('error', error => {
    console.error(error);
    return null;
  });

  usrs.end();

};

function queueRegistrationEmail(username){
  amqp.connect(process.env.AMQP_URL, function(error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function(error1, channel) {
      if (error1) {
        throw error1;
      }
      var queue = 'registration';
      var msg = process.argv.slice(2).join(' ') || "Registrazione al sito: "+username;
  
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