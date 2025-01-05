const app = require('./index'); // Import the index.js file (your Express app)
const PORT = 3000;
const { connectDb, getDb } = require('./db');

connectDb();

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});