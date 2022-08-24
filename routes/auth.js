var express = require('express');
var router = express.Router();
var crypto = require('crypto');
// const { render } = require('../app');
const http = require('http');

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

/* GET login page. */
router.get('/login', redirectHome , function(req, res, next) {
    res.render('login',{csrfToken: req.csrfToken()});
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
    path: '/db/_design/User/_view/credentials?key="'+req.body.username+'"',
    method: 'GET',
    auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD
  };

  if (req.body.username && req.body.password){ 
    authenticateSession(options,req,res);
  }

});

router.post('/logout', redirectLogin ,function(req, res, next) {
    req.session.destroy(function(err) {
      if (err) { return next(err); }
      res.clearCookie(process.env.SESS_NAME);
      res.redirect('/');
    });
});

router.get('/signup', redirectHome ,function(req, res, next) {
    res.render('signup.ejs', {csrfToken: req.csrfToken()});
});

router.post('/signup', redirectHome , function(req, res, next) {
  if(req.body.username && req.body.password && req.body.password_confirmation && req.body.password_confirmation==req.body.password && CheckPasswordAndEmail(req.body.password,req.body.username)){
    var salt = crypto.randomBytes(16);
    crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256', function(err, hashedPassword) {
      if (err) { return next(err); }
      createUser(req, res, salt, hashedPassword);
    });
  } else if (CheckPasswordAndEmail(req.body.password,req.body.username)){
    console.log("password e password confirmation non coincidono");
    req.session.message = {
      type: 'danger',
      intro: 'Errore credenziali! ',
      message: 'I campi password e password confirmation non coincidono.'
    }
    res.redirect('/signup');
  } else {
    console.log("password troppo debole");
    req.session.message = {
      type: 'danger',
      intro: 'Credenziali non valide! ',
      message: 'Controlla email e password! N.B. La password deve contenere almeno 8 caratteri tra cui un numero, un simbolo, una maiuscola, una minuscola.'
    }
    res.redirect('/signup');
  };
});

/* Gestisce processo di registrazione. */
function createUser(req, res, salt, hashedPassword){
  const postData = JSON.stringify({
    "type": "User",
    "fields": {
      "email": req.body.username,
      "password": hashedPassword,
      "role": "user",
      "salt": salt,
    }
  });
  const options = {
    hostname: 'couchdb',
    port: 5984,
    path: '/db/'+req.body.username,
    method: 'PUT',
    auth: process.env.COUCHDB_USER+":"+process.env.COUCHDB_PASSWORD,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
  };

  const request = http.request(options, (out) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    out.setEncoding('utf8');
    out.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
    out.on('end', () => {
      console.log('No more data in response.');
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
      console.log(x.rows.length);

      if (x.rows.length === 0){
        console.log("email errata");
        req.session.message = {
          type: 'danger',
          intro: 'Credenziali errate! ',
          message: 'Controlla email e password.'
        }
        res.redirect('/login');
      }else if( x.rows[0]){
        crypto.pbkdf2(req.body.password, Buffer.from(x.rows[0].value[1]), 310000, 32, 'sha256', function(err, hashedPassword) {
          if (err) { res.redirect('/login'); }
          if (!crypto.timingSafeEqual(Buffer.from(x.rows[0].value[0]), hashedPassword)) {
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
        req.session.userId = req.body.username;
        req.session.username = req.body.username;
        console.log('credenziali corrette');
        req.session.message = {
          type: 'info',
          intro: '',
          message: 'Login effettuato correttamente!'
        }
        res.redirect('/',);
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

function CheckPasswordAndEmail(password,email) { 
  const decimal =  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;
  let regex = new RegExp("([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\"\(\[\]!#-[^-~ \t]|(\\[\t -~]))+\")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])");
  if(password.match(decimal) && regex.test(email)) { 
    console.log('password e mail conforme');
    return true;
  } else { 
    console.log('password o mail non conforme');
    return false;
  }
};

module.exports = router;