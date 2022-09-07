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
router.get('/', redirectLogin ,function(req, res) {
    res.render('home', { title: 'Express', userId: req.session.userId ,csrfToken: req.csrfToken(), location: req.location});
});

module.exports = router;