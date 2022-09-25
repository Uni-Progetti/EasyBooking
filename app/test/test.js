const { expect } = require('chai');
const chai = require('chai');
const chaiHttp = require('chai-http');
const dayjs = require('dayjs');
const describe = require('mocha').describe;
const it = require('mocha').it;
const couchdb_utils = require('./../couchdb_utils.js');
var weekday = require('dayjs/plugin/weekday');
dayjs.extend(weekday);

chai.use(chaiHttp);
chai.should();

/*
describe("Test di prova", () => {
    it("should return status code 200 and be json", (done) => {
        chai.request("http://localhost:8080")
            .get("/users/2")
            .end((err, res) => {
                if(err) {
                    console.log("ERROREEEEE:", err);
                    done();
                }
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                console.log(JSON.stringify(res));
                console.log(res.body.id);
                expect(res.body.id).to.eql("2");
                expect(res.body.username).to.eql("Dave Davids");
                done();
            });
    });
});
*/

/*
    it("users/:userId should return 200 and body should contain id: '2', username: 'Dave Davids'", (done) => {
        chai.request("http://localhost:8080")
            .get("/users/2")
            .end((err, res) => {
                if(err) {
                    console.log("ERROREEEEE:", err);
                    done();
                }
                res.should.have.status(200);
                res.should.have.property("body");
                res.body.should.be.json;
                res.body.should.have.headers;
                res.body.should.have.param("id").eql("2");
                res.body.should.have.param("username").eql("Dave Davids");
                done();
            });
    });
*/

describe("Test per controllo risultati chiamata http", () => {
    var access_token = '';
    // LOGIN 
    it("should return the access_token and refresh_token", (done) => {
        chai.request("http://localhost:8080/api")
            .post("/login")
            .set('content-type', 'application/x-www-form-urlencoded')
            .send({"username": "matteo.user@gmail.com", "password": "Password.0"})
            .end((err, res) => {
                if(err) {
                    console.log("ERROREEEEE:", err);
                    done();
                }
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res).to.have.property('body');

                console.log(res.body);
                access_token = res.body.accessToken;
                done();
            });
    });

    // TUTTI I DIPARTIMENTI 
    it("should return the list of all departments", (done) => {
        chai.request("http://localhost:8080/api")
            .get("/getDepartments/all")
            .end((err, res) => {
                if(err) {
                    console.log("ERROREEEEE:", err);
                    done();
                }
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res).to.have.property('body');

                // for (var e in res.body) {
                //     console.log(e);
                //     console.log("     " + res.body[e].manager);
                // }
                console.log(res.body);

                done();
            });
    });


    // TUTTI GLI SPAZI
    it("should return the list of all spaces", (done) => {
        chai.request("http://localhost:8080/api")
            .get("/getSpaces/all")
            .set({ "Authorization": `Bearer ${access_token}` })
            .end((err, res) => {
                if(err) {
                    console.log("ERROREEEEE:", err);
                    done();
                }
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res).to.have.property('body');
                
                // for (var e in res.body) {
                //     console.log(res.body[e]);
                // }
                console.log(res.body);
                done();
            });
    });

    // TUTTI GLI SPAZI DI TIPOLOGIA AULA
    it("should return the list of all spaces of typology Aula", (done) => {
        chai.request("http://localhost:8080/api")
            .get("/getSpaces/Aula")
            .set({ "Authorization": `Bearer ${access_token}` })
            .end((err, res) => {
                if(err) {
                    console.log("ERROREEEEE:", err);
                    done();
                }
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res).to.have.property('body');
                
                console.log(res.body);
                let ris = Object.values(res.body);
                //console.log(ris);
                let ris_string = JSON.stringify(ris);
                //console.log(ris_string);
                expect(ris_string).to.contain("Aula");
                // for (var e in res.body) {
                    // console.log(res.body[e]);
                    // let blocco = res.body[e][0];
                    // console.log("---");
                    // let jsBlocco = JSON.stringify(blocco);
                    // console.log(jsBlocco);
                    // expect(jsBlocco).to.contain("Aula");
                // }

                done();
            });
    });

    // MAKE RES 
    it("should book a seat and return the reservation ID", (done) => {
        var day = dayjs().weekday(3);
        chai.request("http://localhost:8080/api")
            .post("/make_res")
            .set({ "Authorization": `Bearer ${access_token}` })
            .set('content-type', 'application/json')
            .send({"dep_name": "Dipartimento di Matteo", "typology": "Aula", "space_name": "106", "start_date": {"Y": day.year().toString(), "M": (day.month()+1).toString(), "D": day.date().toString(), "h": "12" }})
            .end((err, res) => {
                if(err) {
                    console.log("ERROREEEEE:", err);
                    done();
                }
                //expect(res).to.have.status(200);
                //expect(res).to.be.json;
                expect(res).to.have.property('body');

                console.log(res.body);
                done();
            });
    });

    // TUTTE LE PRENOTAZIONI DI UN UTENTE (email)
    it("should return the list of all reservations of a given user (email)", (done) => {
        
        chai.request("http://localhost:8080/api")
            .get("/getReservations")
            .set({ "Authorization": `Bearer ${access_token}` })
            .end((err, res) => {
                if(err) {
                    console.log("ERROREEEEE:", err);
                    done();
                }
                //expect(res).to.have.status(200);
                expect(res).to.be.json;
                //expect(res).to.have.property('body');
                
                console.log(res.body);
                // for (var e in res.body) {
                //     console.log(res.body[e]);
                //     let blocco = res.body[e][0];
                //     console.log("---");
                //     let jsBlocco = JSON.stringify(blocco);
                //     console.log(jsBlocco);
                //     expect(jsBlocco).to.contain("Spazio");
                // }
                
                done();
            });
    });

    // RM RES 
    it("should remove a booked seat and return the result", (done) => {
        var day = dayjs().weekday(3);
        chai.request("http://localhost:8080/api")
            .post("/rm_res")
            .set({ "Authorization": `Bearer ${access_token}` })
            .set('content-type', 'application/json')
            .send({"dep_name": "Dipartimento di Matteo", "typology": "Aula", "space_name": "106", "start_date": {"Y": day.year().toString(), "M": (day.month()+1).toString(), "D": day.date().toString(), "h": "12" }})
            .end((err, res) => {
                if(err) {
                    console.log("ERROREEEEE:", err);
                    done();
                }
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res).to.have.property('body');

                console.log(res.body);
                done();
            });
    });

    // LOGOUT
    it("should logout from API", (done) => {
        chai.request("http://localhost:8080/api")
            .post("/logout")
            .set('content-type', 'application/x-www-form-urlencoded')
            .send({"token": access_token})
            .set({ "Authorization": `Bearer ${access_token}` })
            .end((err, res) => {
                if(err) {
                    console.log("ERROREEEEE:", err);
                    done();
                }
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res).to.have.property('body');
                
                console.log(res.body);
                done();
            });
    });
});