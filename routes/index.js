var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.put('/db', function(req, res, next){
  //curl -X PUT http://127.0.0.1:5984/my_database{"ok":true};

  res.render('index', { title: 'Test DB'});
});

module.exports = router;