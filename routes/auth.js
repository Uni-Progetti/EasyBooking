var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local');
var crypto = require('crypto');
const { render } = require('../app');
const nano = require('nano')('http://admin:secret@couchdb:5984');
var db = nano.db.use('users')

passport.use(new LocalStrategy(function verify(username, password, cb) {
    db.get( username , function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false, { message: 'Incorrect username or password.' }); }
      //console.log(user._id.toString());
      //console.log(user.hashed_password.data);
      crypto.pbkdf2(password, Buffer.from(user.salt.data), 310000, 32, 'sha256', function(err, hashedPassword) {
        if (err) { return cb(err); }
        if (!crypto.timingSafeEqual(Buffer.from(user.hashed_password.data), hashedPassword)) {
          return cb(null, false, { message: 'Incorrect username or password.' });
        }
        //console.log("\n\n",user.email,"\n\n");
        return cb(null, user);
      });
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

router.post('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
});

router.get('/signup', function(req, res, next) {
    res.render('signup.ejs');
});

router.post('/signup', function(req, res, next) {
    var salt = crypto.randomBytes(16);
    crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256', function(err, hashedPassword) {
      if (err) { return next(err); }
      const doc ={ _id: req.body.username ,email: req.body.username, hashed_password: hashedPassword, salt: salt };
      db.insert( doc , function(err) {
        if (err) { return next(err); }
        var user = {
          id: this.lastID,
          username: req.body.username
        };
        req.login(user, function(err) {
          if (err) { return next(err); }
          res.redirect('/');
        });
      });
    });
});

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
        console.log("\n\n\n---> ",user.email," <---\n\n\n");
        cb(null, { id: user._id, username: user.email });
    });
});
  
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user);
    });
});

module.exports = router;