var express = require('express');
var router = express.Router();
const https = require('node:https');

  
/* GET personal_area page. */
router.get('/', function(req, res) {
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
            res.render('personalArea');
        });
    });
    
    request.on('error', (e) => {
        console.error(e);
        return false;
    });
    request.end();
};

module.exports = router;