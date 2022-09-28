const dotenv = require('dotenv').config({path: './../.env'});
const NodeCouchDb = require('node-couchdb')
const dayjs = require('dayjs')
var crypto = require('crypto');
const couchdb_utils = require('./couchdb_utils.js');
const db_update = require('./db_update.js');
const dbName = 'db'

const couch = new NodeCouchDb({
    auth: {
        user: process.env.COUCHDB_USER,
        password: process.env.COUCHDB_PASSWORD
    }
})

// Se il db esiste gia lo distrugge e poi lo ricrea
couch.listDatabases().then(function(dbs){
    if (dbs.includes(dbName)) { couch.dropDatabase(dbName).then(
        function(data, headers, status){ console.log("DB dropped"); create_seed_db() },
        function(err){ console.log(err) }
    )}
    else { create_seed_db() }
})
// Crea il db
function create_seed_db(){
    couch.createDatabase(dbName).then(
        function(data, headers, status){
            array=["_global_changes","_users","_replicator", "refresh_tokens", "seats_updates", "sessions"];
            array.forEach(element => {
                couchdb_utils.update_or_create_to_couchdb_out("/"+element,'{}', function(err, response){
                    if(err){
                        console.log(err)
                    } else {
                        console.log(element+': '+response);
                    }
                });
            });
            let post_view = JSON.stringify({
                "_id": "_design/sessions",
                "views": {
                    "expires": {
                        "map": "function (doc) {\n emit(doc._id, doc.cookie.expires || doc.cookie._expires);\n}"
                    }
                },
                "language": "javascript"
            });
            couchdb_utils.update_or_create_to_couchdb_out('/sessions/_design/session', post_view, function(err, response){
                if (err){return console.log(err)};
            })
            console.log("DB initialized\n"); 
            insert_views();
        },
        function(err){ console.log(err) }
    )
}

// Inserisce le views
function insert_views(){

    couch.insert(dbName, { "_id": "_design/User", "views": {
        "0_All_Users":     { "map": "function (doc) { if (doc.type == 'User')                                emit( doc.fields.email, { email: doc.fields.email, role: doc.fields.role, password: doc.fields.password, rev: doc._rev , locked: doc.locked}); }" },
        "1_Base_Users":    { "map": "function (doc) { if (doc.type == 'User' & doc.fields.role == 'user')    emit( doc.fields.email, { email: doc.fields.email, role: doc.fields.role, password: doc.fields.password, rev: doc._rev }); }" },
        "2_Manager_Users": { "map": "function (doc) { if (doc.type == 'User' & doc.fields.role == 'manager') emit( doc.fields.email, { email: doc.fields.email, role: doc.fields.role, password: doc.fields.password, rev: doc._rev }); }" },
        "3_admin_Users":   { "map": "function (doc) { if (doc.type == 'User' & doc.fields.role == 'admin')   emit( doc.fields.email, { email: doc.fields.email, role: doc.fields.role, password: doc.fields.password, rev: doc._rev }); }" },
        "credentials":     { "map": "function (doc) { if (doc.type == 'User')                                emit( doc.fields.email, [ doc.fields.password, doc.fields.salt, doc.fields.access_token, doc.fields.refresh_token, doc._rev, doc.confirmed_at ]); }" },
        "verification":    { "map": "function (doc) { if (doc.type == 'User')                                emit( doc.fields.email, { confirmation_token: doc.confirmation_token, confirmed_at: doc.confirmed_at, confirmation_expires: doc.confirmation_expires, _rev: doc._rev }); }" }
    }, "language": "javascript" }).then(
        function(data, headers, status){ console.log("Views: Users\n 0_All_Users,\n  1_Base_Users,\n  2_Manager_Users,\n  3_admin_Users\n  credentials\n  verification") },
        function(err){ console.log(err) }
    )

    couch.insert(dbName, { "_id": "_design/Department", "views": {
        "All_Departments":   { "map": "function (doc) { if (doc.type == 'Department') emit( doc.key, { fields: doc.fields, rev: doc._rev } ) }" }
    }, "language": "javascript" }).then(
        function(data, headers, status){ console.log("Views: Departments\n All_Departments\n Departments_info") },
        function(err){ console.log(err) }
    )

    couch.insert(dbName, { "_id": "_design/Space", "views": {
        "All_Spaces":      { "map": "function (doc) { if (doc.type == 'Space') emit( doc.key,          { fields: doc.fields, rev: doc._rev, _id: doc._id } ) }" },
        "All_Spaces_keys": { "map": "function (doc) { if (doc.type == 'Space') emit( doc.key.dep_name, { typology: doc.key.typology, name: doc.key.name  } ) }" }
    }, "language": "javascript" }).then(
        function(data, headers, status){ console.log("Views: Spaces\n All_Spaces") },
        function(err){ console.log(err) }
    )

    couch.insert(dbName, { "_id": "_design/WeekDay", "views": {
        "All_WeekDays":   { "map": "function (doc) { if (doc.type == 'WeekDay') emit( doc.key, { fields: doc.fields, rev: doc._rev } ) }" }
    }, "language": "javascript" }).then(
        function(data, headers, status){ console.log("Views: WeekDays\n All_WeekDays") },
        function(err){ console.log(err) }
    )

    couch.insert(dbName, { "_id": "_design/Seat", "views": {
        "All_Seats":    { "map": "function (doc) { if (doc.type == 'Seat')                                 emit( doc.key, { fields: doc.fields,  rev: doc._rev               } ) }" },
        "Active_Seats": { "map": "function (doc) { if (doc.type == 'Seat' && doc.fields.state == 'Active') emit( doc.key, { fields: doc.fields, _rev: doc._rev, _id: doc._id } ) }" }
    }, "language": "javascript" }).then(
        function(data, headers, status){ console.log("Views: Seats\n All_Seats\n Seats_By_Typology") },
        function(err){ console.log(err) }
    )

    couch.insert(dbName, { "_id": "_design/Reservation", "views": {
        "All_Reservations":  { "map": "function (doc) { if (doc.type == 'Reservation') emit( doc.key, { fields: doc.fields, rev: doc._rev } ) }" }
    }, "language": "javascript" }).then(
        function(data, headers, status){ console.log("Views: Reservations\n 0_All_Reservations") },
        function(err){ console.log(err) }
    )

    insert_usr()
}

