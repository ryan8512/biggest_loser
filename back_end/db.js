const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load environment variables

let client = null; // Store the MongoDB client instance here
let db = null; // Store the database connection here

const connectDb = async () => {
    try {
        // MongoDB URI from .env file
        const uri = process.env.MONGO_URI;
        client = new MongoClient(uri);

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

// Function to close the database connection
const closeDb = async () => {
    try {
        if (client) {
            await client.close(); // Close the MongoDB client connection
            console.log('MongoDB client closed');
        }
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
    }
};

module.exports = { connectDb, getDb, closeDb };