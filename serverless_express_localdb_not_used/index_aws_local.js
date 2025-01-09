//const AWS = require('aws-sdk');
const moment = require('moment');
const { connectDb, getDb } = require('./db'); // MongoDB connection functions

// MongoDB initialization
connectDb();

exports.handler = async (event) => {
    const { httpMethod, path } = event;

    try {
        if (httpMethod === 'POST' && path === '/check-username') {
            return await checkUsername(event);
        }

        if (httpMethod === 'POST' && path === '/check-weight') {
            return await checkWeight(event);
        }

        if (httpMethod === 'GET' && path === '/get-leaderboard') {
            return await getLeaderboard(event);
        }

        if (httpMethod === 'GET') {
            // Serve static files
            return serveStaticFiles(event);
        }

        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Route not found' }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

const checkUsername = async (event) => {
    const { username } = JSON.parse(event.body || '{}');
    const usernames = ['johndoe', 'janedoe', 'admin', 'testuser'];

    if (!username) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                success: false,
                message: 'Username is required',
            }),
        };
    }

    const exists = usernames.includes(username);
    if (exists) {
        return {
            statusCode: 200,
            body: `
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
            `,
            headers: { 'Content-Type': 'text/html' },
        };
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({
                success: false,
                message: 'Invalid username. Please enter a valid username.',
            }),
        };
    }
};

const checkWeight = async (event) => {
    const { date, weight, fat_pctg, username } = JSON.parse(event.body || '{}');

    if (!date || !weight || !fat_pctg || !username) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'All fields are required' }),
        };
    }

    try {
        const formattedDate = moment(date, 'YYYY-MM-DD').startOf('week').toDate();
        const db = getDb();
        const collection = db.collection('weights');
        const fat_mass = weight * (fat_pctg / 100);

        const result = await collection.insertOne({
            username,
            date: formattedDate,
            weight,
            fat_pctg,
            fat_mass,
        });

        return {
            statusCode: 201,
            body: JSON.stringify({
                success: true,
                message: 'Data saved successfully',
                dataId: result.insertedId,
            }),
        };
    } catch (error) {
        console.error('Error saving data to MongoDB:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

const getLeaderboard = async () => {
    try {
        const db = getDb();
        const collection = db.collection('weights');
        const currentDate = moment();
        const lastWeekDate = moment().subtract(1, 'weeks');

        const currentWeekData = await collection
            .find({ date: currentDate.startOf('week').toDate() })
            .toArray();
        const lastWeekData = await collection
            .find({ date: lastWeekDate.startOf('week').toDate() })
            .toArray();

        if (currentWeekData.length === 0 || lastWeekData.length === 0) {
            return { statusCode: 200, body: JSON.stringify([]) };
        }

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

        const avgCurrentWeekData = groupAndAverage(currentWeekData);
        const avgLastWeekData = groupAndAverage(lastWeekData);

        const leaderboard = avgCurrentWeekData
            .map((userThisWeek) => {
                const userLastWeek = avgLastWeekData.find(
                    (user) => user.username === userThisWeek.username
                );

                if (userLastWeek) {
                    const fatLossPercentage =
                        ((userLastWeek.avgFatMass - userThisWeek.avgFatMass) /
                            userLastWeek.avgFatMass) *
                        100;
                    return { name: userThisWeek.username, fatLossPercentage };
                }

                return null;
            })
            .filter((entry) => entry !== null);

        const rankedData = leaderboard.sort(
            (a, b) => b.fatLossPercentage - a.fatLossPercentage
        );

        return { statusCode: 200, body: JSON.stringify(rankedData) };
    } catch (err) {
        console.error('Error fetching data:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};

const serveStaticFiles = async (event) => {
    // Serve front-end files from S3 or similar
    return {
        statusCode: 200,
        body: 'Static file handling goes here',
        headers: { 'Content-Type': 'text/html' },
    };
};