var express = require('express');
var router = express.Router();
const https = require('https');

// curl https://www.googleapis.com/calendar/v3/calendars/primary/events?access_token=ya29.a0AVA9y1u6IULm8HKx0qF0avkLb6SRGKdSu4cBW72ffsmmkd5Uhr6WvtYiWiZuBaSPzOJsDzTgKCEbSgGQeFjYeTF6g9n9dRQ4cQ241y2M2SrheFmq5Ua-Lyge_B__to4TviEX-VGKpzBI9H6hoF9wBZplCQCxaCgYKATASAQASFQE65dr8VxfyHNuFSLD26Fj4G_8log0163&timeMin=2022-07-21T09:00:00Z

router.get('/:access_token', function(req, res) {
    const get_options = {
        hostname: 'www.googleapis.com',
        port: 443,
        path: '/calendar/v3/calendars/primary/events?timeMin='+new Date().toISOString(),
        method: 'GET',
        headers: {
            Authorization: `Bearer ${req.params.access_token}`,
        },
    };

    var data = "";
    const usrs = https.request(get_options, out => {
        console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            console.log(x);
            res.header("Content-Type",'application/json');
            res.status(200).send(JSON.stringify(x, null, 4));
        });
    });

    usrs.on('error', error => {
        console.log(error);
        res.status(503);
    });

    usrs.end();
});

router.post('/', function(req, res) {
    const postData = JSON.stringify({
        'summary': 'Google I/O 2015',
        'location': '800 Howard St., San Francisco, CA 94103',
        'description': 'A chance to hear more about Google\'s developer products.',
        'start': {
            'dateTime': '2022-09-28T09:00:00+02:00',
            'timeZone': 'Europe/Rome',
        },
        'end': {
            'dateTime': '2022-09-28T17:00:00+02:00',
            'timeZone': 'Europe/Rome',
        },
        'attendees': [
            {'email': 'lpage@example.com'},
            {'email': 'sbrin@example.com'},
        ],
        'reminders': {
            'useDefault': false,
            'overrides': [
                {'method': 'email', 'minutes': 24 * 60},
                {'method': 'popup', 'minutes': 10},
            ],
        },
    });
    const post_options = {
        hostname: 'www.googleapis.com',
        port: 443,
        path: '/calendar/v3/calendars/primary/events',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${req.body.password}`,
        },
    };

    var data = "";
    const usrs = https.request(post_options, out => {
        console.log(`statusCode: ${out.statusCode}`);
        out.setEncoding('utf8');
        out.on('data', d => {
            data += d.toString();
            //process.stdout.write(d);
        });
        out.on('end', function() {
            var x = JSON.parse(data);
            console.log(x);
            res.header("Content-Type",'application/json');
            res.status(200).send(JSON.stringify(x, null, 4));
        });
    });

    usrs.on('error', error => {
        console.log(error);
        res.status(503);
    });

    usrs.write(postData);
    usrs.end();
});

module.exports = router;