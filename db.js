var crypto = require('crypto');
const nano = require('nano')('http://admin:secret@couchdb:5984');

var db = nano.db.use('users');

function initialize_db(){
  // create the database schema for the todos app
  nano.db.create('users', (err, data) => {
    // errors are in 'err' & response is in 'data'
    if(err){
        //console.log("\n\n\nErrore nella creazione del DB!\n\n\n");
        return;
    }else{
        db = nano.db.use('users');
    }
  })
  
  // create an initial user (username: alice, password: letmein)
  var salt = crypto.randomBytes(16);
  db.insert({ email: "test@test.com".toString(),  hashed_password: crypto.pbkdf2Sync('password', salt, 310000, 32, 'sha256'), salt: salt}, 'test@test.com', (err, data) => {
    // errors are in 'err' & response is in 'data'
    if(err){
        //console.log("\n\n\nErrore nella creazione dell'utente test!\n\n\n");
        return;
    }else{
        //console.log("\n\n\nUtente test creato con successo!\n\n\n");
        return 
    }
  });
};
initialize_db();
module.exports = db;