var hashedPassword1='';
var defSalt1='';
// Inserisce gli utenti nel db e infine chiama insert_dep
function insert_usr(){
    const defSalt = crypto.randomBytes(16);
    defSalt1 = defSalt;
    var defHash = "";
    var usr_count = 0

    crypto.pbkdf2('Password.0', defSalt, 310000, 32, 'sha256', function(err, hashedPassword) {

        if (err) { return next(err); }
        defHash = hashedPassword;
        hashedPassword1 = hashedPassword;

        // Dati
        const usr_array = [
            { email: "fra.user@gmail.com",        password: hashedPassword, role: 'user',    salt: defSalt, refresh_token: '', access_token: '' },
            { email: "matteo.user@gmail.com",     password: hashedPassword, role: 'user',    salt: defSalt, refresh_token: '', access_token: '' },
            { email: "michela.user@gmail.com",    password: hashedPassword, role: 'user',    salt: defSalt, refresh_token: '', access_token: '' },

            { email: "fra.manager@gmail.com",     password: hashedPassword, role: 'manager', salt: defSalt, refresh_token: '', access_token: '' },
            { email: "matteo.manager@gmail.com",  password: hashedPassword, role: 'manager', salt: defSalt, refresh_token: '', access_token: '' },
            { email: "michela.manager@gmail.com", password: hashedPassword, role: 'manager', salt: defSalt, refresh_token: '', access_token: '' },
            { email: "test.manager@gmail.com",    password: hashedPassword, role: 'manager', salt: defSalt, refresh_token: '', access_token: '' },

            { email: "fra.admin@gmail.com",       password: hashedPassword, role: 'admin',   salt: defSalt, refresh_token: '', access_token: '' },
            { email: "michela.admin@gmail.com",   password: hashedPassword, role: 'admin',   salt: defSalt, refresh_token: '', access_token: '' },
            { email: "matteo.admin@gmail.com",    password: hashedPassword, role: 'admin',   salt: defSalt, refresh_token: '', access_token: '' }
        ]

        // Inserimento
        console.log("\nUsers:")
        usr_array.forEach(function(usr){
            couch.insert(dbName, {
                _id: usr.email,
                type: "User",
                fields: usr,
                locked: false,
                confirmed_at: dayjs(),
                confirmation_expires: null,
                confirmation_token: null
            }).then(
                function(data, headers, status){ usr_count += 1; console.log("  "+usr.email); if (usr_count == 9) { insert_dep() } },
                function(err){ console.log(err) }
            )
        })
    });
}

