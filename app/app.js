const jwt = require('jsonwebtoken');                       // 
const bodyParser = require('body-parser');                 // 
const createError = require('http-errors');                // 
const csrf = require('csurf');                             // 
const cors = require('cors');                              // 
const express = require('express');                        // 
const path = require('path');                              // 
const cookieParser = require('cookie-parser');             // 
const logger = require('morgan');                          // 
const session = require('express-session');                // 
const Expression = require('couchdb-expression')(session); // 
const nodemailer = require('nodemailer');                  // 
const schedule = require('node-schedule');                 // 
const dayjs = require('dayjs');                            // 
const db_update = require('./db_update.js');               // 
const couchdb_utils = require('./couchdb_utils.js');       // 
const store = new Expression({                             // 
  username: process.env.COUCHDB_USER,     // default value = 'admin'
  password: process.env.COUCHDB_PASSWORD, // default value = 'password'
  hostname: 'couchdb',                    // default value = 'localhost'
  port:     '5984',                       // default value = 5984
  database: 'sessions',                   // default value = 'sessions'
  https:    false                         // default value = false
});
const transporter = nodemailer.createTransport({           // 
  service: 'gmail',
    auth: {
      user: process.env.APP_EMAIL,
      pass: process.env.APP_EMAIL_PASS
    },
});

// Require routes
var infoRouter = require('./routes/info');                 // Pagina informazioni
var authRouter = require('./routes/auth');                 // Pagine login/signup
var homeRouter = require('./routes/home');                 // Pagina home
var adminRouter = require('./routes/admin');               // Pagina gestione sito
var reservationRouter = require('./routes/reservation');   // Pagina effettua prenotazione
var personalAreaRouter = require('./routes/personalArea'); // Pagina area personale
var apiRouter = require('./routes/api');                   // Richieste api
var usersRouter = require('./routes/users');               // Gestione dati utente

// 
var app = express();

// 
app.use(cors());

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// 
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

// 
app.use(session({
  name: process.env.SESS_NAME,
  proxy: true,
  store: store,
  secret: process.env.SESSION_SECRET,
  sameSite: true,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1800000 /*30 minuti*/ },
}));

// flash message middleware
app.use((req, res, next)=>{
  res.locals.message = req.session.message
  delete req.session.message
  next()
})

// Associa il router api
app.use('/api', apiRouter);
// 
app.use(csrf({cookie:false}));

// Inizializza il mailer
app.use( function (req, res, next) {
  req.transporter = transporter;
  next();
});


// Ottiene il path corrente
app.use( function (req, res, next) {
  req.location = req.get('host') + req.originalUrl;
  next();
});

// Associazione dei router con i path relativi ad essi
app.use('/info', infoRouter);
app.use('/users', usersRouter);
app.use('/', authRouter);
app.use('/home', homeRouter);
app.use('/admin', adminRouter);
app.use('/reservation', reservationRouter);
app.use('/personalArea', personalAreaRouter);


// GET apidoc page
app.use("/apidoc", express.static(path.join(__dirname, "/apidoc"))); // aggiungere csrfToken


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// Update automatico del db all'inizio di ogni ora
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


// Elimina le sessioni appese dopo 30 minuti
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
