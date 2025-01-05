const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../back_end/index'); // Adjust the path as needed
const expect = chai.expect;

chai.use(chaiHttp);

describe('API Tests', () => {
  
  // Test the /check-username route
  describe('POST /check-username', () => {

    it('should return success for a valid username', (done) => {
      chai.request(app)
        .post('/check-username')
        .send({ username: 'johndoe' })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.text).to.include('You are login as: johndoe');
          done();
        });
    });

    it('should return an error for an invalid username', (done) => {
      chai.request(app)
        .post('/check-username')
        .send({ username: 'unknownuser' })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('message', 'Invalid username. Please enter a valid username.');
          done();
        });
    });

    it('should return an error if no username is provided', (done) => {
      chai.request(app)
        .post('/check-username')
        .send({})
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          expect(res.body).to.have.property('message', 'Username is required');
          done();
        });
    });
  });

  // Test the /check-weight route
  describe('POST /check-weight', () => {
    
    it('should save valid weight data', (done) => {
      chai.request(app)
        .post('/check-weight')
        .send({
          username: 'johndoe',
          date: '2025-01-01',
          weight: 70,
          fat_pctg: 20
        })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('message', 'Data saved successfully');
          expect(res.body).to.have.property('dataId');
          done();
        });
    });

    it('should return an error if required fields are missing', (done) => {
      chai.request(app)
        .post('/check-weight')
        .send({ username: 'johndoe', weight: 70 }) // Missing date and fat_pctg
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message', 'All fields are required');
          done();
        });
    });
  });

  // Test the /get-leaderboard route
  describe('GET /get-leaderboard', () => {

    it('should return a leaderboard', (done) => {
      chai.request(app)
        .get('/get-leaderboard')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('array'); // Ensure the response is an array
          // If test data exists, check structure of leaderboard entries
          if (res.body.length > 0) {
            const entry = res.body[0];
            expect(entry).to.have.property('name');
            expect(entry).to.have.property('fatLossPercentage');
          }
          done();
        });
    });

    it('should handle no data gracefully', (done) => {
      chai.request(app)
        .get('/get-leaderboard')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('array').that.is.empty; // Expect empty array if no data
          done();
        });
    });
  });
});