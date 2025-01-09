const moment = require('moment');

// DynamoDB initialization (use DynamoDB for createTable, DocumentClient for other operations)
const AWS = require('aws-sdk');

const isLocal = process.env.AWS_SAM_LOCAL === 'true';

if(isLocal){
    const dynamoDb = new AWS.DynamoDB.DocumentClient({
        region: 'us-west-2',
        endpoint: 'http://host.docker.internal:8000/',   //'http://host.docker.internal:8000/'  http://192.168.1.21:8000/
    });
    const dynamoDbService = new AWS.DynamoDB({
        region: 'us-west-2',
        endpoint: 'http://host.docker.internal:8000/', 
    });

    // Function to create the "Weights" table if it doesn't exist
    async function createTable() {
        const params = {
            TableName: 'Weights',
            AttributeDefinitions: [
                { AttributeName: 'username', AttributeType: 'S' },
                { AttributeName: 'date', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'username', KeyType: 'HASH' },
                { AttributeName: 'date', KeyType: 'RANGE' }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        };

        try {
            // Use DynamoDB service to create the table (not DocumentClient)
            const data = await dynamoDbService.createTable(params).promise();
            console.log("Table created successfully:", JSON.stringify(data, null, 2));
        } catch (err) {
            if (err.code === 'ResourceInUseException') {
                console.log("Table already exists, skipping creation.");
            } else {
                console.error("Error creating table:", JSON.stringify(err, null, 2));
            }
        }
    }
}

// exports.handler = async (event) => {
//     // First, ensure the table exists (if it doesn't already)
//     await createTable();

//     const params = {
//         TableName: 'Weights',
//         Item: {
//             username: 'exampleUser',  // Example partition key
//             date: '2025-01-08',        // Example sort key
//             weight: 75,                // Additional data you want to store
//             fatPercentage: 20,         // Example data
//             fatMass: 15                // Example data
//         }
//     };

//     try {
//         const result = await dynamoDb.put(params).promise();
//         console.log(result);
//         return {
//             statusCode: 200,
//             body: JSON.stringify({ message: 'Item successfully inserted/updated.' }),
//         };
//     } catch (err) {
//         console.error('Error inserting item:', err);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ error: 'Unable to insert item.' }),
//         };
//     }
// };

exports.handler = async (event) => {
    if(isLocal){
        await createTable();
    }
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
            body: `<h3>You are login as: ${username}</h3>
                <h2>Weight Entry</h2>
                <form method="POST" id="weightEntry">
                    <label for="date">Date</label>
                    <input type="date" id="date" name="date" required> <br/>
                    <label for="weight">Weight (kg)</label>
                    <input type="number" id="weight" name="weight" step="0.05" required> <br/>
                    <label for="fat_pctg">Fat Percentage (%)</label>
                    <input type="number" id="fat_pctg" name="fat_pctg" step="0.01" required> <br/>
                    <input type="submit" value="Submit">
                </form>`,
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
        const fat_mass = weight * (fat_pctg / 100);

        // Save data to DynamoDB
        const params = {
            TableName: 'Weights', // Make sure to replace this with your DynamoDB table name
            Item: {
                username,
                date: formattedDate.toISOString(),
                weight,
                fat_pctg,
                fat_mass,
            },
        };

        await dynamoDb.put(params).promise();

        return {
            statusCode: 201,
            body: JSON.stringify({
                success: true,
                message: 'Data saved successfully',
            }),
        };
    } catch (error) {
        console.error('Error saving data to DynamoDB:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

const getLeaderboard = async () => {
    try {
        const currentDate = moment();
        const lastWeekDate = moment().subtract(1, 'weeks');

        const paramsCurrent = {
            TableName: 'Weights',
            FilterExpression: 'date >= :currentStartOfWeek',
            ExpressionAttributeValues: {
                ':currentStartOfWeek': currentDate.startOf('week').toISOString(),
            },
        };

        const paramsLastWeek = {
            TableName: 'Weights',
            FilterExpression: 'date >= :lastWeekStartOfWeek',
            ExpressionAttributeValues: {
                ':lastWeekStartOfWeek': lastWeekDate.startOf('week').toISOString(),
            },
        };

        const currentWeekData = await dynamoDb.scan(paramsCurrent).promise();
        const lastWeekData = await dynamoDb.scan(paramsLastWeek).promise();

        if (!currentWeekData.Items.length || !lastWeekData.Items.length) {
            return { statusCode: 200, body: JSON.stringify([]) };
        }

        // Logic to calculate leaderboard...
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