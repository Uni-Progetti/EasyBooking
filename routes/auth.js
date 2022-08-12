var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local');
var crypto = require('crypto');
const { render } = require('../app');
const nano = require('nano')('http://admin:secret@couchdb:5984');
// var db = nano.db.use('users')

passport.use(new LocalStrategy(function verify(username, password, cb) {
    db.get(username.toString(), (err, data) => {
        // errors are in 'err' & response is in 'data'
        if(err){
            console.log("\n\n\nErrore ",err,"\n\n\n");
            return cb(err);
        }else{
            console.log("\n\n\n",data.hashed_password,"\n\n\n");
            return cb(null, false, { message: 'Incorrect username or password.' });
        }
    });
}));

/* GET login page. */
router.get('/login', function(req, res, next) {
    res.render('login');
});

router.post('/login/password', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

passport.use(new LocalStrategy(function verify(username, password, cb) {
    db.get('SELECT * FROM users WHERE username = ?', [ username ], function(err, row) {
      if (err) { return cb(err); }
      if (!row) { return cb(null, false, { message: 'Incorrect username or password.' }); }
  
      crypto.pbkdf2(password, row.salt, 310000, 32, 'sha256', function(err, hashedPassword) {
        if (err) { return cb(err); }
        if (!crypto.timingSafeEqual(row.hashed_password, hashedPassword)) {
          return cb(null, false, { message: 'Incorrect username or password.' });
        }
        return cb(null, row);
      });
    });
}));

module.exports = router;