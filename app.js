const dotenv = require('dotenv').config()
var createError = require('http-errors');
var csrf = require('csurf');
var cors = require('cors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
//var flash = require('express-flash');
var session = require('express-session');
const Expression = require('couchdb-expression')(session);
const store = new Expression({
  username: process.env.COUCHDB_USER,         // default value = 'admin'
  password: process.env.COUCHDB_PASSWORD,     // default value = 'password'
  hostname: 'couchdb',    // default value = 'localhost'
  port: '5984',             // default value = 5984
  database: 'sessions',     // default value = 'sessions'
  https: false              // default value = false
});


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var homeRouter = require('./routes/home');
var reservationRouter = require('./routes/reservation');

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
app.use(express.static(__dirname + '/node_modules/bootstrap/dist'));
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


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/', authRouter);
app.use('/home', homeRouter);
app.use('/reservation', reservationRouter);

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
