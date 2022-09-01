var express = require('express');
var router = express.Router();
var crypto = require('crypto');
// const { render } = require('../app');
const http = require('http');
const https = require('https');
const dayjs = require('dayjs');

let users = {
  1: {
    id: '1',
    username: 'Robin Wieruch',
  },
  2: {
    id: '2',
    username: 'Dave Davids',
  },
};

let messages = {
  1: {
    id: '1',
    text: 'Hello World',
    userId: '1',
  },
  2: {
    id: '2',
    text: 'By World',
    userId: '2',
  },
};

/* GET users listing. */
router.get('/', (req, res) => {
  return res.send(Object.values(users));
});

router.get('/:userId', (req, res) => {
  // return res.send(users[req.params.userId]);
  return res.status(200).json({id: '2', username: 'Dave Davids'});  // per test
});
 /* GET users account verification */
router.get('/verify/:token/:userEmail', (req, res) => {
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
      if (x && dayjs().isBefore(x.confirmation_expires)){
        const postData = JSON.stringify({
          "_id": x._id,
          "_rev": x._rev,
          "type": "User",
          "fields": {
            "email": x._id,
            "password": x.fields.password,
            "role": x.fields.role,
            "salt": x.fields.salt,
          },
          "confirmed_at": dayjs(),
          "confirmation_expires": null,
          "confirmation_token": x.confirmation_token,
        });
        const post_options = {
          hostname: 'couchdb',
          port: 5984,
          path: '/db/'+req.params.userEmail,
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
            req.session.message = {
              type: 'info',
              intro: ' ',
              message: 'Attivazione account avvenuta con successo.'
            }
            res.redirect('/login');
          });
        });
        
        request.on('error', (e) => {
          console.error(`problem with request: ${e.message}`);
          req.session.message = {
            type: 'danger',
            intro: 'Registrazione fallita!',
            message: 'Tentativo di attivazione account fallito: '+e.message
          }
          res.redirect('/signup');
        });
        
        // Write data to request body
        request.write(postData);
        request.end();

      } else {
        console.log("errore attivazione!");
        res.redirect('/signup');
      }
    });
  });

  usrs.on('error', error => {
    console.error(error);
  });

  usrs.end();
});

router.post('/', (req, res) => {
  return res.send('POST HTTP method on user resource');
});

router.put('/:userId', (req, res) => {
  return res.send(
    `PUT HTTP method on user/${req.params.userId} resource`,
  );
});

router.delete('/:userId', (req, res) => {
  return res.send(
    `DELETE HTTP method on user/${req.params.userId} resource`,
  );
});

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

module.exports = router;
