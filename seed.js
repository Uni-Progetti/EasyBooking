const NodeCouchDb = require('node-couchdb')
var crypto = require('crypto');

const couch = new NodeCouchDb({
    auth: {
        user:'admin',
        password:'secret'
    }
})

const dbName = 'db'
var hashedPassword1='';
var defSalt1='';

// Se il db esiste gia lo distrugge e poi lo ricrea
couch.listDatabases().then(function(dbs){
    if (dbs.includes(dbName)) {
        couch.dropDatabase(dbName).then(
            function(data, headers, status){
                console.log("DB dropped")
                couch.createDatabase(dbName).then(
                    function(data, headers, status){
                        console.log("DB initialized")
                        seeding()
                    },
                    function(err){ console.log(err) }
                )
            },
            function(err){ console.log(err) }
        )
    }
    else {
        couch.createDatabase(dbName).then(
            function(data, headers, status){
                console.log("DB initialized")
                seeding()
            },
            function(err){ console.log(err) }
        )
    }
})

// Inserisce le view e gli utenti nel db e infine chiama insert_dep
function seeding(){
    const defSalt = crypto.randomBytes(16);
    defSalt1 = defSalt;
    var defHash = "";
    crypto.pbkdf2('Password.0', defSalt, 310000, 32, 'sha256', function(err, hashedPassword) {
        if (err) { return next(err); }
        defHash = hashedPassword;
        hashedPassword1 = hashedPassword;

        couch.insert(dbName, { "_id": "_design/User", "views": {
            "0_All_Users":     { "map": "function (doc) { if (doc.type == 'User') emit( doc._id, { email: doc.fields.email, role: doc.fields.role, password: doc.fields.password, rev: doc._rev } ) }" },
            "1_Base_Users":    { "map": "function (doc) { if (doc.type == 'User' & doc.fields.role == 'user') emit( doc._id, { email: doc.fields.email, role: doc.fields.role, password: doc.fields.password, rev: doc._rev }); }" },
            "2_Manager_Users": { "map": "function (doc) { if (doc.type == 'User' & doc.fields.role == 'manager') emit( doc._id, { email: doc.fields.email, role: doc.fields.role, password: doc.fields.password, rev: doc._rev }); }" },
            "3_admin_Users":   { "map": "function (doc) { if (doc.type == 'User' & doc.fields.role == 'admin') emit( doc._id, { email: doc.fields.email, role: doc.fields.role, password: doc.fields.password, rev: doc._rev }); }" },
            "credentials":     { "map": "function (doc) { if (doc.type == 'User') emit( doc.fields.email, [doc.fields.password, doc.fields.salt]); }" }
            }, "language": "javascript" }).then(
            function(data, headers, status){
                console.log("Views: Users\n0_All_Users,\n1_Base_Users,\n2_Manager_Users,\n3_admin_Users")

                const usr_array = [
                    { email: "fra.user@gmail.com", password: hashedPassword, role: 'user', salt: defSalt },
                    { email: "matteo.user@gmail.com", password: hashedPassword, role: 'user', salt: defSalt  },
                    { email: "michela.user@gmail.com", password: hashedPassword, role: 'user', salt: defSalt  },
                    { email: "donia.user@gmail.com", password: hashedPassword, role: 'user', salt: defSalt  },
            
                    { email: "fra.manager@gmail.com", password: hashedPassword, role: 'manager', salt: defSalt  },
                    { email: "matteo.manager@gmail.com", password: hashedPassword, role: 'manager', salt: defSalt  },
                    { email: "michela.manager@gmail.com", password: hashedPassword, role: 'manager', salt: defSalt  },
                    { email: "donia.manager@gmail.com", password: hashedPassword, role: 'manager', salt: defSalt  },
                    { email: "test.manager@gmail.com", password: hashedPassword, role: 'manager', salt: defSalt  },
            
                    { email: "fra.admin@gmail.com", password: hashedPassword, role: 'admin', salt: defSalt  },
                    { email: "michela.admin@gmail.com", password: hashedPassword, role: 'admin', salt: defSalt  },
                    { email: "matteo.admin@gmail.com", password: hashedPassword, role: 'admin', salt: defSalt  }
                ]
                var usr_count = 0
                usr_array.forEach(function(usr){
                    couch.uniqid().then(function(ids){ const id = ids[0]

                        couch.insert(dbName, { īd: id, type: "User", fields: usr }).then(
                            function(data, headers, status){
                                console.log("USR: "+usr.email)
                                usr_count += 1
                                if (usr_count == 11) { insert_dep() }
                            },
                            function(err){ console.log(err) }
                        )

                    })
                })
            },
            function(err){ console.log(err) }
        )
    });

    couch.insert(dbName, { "_id": "_design/Department", "views": {
        "0_All_Departments": { "map": "function (doc) { if (doc.type == 'Department') emit( doc._id, { name: doc.fields.name, manager: doc.fields.manager, rev: doc._rev } ) }" }
        }, "language": "javascript" }).then(
        function(data, headers, status){
            console.log("Views: Departments\n0_All_Departments")
        },
        function(err){ console.log(err) }
    )
}

