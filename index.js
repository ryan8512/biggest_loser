const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;
const { connectDb, getDb } = require('./db'); // Import MongoDB connection functions

// Connect to MongoDB before handling any requests
connectDb();

// Use cors middleware to allow cross-origin requests
//app.use(cors()); // Allow all origins to access your API

// Middleware to parse JSON requests
app.use(express.json());

// Serve static front-end files
app.use(express.static(path.join(__dirname, 'front_end')));

// Simulated database of usernames
const usernames = ['johndoe', 'janedoe', 'admin', 'testuser'];

// Route to check username availability
app.post('/check-username', (req, res) => {
    const { username } = req.body; // Extract username from the request body

    if (!username) {
        return res.status(400).json({
            success: false,
            message: 'Username is required',
        });
    }

    const exists = usernames.includes(username);

    if(exists){
        res.send(`
            <h3>You are login as: ${username}</h3>
            <h2>Weight Entry</h2>
            <form method="POST" id="weightEntry">
                <label for="date">Date</label>
                <input type="date" id="date" name="date" required> <br/>
                <label for="weight">Weight (kg)</label>
                <input type="number" id="weight" name="weight" step="0.05" required> <br/>
                <label for="fat_pctg">Fat Percentage (%)</label>
                <input type="number" id="fat_pctg" name="fat_pctg" step="0.01" required> <br/>
                <input type="submit" value="Submit">
            </form>
        `);
    }else {
        // Send a JSON response to indicate an invalid username
        res.status(400).json({
            success: false,
            message: 'Invalid username. Please enter a valid username.',
        });
      }
});

// Process the second form
app.post('/check-weight', async (req, res) => {
    const {date, weight, fat_pctg} = req.body;

    // Validate the incoming data
    if (!date || !weight || !fat_pctg) {
        return res.status(400).json({ message: 'All fields are required' });
    }
  
    // New Code for MongoDB
    try {
        // Get MongoDB database instance
        const db = getDb();
        
        // Access the 'weights' collection (it will be created automatically if it doesn't exist)
        const collection = db.collection('weights');
        
        // Insert the form data into the collection
        const result = await collection.insertOne({ date, weight, fat_pctg });
        
        // Send a success response
        res.status(201).json({
            success: true,
            message: 'Data saved successfully',
            dataId: result.insertedId,
        });
    } catch (error) {
        console.error('Error saving data to MongoDB:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//Get Data from Database
app.get('/get-leaderboard',async (req, res) => {

});

// Catch-all route to serve front-end for all other routes (important for SPAs)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'front_end', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});