const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const createError = require('http-errors');
const csrf = require('csurf');
const cors = require('cors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const Expression = require('couchdb-expression')(session);
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
const db_update = require('./db_update.js');
const couchdb_utils = require('./couchdb_utils.js');
const store = new Expression({
  username: process.env.COUCHDB_USER,     // default value = 'admin'
  password: process.env.COUCHDB_PASSWORD, // default value = 'password'
  hostname: 'couchdb',                    // default value = 'localhost'
  port:     '5984',                       // default value = 5984
  database: 'sessions',                   // default value = 'sessions'
  https:    false                         // default value = false
});
const transporter = nodemailer.createTransport({
  service: 'gmail',
    auth: {
      user: process.env.APP_EMAIL,
      pass: process.env.APP_EMAIL_PASS
    },
});

var infoRouter = require('./routes/info');
var apiRouter = require('./routes/api');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var homeRouter = require('./routes/home');
var adminRouter = require('./routes/admin');
var reservationRouter = require('./routes/reservation');
var personalAreaRouter = require('./routes/personalArea');
var calendarRouter = require('./routes/calendar');
const dayjs = require('dayjs');

var app = express();

app.use(cors());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.set('trust proxy', true);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/node_modules/bootstrap/dist')); // file di bootstrap    .css e .js
app.use(express.static(__dirname + '/node_modules/leaflet/dist'));   // file di leaflet      .css e .js
app.use(express.static(__dirname + '/node_modules'));                // file di fullcalendar .css e .js

app.use(session({
  name: process.env.SESS_NAME,
  proxy: true,
  store: store,
  secret: process.env.SESSION_SECRET,
  sameSite: true,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1800000/* 30 minuti */ },
}));
//app.use(flash());
//flash message middleware
app.use((req, res, next)=>{
  res.locals.message = req.session.message
  delete req.session.message
  next()
})

app.use('/api', apiRouter);
app.use(csrf({cookie:false}));

app.use( function (req, res, next) {
  req.transporter = transporter;
  next();
});

app.use( function (req, res, next) {
  req.location = req.get('host') + req.originalUrl;
  next();
});

app.use('/info', infoRouter);
app.use('/users', usersRouter);
app.use('/', authRouter);
app.use('/home', homeRouter);
app.use('/admin', adminRouter);
app.use('/reservation', reservationRouter);
app.use('/personalArea', personalAreaRouter);
app.use('/calendar', calendarRouter);

/* GET apidoc page. */
app.use("/apidoc", express.static(path.join(__dirname, "/apidoc")));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

const update_seats_availability = schedule.scheduleJob('00 * * * *', function(){
  couchdb_utils.get_from_couchdb('/seats_updates/updated', function(err, response_1){
    if(err){
      const post_data =JSON.stringify({"updated_at": dayjs() });
      couchdb_utils.post_to_couchdb('/seats_updates/updated',post_data,function(err, response){
        if(err){return console.log(err);};
        db_update.seats_and_reservations_get();
        console.log('\n\nDB update run at: ',dayjs(),'\n\n');
      });
    };
    return console.log('\n\nUpdate already done!\n\n');
  });
});

const clean_db_seats_updates = schedule.scheduleJob('59 * * * *', function(){
  couchdb_utils.delete_from_couchdb('/seats_updates/updated', function(err, response){
    if(err){return console.log(err)};
    return console.log(response);
  });
});

const clean_db_expired_sessions = schedule.scheduleJob('30 * * * *', function(){
  couchdb_utils.get_from_couchdb('/sessions/_design/session/_view/expires', function(err, response){
    if (err){return console.log(err)};
    response.rows.forEach(element => {
      if(dayjs(element.value).isBefore(dayjs())){
        couchdb_utils.delete_from_couchdb('/sessions/'+element.key, function(err, response){
          if(err){return console.log(err)};
        });
      };
    });
  });
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});





module.exports = app;
