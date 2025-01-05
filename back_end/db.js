const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load environment variables

let db = null; // Store the database connection here

const connectDb = async () => {
    try {
        // MongoDB URI from .env file
        const uri = process.env.MONGO_URI;
        const client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Connect to MongoDB and store the database instance
        await client.connect();
        db = client.db(); // Default database from the URI

        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Exit the process if there's a connection error
    }
};

// Function to get the connected database
const getDb = () => {
    if (!db) {
        throw new Error('Database not connected!');
    }
    return db;
};

module.exports = { connectDb, getDb };