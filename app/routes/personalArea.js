var express = require('express');
var router = express.Router();
const https = require('node:https');

/* Reindirizza al login se non autenticati. */
const redirectLogin = function(req, res, next){
    if(!req.session.userId){
      res.redirect('/login');
    } else {
      next();
    }
}

  
/* GET personal_area page. */
router.get('/', redirectLogin ,function(req, res) {
    getCalendarEvents(req, res, req.session.access_token, '', '');
});

function getCalendarEvents(req, res, access_token , calendar, start_date){
    let data = '';
    const options = {
        hostname: 'www.googleapis.com',
        port: 443,
        path: '/calendar/v3/calendars/primary/events',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      };
      
    const request = https.request(options, (response) => {
        console.log('statusCode:', response.statusCode);
        console.log('headers:', response.headers);
        
        response.on('data', (d) => {
            //process.stdout.write(d);
            data+=d.toString();
        });

        response.on('end', (end) =>{
            //let parsed_data = JSON.parse(data);
            console.log(data);
            res.render('personalArea',{userId: req.session.userId ,csrfToken: req.csrfToken(),location: req.location});
        });
    });
    
    request.on('error', (e) => {
        console.error(e);
        return false;
    });
    request.end();
};

module.exports = router;