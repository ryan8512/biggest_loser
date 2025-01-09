const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load environment variables

let client = null; // Cache the MongoDB client instance
let db = null; // Cache the database connection

/**
 * Connect to MongoDB.
 * Uses a cached connection if available.
 */
const connectDb = async () => {
    try {
        // If a client is already connected, return the cached database instance
        if (client && client.isConnected()) {
            console.log('Using cached MongoDB client');
            return db;
        }

        // MongoDB URI from environment variables
        const uri = process.env.MONGO_URI;

        // Create a new MongoDB client
        client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        // Connect the client
        await client.connect();

        // Cache the database instance
        db = client.db(); // Default database from the URI
        console.log('Connected to MongoDB');

        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error; // Throw the error to handle it at a higher level
    }
};

/**
 * Get the connected database instance.
 */
const getDb = () => {
    if (!db) {
        throw new Error('Database not connected!');
    }
    return db;
};

/**
 * Close the MongoDB client connection.
 * Typically not needed for Lambda as connections are reused across invocations.
 */
const closeDb = async () => {
    try {
        if (client) {
            await client.close(); // Close the MongoDB client connection
            client = null; // Reset the cached client
            db = null; // Reset the cached database
            console.log('MongoDB client closed');
        }
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
    }
};

module.exports = { connectDb, getDb, closeDb };