// Inserisce i dipartimenti nel db e chiama insert_sp_wd_seat
function insert_dep(){

    const usr_set = {
        fra_usr: { email: "fra.user@gmail.com", password: hashedPassword1, role: 'user', salt: defSalt1  },
        mat_usr: { email: "matteo.user@gmail.com", password: hashedPassword1, role: 'user', salt: defSalt1  },
        mic_usr: { email: "michela.user@gmail.com", password: hashedPassword1, role: 'user', salt: defSalt1  },
        don_usr: { email: "donia.user@gmail.com", password: hashedPassword1, role: 'user', salt: defSalt1  },

        fra_man: { email: "fra.manager@gmail.com", password: hashedPassword1, role: 'manager', salt: defSalt1  },
        mat_man: { email: "matteo.manager@gmail.com", password: hashedPassword1, role: 'manager', salt: defSalt1  },
        mic_man: { email: "michela.manager@gmail.com", password: hashedPassword1, role: 'manager', salt: defSalt1  },
        don_man: { email: "donia.manager@gmail.com", password: hashedPassword1, role: 'manager', salt: defSalt1  },
        manager_vuoto: { email: "test.manager@gmail.com", password: hashedPassword1, role: 'manager', salt: defSalt1  },

        fra_adm: { email: "fra.admin@gmail.com", password: hashedPassword1, role: 'admin', salt: defSalt1  },
        mic_adm: { email: "michela.admin@gmail.com", password: hashedPassword1, role: 'admin', salt: defSalt1  },
        mat_adm: { email: "matteo.admin@gmail.com", password: hashedPassword1, role: 'admin', salt: defSalt1  }
    }
    const dep_set = [
        { name: "Dipartimento di Francesco", manager: usr_set.fra_man.email, floors: 4, number_of_spaces: 4,
        via: "Piazzale Aldo Moro", civico: "5", cap: "00185", citta: "Roma", provincia: "RM", latitude: "41.9012777", longitude: "12.5145879",
        description: "Per gestire o testare questo dipartimento accedi come 'fra.manager@gmail.com'" },

        { name: "Dipartimento di Matteo", manager: usr_set.mat_man.email, floors: 4, number_of_spaces: 4,
        via: "Viale dello Scalo S. Lorenzo", civico: "82", cap: "00159", citta: "Roma", provincia: "RM", latitude: "41.89684", longitude: "12.5213",
        description: "Per gestire o testare questo dipartimento accedi come 'matteo.manager@gmail.com'" },

        { name: "Dipartimento di Michela", manager: usr_set.mic_man.email, floors: 4, number_of_spaces: 4,
        via: "Borgo Garibaldi", civico: "12", cap: "00041", citta: " Albano Laziale", provincia: "RM", latitude: "41.748959", longitude: "12.648700",
        description: "Per gestire o testare questo dipartimento accedi come 'michela.manager@gmail.com'" },

        { name: "Dipartimento di Donia", manager: usr_set.don_man.email, floors: 4, number_of_spaces: 4,
        via: "Via mura dei francesi", civico: "10", cap: "00043", citta: "Ciampino", provincia: "RM", latitude: "41.80299", longitude: "12.59893",
        description: "Per gestire o testare questo dipartimento accedi come 'donia.manager@gmail.com'" }
    ]

    dep_set.forEach(function(dep){
        couch.uniqid().then(function(ids){ const id = ids[0]

            couch.insert(dbName, { īd: id, type: "Department", fields: dep }).then(
                function(data, headers, status){
                    console.log("DEP: "+dep.name)
                    insert_sp_wd_seat(dep)
                },
                function(err){ console.log(err) }
            )

        })
    })
}

