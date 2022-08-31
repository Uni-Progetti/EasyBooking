const NodeCouchDb = require('node-couchdb')
const dayjs = require('dayjs')
var crypto = require('crypto');
const dbName = 'db'

const couch = new NodeCouchDb({
    auth: { user:'admin', password:'secret' }
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
function create_seed_db(){ couch.createDatabase(dbName).then(
    function(data, headers, status){ console.log("DB initialized\n"); insert_views() },
    function(err){ console.log(err) }
)}

// Inserisce le views
function insert_views(){

    couch.insert(dbName, { "_id": "_design/User", "views": {
        "0_All_Users":     { "map": "function (doc) { if (doc.type == 'User')                                emit( doc.fields.email, { email: doc.fields.email, role: doc.fields.role, password: doc.fields.password, rev: doc._rev }); }" },
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
        "0_All_Departments": { "map": "function (doc) { if (doc.type == 'Department') emit( doc.fields.name, { manager: doc.fields.manager, rev: doc._rev } ) }" }
    }, "language": "javascript" }).then(
        function(data, headers, status){ console.log("Views: Departments\n 0_All_Departments") },
        function(err){ console.log(err) }
    )

    couch.insert(dbName, { "_id": "_design/Space", "views": {
        "0_All_Spaces": { "map": "function (doc) { if (doc.type == 'Space') emit( doc.fields.name, { typology: doc.fields.typology, dep_name: doc.fields.dep_name, number_of_seats: doc.fields.number_of_seats, rev: doc._rev } ) }" }
    }, "language": "javascript" }).then(
        function(data, headers, status){ console.log("Views: Spaces\n 0_All_Spaces") },
        function(err){ console.log(err) }
    )

    couch.insert(dbName, { "_id": "_design/WeekDay", "views": {
        "0_All_WeekDays": { "map": "function (doc) { if (doc.type == 'WeekDay') emit( doc.fields.dep_name, { day: doc.fields.day, state: doc.fields.state, apertura: { h: doc.fields.apertura.h, m: doc.fields.apertura.m, s: doc.fields.apertura.s }, chiusura: { h: doc.fields.chiusura.h, m: doc.fields.chiusura.m, s: doc.fields.chiusura.s }, rev: doc._rev } ) }" }
    }, "language": "javascript" }).then(
        function(data, headers, status){ console.log("Views: WeekDays\n 0_All_WeekDays") },
        function(err){ console.log(err) }
    )

    couch.insert(dbName, { "_id": "_design/Seat", "views": {
        "0_All_Seats": { "map": "function (doc) { if (doc.type == 'Seat') emit( doc.fields.dep_name, { typology: doc.fields.typology, space_name: doc.fields.space_name, position: doc.fields.position, start_date: { Y: doc.fields.start_date.Y, M: doc.fields.start_date.M, D: doc.fields.start_date.D, h: doc.fields.start_date.h, m: doc.fields.start_date.m, s: doc.fields.start_date.s },  end_date: { Y: doc.fields.end_date.Y, M: doc.fields.end_date.M, D: doc.fields.end_date.D, h: doc.fields.end_date.h, m: doc.fields.end_date.m, s: doc.fields.end_date.s }, state: doc.fields.state, rev: doc._rev } ) }" }
    }, "language": "javascript" }).then(
        function(data, headers, status){ console.log("Views: Seats\n 0_All_Seats") },
        function(err){ console.log(err) }
    )

    couch.insert(dbName, { "_id": "_design/Reservation", "views": {
        "0_All_Reservations": { "map": "function (doc) { if (doc.type == 'Reservation') emit( doc.fields.dep_name, { email: doc.fields.email, typology: doc.fields.typology, space_name: doc.fields.space_name, position: doc.fields.seat_number, start_date: { Y: doc.fields.start_date.Y, M: doc.fields.start_date.M, D: doc.fields.start_date.D, h: doc.fields.start_date.h, m: doc.fields.start_date.m, s: doc.fields.start_date.s }, end_date: { Y: doc.fields.end_date.Y, M: doc.fields.end_date.M, D: doc.fields.end_date.D, h: doc.fields.end_date.h, m: doc.fields.end_date.m, s: doc.fields.end_date.s }, state: doc.fields.state, rev: doc._rev } ) }" }
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
            { email: "donia.user@gmail.com",      password: hashedPassword, role: 'user',    salt: defSalt, refresh_token: '', access_token: '' },
    
            { email: "fra.manager@gmail.com",     password: hashedPassword, role: 'manager', salt: defSalt, refresh_token: '', access_token: '' },
            { email: "matteo.manager@gmail.com",  password: hashedPassword, role: 'manager', salt: defSalt, refresh_token: '', access_token: '' },
            { email: "michela.manager@gmail.com", password: hashedPassword, role: 'manager', salt: defSalt, refresh_token: '', access_token: '' },
            { email: "donia.manager@gmail.com",   password: hashedPassword, role: 'manager', salt: defSalt, refresh_token: '', access_token: '' },
            { email: "test.manager@gmail.com",    password: hashedPassword, role: 'manager', salt: defSalt, refresh_token: '', access_token: '' },

            { email: "fra.admin@gmail.com",       password: hashedPassword, role: 'admin',   salt: defSalt, refresh_token: '', access_token: '' },
            { email: "michela.admin@gmail.com",   password: hashedPassword, role: 'admin',   salt: defSalt, refresh_token: '', access_token: '' },
            { email: "matteo.admin@gmail.com",    password: hashedPassword, role: 'admin',   salt: defSalt, refresh_token: '', access_token: '' }
        ]

        // Inserimento
        console.log("\nUsers:")
        usr_array.forEach(function(usr){
            couch.uniqid().then(function(ids){ const id = ids[0]

                couch.insert(dbName, { īd: id, type: "User", fields: usr }).then(
                    function(data, headers, status){ console.log("  "+usr.email); usr_count += 1; if (usr_count == 11) { insert_dep() } },
                    function(err){ console.log(err) }
                )

            })
        })
    });
}

// Inserisce i dipartimenti nel db e chiama insert_sp_wd_seat
function insert_dep(){

    const man_usr_set = { fra_man: "fra.manager@gmail.com", mat_man: "matteo.manager@gmail.com", mic_man: "michela.manager@gmail.com", don_man: "donia.manager@gmail.com", }
    const dep_set = [
        // Scorri per vedere tutte le informazioni ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------->
        { name: "Dipartimento di Francesco", manager: man_usr_set.fra_man, floors: 4, number_of_spaces: 4, via: "Piazzale Aldo Moro",           civico: "5",  cap: "00185", citta: "Roma",            provincia: "RM", latitude: "41.9012777", longitude: "12.5145879", description: "Per gestire o testare questo dipartimento accedi come 'fra.manager@gmail.com'"     },
        { name: "Dipartimento di Matteo",    manager: man_usr_set.mat_man, floors: 4, number_of_spaces: 4, via: "Viale dello Scalo S. Lorenzo", civico: "82", cap: "00159", citta: "Roma",            provincia: "RM", latitude: "41.89684",   longitude: "12.5213",    description: "Per gestire o testare questo dipartimento accedi come 'matteo.manager@gmail.com'"  },
        { name: "Dipartimento di Michela",   manager: man_usr_set.mic_man, floors: 4, number_of_spaces: 4, via: "Borgo Garibaldi",              civico: "12", cap: "00041", citta: " Albano Laziale", provincia: "RM", latitude: "41.748959",  longitude: "12.648700",  description: "Per gestire o testare questo dipartimento accedi come 'michela.manager@gmail.com'" },
        { name: "Dipartimento di Donia",     manager: man_usr_set.don_man, floors: 4, number_of_spaces: 4, via: "Via mura dei francesi",        civico: "10", cap: "00043", citta: "Ciampino",        provincia: "RM", latitude: "41.80299",   longitude: "12.59893",   description: "Per gestire o testare questo dipartimento accedi come 'donia.manager@gmail.com'"   }
    ]

    dep_set.forEach(function(dep){
        couch.uniqid().then(function(ids){ const id = ids[0]
            couch.insert(dbName, { īd: id, type: "Department", fields: dep }).then(
                function(data, headers, status){ console.log("DEP: "+dep.name); insert_sp_wd_seat(dep) },
                function(err){ console.log(err) }
            )
        })
    })
}

// Inserisce gli spazi, gli orari e i posti nel db
function insert_sp_wd_seat(dep){

    // Dati orari
    const wd_set = [
        { dep_name: dep.name, day: "Lunedì",    state: "Aperto", apertura: { h: 8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } },
        { dep_name: dep.name, day: "Martedì",   state: "Aperto", apertura: { h: 8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } },
        { dep_name: dep.name, day: "Mercoledì", state: "Aperto", apertura: { h: 8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } },
        { dep_name: dep.name, day: "Giovedì",   state: "Aperto", apertura: { h: 8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } },
        { dep_name: dep.name, day: "Venerdì",   state: "Aperto", apertura: { h: 8, m: 0, s: 0 }, chiusura: { h: 13, m: 0, s: 0 } },
        { dep_name: dep.name, day: "Sabato",    state: "Chiuso", apertura: { h: 0, m: 0, s: 0 }, chiusura: { h:  0, m: 0, s: 0 } },
        { dep_name: dep.name, day: "Domenica",  state: "Chiuso", apertura: { h: 0, m: 0, s: 0 }, chiusura: { h:  0, m: 0, s: 0 } }
    ]
    // Inserimento orari
    wd_set.forEach(function(wd){
        couch.uniqid().then(function(ids){ const id = ids[0]
            couch.insert(dbName, { īd: id, type: "WeekDay", fields: wd }).then(
                function(data, headers, status){ console.log("WD: "+wd.day+" - "+dep.name) 
              },
                function(err){ console.log(err) }
            )
        })
    })

    // Dati spazi
    const sp_set = [
        { dep_name: dep.name, typology: "Isola",       name: "C",   description: "Poche prese di corrente", floor: 1, number_of_seats: 2, state: "Abilitato" },
        { dep_name: dep.name, typology: "Isola",       name: "D",   description: "Poche prese di corrente", floor: 1, number_of_seats: 2, state: "Abilitato" },
        { dep_name: dep.name, typology: "Aula",        name: "106", description: "Ben illuminata ",         floor: 1, number_of_seats: 4, state: "Abilitato" },
        { dep_name: dep.name, typology: "Aula",        name: "204", description: "Molto ampia",             floor: 2, number_of_seats: 8, state: "Abilitato" },
        { dep_name: dep.name, typology: "Laboratorio", name: "15",  description: "",                        floor: 1, number_of_seats: 3, state: "Abilitato" },
    ]
    // Inserimento spazi e Inserimento posti
    sp_set.forEach(function(sp){
        couch.uniqid().then(function(ids){ const id = ids[0]
            couch.insert(dbName, { īd: id, type: "Space", fields: sp }).then(
                function(data, headers, status){
                    console.log("SP: "+sp.typology+" "+sp.name+" - "+dep.name)

                    // Per ogni orario del dipartimento
                    wd_set.forEach(function(wd){
                        if (wd.state == "Aperto"){
                            const day = wd.day
                            const offset_number = (day == "Domenica")?  0 :
                                                  (day == "Lunedì")?    1 :
                                                  (day == "Martedì")?   2 :
                                                  (day == "Mercoledì")? 3 :
                                                  (day == "Giovedì")?   4 :
                                                  (day == "Venerdì")?   5 :
                                                  (day == "Sabato")?    6 : 0

                            const today = new Date()
                            const sunday = new Date((new Date()).setDate(today.getDate()-today.getDay()))
                            const current_wd_date = ((new Date((new Date()).setDate(today.getDate()-today.getDay()+offset_number))) < today)? (new Date((new Date()).setDate(sunday.getDate()+offset_number+7))) : (new Date((new Date()).setDate(sunday.getDate()+offset_number)))

                            // Per ogni slot orario nel giorno corrente
                            for (let h = 0 ; h < (wd.chiusura.h - wd.apertura.h) ; h++ ) {

                                // Inizializza i dati del posto
                                const Y_var = String(current_wd_date.getFullYear())
                                // var   M_var = String(current_wd_date.getMonth()+1); M_var = (M_var.length == 1)? "0"+M_var : M_var
                                // var   D_var = String(current_wd_date.getDate());    D_var = (D_var.length == 1)? "0"+D_var : D_var
                                var   M_var = String(current_wd_date.getMonth()+1)
                                var   D_var = String(current_wd_date.getDate())

                                // var   ha_var = String(wd.apertura.h+h  ); ha_var = (ha_var.length == 1)? "0"+ha_var : ha_var
                                // var   hc_var = String(wd.apertura.h+h+1); hc_var = (hc_var.length == 1)? "0"+hc_var : hc_var
                                var   ha_var = String(wd.apertura.h+h  )
                                var   hc_var = String(wd.apertura.h+h+1)
                                const m_var  = "00"
                                const s_var  = "00"

                                const start_date = { Y: Y_var, M: M_var, D: D_var, h: ha_var, m: m_var, s: s_var }
                                const end_date =   { Y: Y_var, M: M_var, D: D_var, h: hc_var, m: m_var, s: s_var }

                                // Inserisce il posto
                                couch.uniqid().then(function(ids){ const id = ids[0]
                                    couch.insert(dbName, { īd: id, type: "Seat", fields: {
                                        dep_name: dep.name,
                                        typology: sp.typology,
                                        space_name: sp.name,
                                        position: 1,
                                        start_date: start_date,
                                        end_date: end_date,
                                        state: "Active"
                                    }}).then(
                                        function(data, headers, status){
                                            console.log("S"+h+"\t"+sp.name+"\t"+dep.cap+"\t"+start_date.Y+"/"+start_date.M+"/"+start_date.D+"\t"+start_date.h+":"+start_date.m+":"+start_date.s)
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
    })
}