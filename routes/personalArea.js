var express = require('express');
var router = express.Router();

  
/* GET personal_area page. */
router.get('/', function(req, res) {
    res.render('personalArea');
});

module.exports = router;