// Inserisce i dipartimenti nel db e chiama insert_sp_wd_seat
function insert_dep(){

    const man_usr_set = { fra_man: "fra.manager@gmail.com", mat_man: "matteo.manager@gmail.com", mic_man: "michela.manager@gmail.com", don_man: "test.manager@gmail.com", }
    const dep_set = [
        // Scorri per vedere tutte le informazioni ->-->-->-->-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------->
        { key: "Dipartimento di Francesco",
            fields: { manager: man_usr_set.fra_man, floors: 4, number_of_spaces: 4, via: "Piazzale Aldo Moro",           civico: "5",  cap: "00185", citta: "Roma",            provincia: "RM", latitude: "41.9012777", longitude: "12.5145879", description: "Per gestire o testare questo dipartimento accedi come 'fra.manager@gmail.com'"     }},
        { key: "Dipartimento di Matteo",
            fields: { manager: man_usr_set.mat_man, floors: 4, number_of_spaces: 4, via: "Viale dello Scalo S. Lorenzo", civico: "82", cap: "00159", citta: "Roma",            provincia: "RM", latitude: "41.896866",   longitude: "12.5214067",    description: "Per gestire o testare questo dipartimento accedi come 'matteo.manager@gmail.com'"  }},
        { key: "Dipartimento di Michela",
            fields: { manager: man_usr_set.mic_man, floors: 4, number_of_spaces: 4, via: "Borgo Garibaldi",              civico: "12", cap: "00041", citta: " Albano Laziale", provincia: "RM", latitude: "41.748959",  longitude: "12.648700",  description: "Per gestire o testare questo dipartimento accedi come 'michela.manager@gmail.com'" }},
        { key: "Dipartimento di prova",
            fields: { manager: man_usr_set.don_man, floors: 4, number_of_spaces: 4, via: "Via mura dei francesi",        civico: "10", cap: "00043", citta: "Ciampino",        provincia: "RM", latitude: "41.7980456",   longitude: "12.6067009",   description: "Per gestire o testare questo dipartimento accedi come 'test.manager@gmail.com'"   }}
    ]

    dep_set.forEach(function(dep){
        couch.insert(dbName, {
            key: dep.key,
            type: "Department",
            fields: dep.fields
        }).then(
            function(data, headers, status){ console.log("DEP: "+dep.key); insert_sp_wd_seat(dep) },
            function(err){ console.log(err) }
        )
    })
}

