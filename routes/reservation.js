var express = require('express');
var router = express.Router();

  
/* GET reservation page. */
router.get('/', function(req, res) {
    res.render('reservation');
});

module.exports = router;