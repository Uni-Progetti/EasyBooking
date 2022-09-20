var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
    res.render('info', {userId: req.session.userId ,csrfToken: req.csrfToken(),location: req.location, role: req.session.role});
});

module.exports = router;