const { expect } = require('chai');
const chai = require('chai');
const chaiHttp = require('chai-http');
const describe = require('mocha').describe;
const it = require('mocha').it;

chai.use(chaiHttp);
chai.should();

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