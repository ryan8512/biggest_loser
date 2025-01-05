const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../back_end/index'); // Adjust the path as needed
const expect = chai.expect;
const { connectDb, getDb, closeDb} = require('../back_end/db'); // Import MongoDB connection functions
const moment = require('moment');

chai.use(chaiHttp);

let server;
let db;

describe('API Tests', () => {

  // Start the server before the tests
  before((done) => {
    server = app.listen(3000, () => {
        console.log('Test server is running on http://localhost:3000');
        done();
    });
  });

  // Connect to MongoDB before the tests
  before(async () => {
    await connectDb();
    db = getDb();
  });

  // Stop the server and close MongoDB connection after the tests
  after(async () => {
    if (db) {
      await closeDb(); // Close the MongoDB client connection
    }

    if (server) {
      server.close(() => {
        console.log('Test server stopped');
      });
    }
  });

  
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

    // Run before each test to set up test data
  beforeEach(async () => {
    const collection = db.collection('weights');
    await collection.deleteMany({}); // Clear the collection

    // Populate test data for the first test
    await collection.insertMany([
      { username: 'user1', fat_mass: 20, date: new Date(moment().startOf('week').toDate()) },
      { username: 'user2', fat_mass: 25, date: new Date(moment().subtract(1, 'weeks').startOf('week').toDate()) },
    ]);
  });

  // Run after each test to clean up the database
  afterEach(async () => {
    const collection = db.collection('weights');
    await collection.deleteMany({}); // Ensure collection is empty after each test
  });

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