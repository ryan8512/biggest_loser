const express = require('express');
const cors = require('cors');
const path = require('path');
const moment = require('moment')
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
app.use(express.static(path.join(__dirname, '../front_end')));

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
    const {date, weight, fat_pctg, username} = req.body;

    // Validate the incoming data
    if (!date || !weight || !fat_pctg) {
        return res.status(400).json({ message: 'All fields are required' });
    }
  
    // New Code for MongoDB
    try {
        // Convert the date string to Moment.js format
        const formattedDate = moment(date, 'YYYY-MM-DD').startOf('week').toDate();  // Format date into a JavaScript Date object

        // Get MongoDB database instance
        const db = getDb();
        
        // Access the 'weights' collection (it will be created automatically if it doesn't exist)
        const collection = db.collection('weights');

        const fat_mass = weight * (fat_pctg / 100);
        
        // Insert the form data into the collection
        const result = await collection.insertOne({username,date: formattedDate, weight, fat_pctg, fat_mass});
        
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
    try {
        // Get MongoDB database instance
        const db = getDb();
        
        //Get the 'table weights
        const collection = db.collection('weights');

        //Get the current date and last week's date
        const currentDate = moment();
        const lastWeekDate = moment().subtract(1, 'weeks');
        
        //Retrieve user's data for both the current week and last week
        const currentWeekData = await collection.find({ date: currentDate.startOf('week').toDate() }).toArray();
        const lastWeekData = await collection.find({ date: lastWeekDate.startOf('week').toDate() }).toArray();

        //Group the username
        const groupAndAverage = (data) => {
            const grouped = data.reduce((acc, user) => {
                if (!acc[user.username]) {
                    acc[user.username] = { totalFatMass: 0, count: 0 };
                }
                acc[user.username].totalFatMass += user.fat_mass;
                acc[user.username].count += 1;
                return acc;
            }, {});
        
            return Object.entries(grouped).map(([username, { totalFatMass, count }]) => ({
                username,
                avgFatMass: totalFatMass / count,
            }));
        };

        // Process current and last week's data
        const avgCurrentWeekData = groupAndAverage(currentWeekData);
        const avgLastWeekData = groupAndAverage(lastWeekData);

        // Calculate fat loss percentage for each user (Sure that this is a single entry already)
        const leaderboard = avgCurrentWeekData.map(userThisWeek => {
            const userLastWeek = avgLastWeekData.find(user => user.username === userThisWeek.username);

            if (userLastWeek) {
                const fatLossPercentage = ((userLastWeek.avgFatMass - userThisWeek.avgFatMass) / userLastWeek.avgFatMass) * 100;
                return { name: userThisWeek.username, fatLossPercentage };
            }

            return null;
        }).filter(entry => entry !== null);

        // Sort by fat loss percentage in descending order
        const rankedData = leaderboard.sort((a, b) => b.fatLossPercentage - a.fatLossPercentage);

        res.json(rankedData); // Send the data as JSON response
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Catch-all route to serve front-end for all other routes (important for SPAs)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../front_end', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});