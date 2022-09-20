// POST
router.post('/sync_events', function(req, res) {
    var access_token = req.body.access_token;
  console.log('-°-°-°-°-')
  console.log('reser: ', req.body.reservations);
  var ress = JSON.parse(req.body.reservations);
  
  var postData_array = [];
  
  ress.forEach(element => {
      console.log(element.value);
      console.log('dip : ', element.value.fields.dep_name + ' - ' + element.value.fields.typology + ' ' + element.value.fields.space_name);
      console.log('inizio : ', element.value.fields.start_date);
      console.log('fine : ', element.value.fields.end_date);
  
      postData_array.push({
          'summary': `${element.value.fields.dep_name + ' - ' + element.value.fields.typology + ' ' + element.value.fields.space_name}`,
          'start': `${String(element.value.fields.start_date.Y)+'-'+((String(element.value.fields.start_date.M).length == 1)? "0"+String(element.value.fields.start_date.M):String(element.value.fields.start_date.M))+'-'+((String(element.value.fields.start_date.D).length == 1)? "0"+String(element.value.fields.start_date.D):String(element.value.fields.start_date.D))+'T'+((String(element.value.fields.start_date.h).length == 1)? "0"+String(element.value.fields.start_date.h):String(element.value.fields.start_date.h))+':00:00'}`,
          'end': `${String(element.value.fields.end_date.Y)+'-'+((String(element.value.fields.end_date.M).length == 1)? "0"+String(element.value.fields.end_date.M):String(element.value.fields.end_date.M))+'-'+((String(element.value.fields.end_date.D).length == 1)? "0"+String(element.value.fields.end_date.D):String(element.value.fields.end_date.D))+'T'+((String(element.value.fields.end_date.h).length == 1)? "0"+String(element.value.fields.end_date.h):String(element.value.fields.end_date.h))+':00:00'}`,
      });
  });

  console.log('*****', JSON.stringify(postData_array));
  console.log('dipiii : ', postData_array[0]);
  // const postData = postData_array;

  const postData = JSON.stringify({
      'summary': 'Google I/O 2015',
      'start': { 'dateTime': '2022-09-28T09:00:00+02:00' },
      'end': { 'dateTime': '2022-09-28T17:00:00+02:00' },
  });

  console.log('QUESTA È POSTDATA \n', postData);
  
  const post_options = {
      hostname: 'www.googleapis.com',
      port: 443,
      path: '/calendar/v3/calendars/primary/events',
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}` },
  };
  // console.log('\n\n --- °°° --- \n\n');

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
          // console.log(x);
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

	// console.log('*****', JSON.stringify(postData_array));
	// console.log('dipiii : ', postData_array[0]);
	// const postData = postData_array;

	// const postData = JSON.stringify({
    //     'summary': 'Google I/O 2015',
    //     'start': { 'dateTime': '2022-09-28T09:00:00+02:00' },
    //     'end': { 'dateTime': '2022-09-28T17:00:00+02:00' },
    // });

	// console.log('QUESTA È POSTDATA \n', postData);
	
	// const post_options = {
	// 	hostname: 'www.googleapis.com',
	// 	port: 443,
	// 	path: '/calendar/v3/calendars/primary/events',
	// 	method: 'POST',
	// 	headers: { Authorization: `Bearer ${access_token}` },
	// };
	// console.log('\n\n --- °°° --- \n\n');

	// var data = "";
	// const usrs = https.request(post_options, out => {
	// 	console.log(`statusCode: ${out.statusCode}`);
	// 	out.setEncoding('utf8');
	// 	out.on('data', d => {
	// 		data += d.toString();
	// 		//process.stdout.write(d);
	// 	});
	// 	out.on('end', function() {
	// 		var x = JSON.parse(data);
	// 		// console.log(x);
	// 		res.header("Content-Type",'application/json');
	// 		res.status(200).send(JSON.stringify(x, null, 4));
	// 	});
	// });

	// usrs.on('error', error => {
	// 	console.log(error);
	// 	res.status(503);
	// });

	// usrs.write(postData);
	// usrs.end();