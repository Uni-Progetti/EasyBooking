var express = require('express');
var router = express.Router();

/* Reindirizza al login se non autenticati. */
const redirectLogin = function(req, res, next){
  if(!req.session.userId){
    res.redirect('/login');
  } else {
    next();
  }
}

/* GET home page. */
router.get('/', redirectLogin ,function(req, res, next) {
  // Cookies that have not been signed
  const { userId } = req.session;
  console.log('Cookies: ', req.cookies)
  console.log('userId: ', req.session.userId)

  // Cookies that have been signed
  console.log('Signed Cookies: ', req.signedCookies);
  res.render('index', { title: 'Express', userId: req.session.userId ,csrfToken: req.csrfToken(), location: req.location, role: req.session.role});
});

/* GET map page. */
router.get('/map', redirectLogin ,function(req, res, next) {
  // Cookies that have not been signed
  const { userId } = req.session;
  console.log('Cookies: ', req.cookies)
  console.log('userId: ', req.session.userId)

  // Cookies that have been signed
  console.log('Signed Cookies: ', req.signedCookies);
  res.render('map.ejs', { title: 'Map', userId: req.session.userId ,csrfToken: req.csrfToken()});
});

module.exports = router;