// Inserisce gli spazi gli orari e i posti nel db
function insert_sp_wd_seat(dep){

    const wd_set = [
        { dep_name: dep.name, day: "Lunedì",    state: "Aperto", apertura: { h: 8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } },
        { dep_name: dep.name, day: "Martedì",   state: "Aperto", apertura: { h: 8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } },
        { dep_name: dep.name, day: "Mercoledì", state: "Aperto", apertura: { h: 8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } },
        { dep_name: dep.name, day: "Giovedì",   state: "Aperto", apertura: { h: 8, m: 0, s: 0 }, chiusura: { h: 20, m: 0, s: 0 } },
        { dep_name: dep.name, day: "Venerdì",   state: "Aperto", apertura: { h: 8, m: 0, s: 0 }, chiusura: { h: 13, m: 0, s: 0 } },
        { dep_name: dep.name, day: "Sabato",    state: "Chiuso" },
        { dep_name: dep.name, day: "Domenica",  state: "Chiuso" }
    ]

    wd_set.forEach(function(wd){
        couch.uniqid().then(function(ids){ const id = ids[0]

            couch.insert(dbName, { īd: id, type: "WeekDay", fields: wd }).then(
                function(data, headers, status){
                    console.log("WD: "+wd.day+" - "+dep.name)
                },
                function(err){ console.log(err) }
            )

        })
    })

    const sp_set = [
        { dep_name: dep.name, typology: "Isola", name: "C", description: "Poche prese di corrente", floor: 1, number_of_seats: 2, state: "Abilitato" },
        { dep_name: dep.name, typology: "Isola", name: "D", description: "Poche prese di corrente", floor: 1, number_of_seats: 2, state: "Abilitato" },
        { dep_name: dep.name, typology: "Aula", name: "106", description: "Ben illuminata ", floor: 1, number_of_seats: 4, state: "Abilitato" },
        { dep_name: dep.name, typology: "Aula", name: "204", description: "Molto ampia", floor: 2, number_of_seats: 8, state: "Abilitato" },
        { dep_name: dep.name, typology: "Laboratorio", name: "15", description: "", floor: 1, number_of_seats: 3, state: "Abilitato" },
    ]
    sp_set.forEach(function(sp){
        couch.uniqid().then(function(ids){ const id = ids[0]

            couch.insert(dbName, { īd: id, type: "Space", fields: sp }).then(
                function(data, headers, status){
                    console.log("SP: "+sp.typology+" "+sp.name+" - "+dep.name)

                    wd_set.forEach(function(wd){
                        if (wd.state == "Aperto"){
                            const day = wd.day
                            const today = new Date()
                            const first = today.getDate() - today.getDay() + 1
                            const monday = new Date(today.setDate(first))

                            var date = new Date()
                            var offset_number = (day == "Lunedì")?    0 :
                                                (day == "Martedì")?   1 :
                                                (day == "Mercoledì")? 2 :
                                                (day == "Giovedì")?   3 :
                                                (day == "Venerdì")?   4 :
                                                (day == "Sabato")?    5 :
                                                (day == "Domenica")?  6 : 0

                            var setted_date = date.setDate(monday.getDate())
                            date = ((setted_date + offset_number) < today)? (setted_date + offset_number + 7) : (setted_date + offset_number)

                            for (let h = 0 ; h < (wd.chiusura.h - wd.apertura.h) ; h++ ) {
                                var Y_var =  today.getFullYear().toString()
                                var M_var = (today.getMonth().toString().length = 1)? "0"+today.getMonth().toString() : today.getMonth().toString()
                                var D_var =   (today.getDate().toString().length = 1)? "0"+today.getDate().toString() : today.getDate().toString()
                                var ha_var =  ((wd.apertura.h+h).toString().length == 1)? "0"+(wd.apertura.h+h).toString() : (wd.apertura.h+h).toString()
                                var hc_var =  ((wd.apertura.h+h+1).toString().length == 1)? "0"+(wd.apertura.h+h+1).toString() : (wd.apertura.h+h+1).toString()
                                var m_var =   "00"
                                var s_var =   "00"
                                const start_date ={ Y: Y_var, M: M_var, D: D_var, h: ha_var, m: m_var, s: s_var }
                                const end_date = { Y: Y_var, M: M_var, D: D_var, h: hc_var, m: m_var, s: s_var }

                                couch.uniqid().then(function(ids){ const id = ids[0]

                                    couch.insert(dbName, { īd: id, type: "Seat",
                                        fields: {
                                            dep_name: dep.name,
                                            typology: sp.typology,
                                            space_name: sp.name,
                                            position: 1,
                                            start_date: start_date,
                                            end_date: end_date,
                                            state: "Active"
                                        }
                                    }).then(
                                        function(data, headers, status){
                                            console.log("S"+h+"\t"+sp.name+"\t"+dep.civico+"\t"+start_date.Y+"/"+start_date.M+"/"+start_date.D+"\t"+start_date.h+":"+start_date.m+":"+start_date.s)
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

    return true
}