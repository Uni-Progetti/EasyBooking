const dotenv = require('dotenv').config()
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
const store = new Expression({
  username: process.env.COUCHDB_USER,         // default value = 'admin'
  password: process.env.COUCHDB_PASSWORD,     // default value = 'password'
  hostname: 'couchdb',    // default value = 'localhost'
  port: '5984',             // default value = 5984
  database: 'sessions',     // default value = 'sessions'
  https: false              // default value = false
});
const transporter = nodemailer.createTransport({
  service: 'gmail',
    auth: {
      user: process.env.APP_EMAIL,
      pass: process.env.APP_EMAIL_PASS,
    },
});


var apiRouter = require('./routes/api');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var homeRouter = require('./routes/home');
var reservationRouter = require('./routes/reservation');
var personalAreaRouter = require('./routes/personalArea');

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
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/node_modules/bootstrap/dist'));// file di bootstrap .css e .js
app.use(express.static(__dirname + '/node_modules/leaflet/dist'));// file di leaflet .css e .js
app.use(express.static(__dirname + '/node_modules'));// file di fullcalendar .css e .js

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
app.use(csrf());

app.use( function (req, res, next) {
  req.transporter = transporter;
  next();
});


app.use('/api', apiRouter);
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/', authRouter);
app.use('/home', homeRouter);
app.use('/reservation', reservationRouter);
app.use('/personalArea', personalAreaRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
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