// Inserisce gli spazi, gli orari e i posti nel db
function insert_sp_wd_seat(dep){

    // Dati orari
    const wd_set = [
        { key: { dep_name: dep.key, day: "Lunedì"    },
            fields: { state: "Aperto", apertura: { h:  8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } }},
        { key: { dep_name: dep.key, day: "Martedì"   },
            fields: { state: "Aperto", apertura: { h:  8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } }},
        { key: { dep_name: dep.key, day: "Mercoledì" },
            fields: { state: "Aperto", apertura: { h:  8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } }},
        { key: { dep_name: dep.key, day: "Giovedì"   },
            fields: { state: "Aperto", apertura: { h: 8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } }},
        { key: { dep_name: dep.key, day: "Venerdì"   },
            fields: { state: "Aperto", apertura: { h:  8, m: 0, s: 0 }, chiusura: { h: 13, m: 0, s: 0 } }},
        { key: { dep_name: dep.key, day: "Sabato"    },
            fields: { state: "Chiuso", apertura: { h:  0, m: 0, s: 0 }, chiusura: { h:  0, m: 0, s: 0 } }},
        { key: { dep_name: dep.key, day: "Domenica"  },
            fields: { state: "Chiuso", apertura: { h:  0, m: 0, s: 0 }, chiusura: { h:  0, m: 0, s: 0 } }}
    ]
    // Inserimento orari
    wd_set.forEach(function(wd){
        couch.insert(dbName, {
            key: wd.key,
            type: "WeekDay",
            fields: wd.fields
        }).then(
            function(data, headers, status){ console.log("WD: "+wd.key.day+" - "+wd.key.dep_name) },
            function(err){ console.log(err) }
        )
    })

    // Dati spazi
    const sp_set = [
        { key: { name: "C",   typology: "Isola",       dep_name: dep.key },
            fields: { floor: 1, number_of_seats: 2, state: "Abilitato", description: "Poche prese di corrente" }},
        { key: { name: "D",   typology: "Isola",       dep_name: dep.key },
            fields: { floor: 1, number_of_seats: 2, state: "Abilitato", description: "Poche prese di corrente" }},
        { key: { name: "106", typology: "Aula",        dep_name: dep.key },
            fields: { floor: 1, number_of_seats: 4, state: "Abilitato", description: "Ben illuminata "         }},
        { key: { name: "204", typology: "Aula",        dep_name: dep.key },
            fields: { floor: 2, number_of_seats: 8, state: "Abilitato", description: "Molto ampia"             }},
        { key: { name: "15",  typology: "Laboratorio", dep_name: dep.key },
            fields: { floor: 1, number_of_seats: 3, state: "Abilitato", description: ""                        }}
    ]
    // Inserimento spazi e Inserimento posti
    sp_set.forEach(function(sp){
        couch.insert(dbName, {
            key: sp.key,
            type: "Space",
            fields: sp.fields
        }).then(
            function(data, headers, status){
                console.log("SP: "+sp.key.typology+" "+sp.key.name+" - "+sp.key.dep_name)

                // Per ogni orario del dipartimento
                wd_set.forEach(function(wd){
                    if (wd.fields.state == "Aperto"){
                        const day = wd.key.day
                        const offset_number = (day == "Domenica")?  0 :
                                              (day == "Lunedì")?    1 :
                                              (day == "Martedì")?   2 :
                                              (day == "Mercoledì")? 3 :
                                              (day == "Giovedì")?   4 :
                                              (day == "Venerdì")?   5 :
                                              (day == "Sabato")?    6 : 0

                        const today = new Date()
                        const sunday = new Date((new Date()).setDate(today.getDate()-today.getDay()))
                        const current_wd_date = ((new Date((new Date()).setDate(today.getDate()-today.getDay()+offset_number))) < today)? (new Date((new Date()).setDate(today.getDate()-today.getDay()+offset_number+7))) : (new Date((new Date()).setDate(today.getDate()-today.getDay()+offset_number)))

                        // Per ogni slot orario nel giorno corrente
                        for (let h = 0 ; h < (wd.fields.chiusura.h - wd.fields.apertura.h) ; h++ ) {

                            // Inizializza i dati del posto
                            const Y_var  = current_wd_date.getFullYear()
                            const M_var  = current_wd_date.getMonth()+1
                            const D_var  = current_wd_date.getDate()
                            const start_h_var = wd.fields.apertura.h+h
                            const end_h_var =   wd.fields.apertura.h+h+1
                            const m_var  = 0
                            const s_var  = 0

                            const start_date = { Y: Y_var, M: M_var, D: D_var, h: start_h_var, m: m_var, s: s_var }
                            const end_date =   { Y: Y_var, M: M_var, D: D_var, h: end_h_var,   m: m_var, s: s_var }

                            // Inserisce il posto
                            couch.uniqid().then(function(ids){ const id = ids[0]
                                couch.insert(dbName, {
                                    key: { space_name: sp.key.name, typology: sp.key.typology, dep_name: sp.key.dep_name },
                                    type: "Seat",
                                    fields: {
                                        position: 1,
                                        start_date: start_date,
                                        end_date: end_date,
                                        state: "Active"
                                    }
                                }).then(
                                    function(data, headers, status){
                                        console.log("S"+h+"\t"+sp.key.name+"\t"+dep.fields.civico+"\t"+start_date.Y+"/"+start_date.M+"/"+start_date.D+"\t"+start_date.h+":"+start_date.m+":"+start_date.s)
                                    },
                                    function(err){ console.log(err) }
                                )
                            })
                        }
                    }
                })
            },
            function(err){ console.log(err) }
        )
    })
}