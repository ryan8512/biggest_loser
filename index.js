const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;

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
                <input type="number" id="weight" name="weight" required> <br/>
                <label for="fat_pctg">Fat Percentage (%)</label>
                <input type="number" id="fat_pctg" name="fat_pctg" step="0.01" required> <br/>
                <input type="submit" value="Submit">
            </form>
        `);
    }else {
        // If the username is invalid, show an error
        res.send(`
          <p style="color: red;">Please enter a valid username.</p>
          <a href="/">Go back to the first form</a>
        `);
      }
    // Return a JSON response
    // res.json({
    //     success: true,
    //     username: username,
    //     exists: exists,
    //     message: exists
    //         ? 'Username is already taken.'
    //         : 'Username is available.',
    // });
});

// Process the second form
app.post('/check-weight', (req, res) => {
    const {date, weight, fat_pctg} = req.body;

    // Validate the incoming data
    if (!date || !weight || !fat_pctg) {
        return res.status(400).json({ message: 'All fields are required' });
    }
  
    // Validate the email address
    if (1) {
        res.json({
                success: true,
                date: date,
                weight: weight,
                fat_pctg: fat_pctg
            });
    } else {
      res.send(`
        <p style="color: red;">Please enter a valid email address.</p>
        <a href="/process">Go back to the second form</a>
      `);
    }
});

// Catch-all route to serve front-end for all other routes (important for SPAs)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'front_end', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});