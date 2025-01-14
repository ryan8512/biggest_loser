const moment = require('moment');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const fs = require('fs');
const path_lib = require('path');
const s3 = new AWS.S3();
const BUCKET_NAME = 'biggestloser8152'; // Replace with your S3 bucket name

const isLocal = process.env.AWS_SAM_LOCAL === 'true';

let dynamoDb = null;
let dynamoDbService = null;
console.log(isLocal);

if(isLocal){
    dynamoDb = new AWS.DynamoDB.DocumentClient({
        region: 'us-east-1',
        endpoint: 'http://host.docker.internal:8000/',   //'http://host.docker.internal:8000/'  http://192.168.1.21:8000/
    });
    dynamoDbService = new AWS.DynamoDB({
        region: 'us-east-1',
        endpoint: 'http://host.docker.internal:8000/', 
    });
}else{
    dynamoDb = new AWS.DynamoDB.DocumentClient();
}

// Function to create the "Weights" table if it doesn't exist
async function createTable() {
    if(!isLocal) return;
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

// Helper function to add CORS headers to the response
const addCORSHeaders = (response) => {
    // If the response already has a statusCode, leave it intact, otherwise set default 200
    const statusCode = response.statusCode;

    return {
        statusCode,
        body: JSON.stringify(response.body),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Amz-Security-Token,X-Amz-User-Agent'
        }
    };
};

exports.handler = async (event) => {
    if (isLocal) {
        await createTable();
    }

    const { httpMethod, path } = event;

    try {
        if (httpMethod === 'GET' && path === '/index_form.html') {
            try {
                // Validate the token
                const decodedToken = verifyToken(event);
                const userToken = decodedToken.username;

                // Serve the dynamic page with user-specific data
                return await fetchFileFromS3('index_form.html', 'text/html', userToken);
            } catch (error) {
                return addCORSHeaders({statusCode: 401, message: 'Unauthorized: ' + error.message });
            }
        }

        if (httpMethod === 'POST' && path === '/check-username') {
            return addCORSHeaders(await checkUsername(event));
        }

        if (httpMethod === 'POST' && path === '/check-weight') {
            return addCORSHeaders(await checkWeight(event));
        }

        if (httpMethod === 'GET' && path === '/get-weekly-leaderboard') {
            return addCORSHeaders(await getWeeklyLeaderboard(event));
        }

        if (httpMethod === 'GET' && path === '/get-overall-leaderboard') {
            return addCORSHeaders(await getOverallLeaderboard(event));
        }

        if (httpMethod === 'GET' && path === '/get-user-stat') {
            const decodedToken = verifyToken(event);
            const userToken = decodedToken.username;
            return addCORSHeaders(await getUserStat(userToken));
        }

        return addCORSHeaders({statusCode: 404, message: 'Route not found' });
    } catch (error) {
        console.error('Error:', error);
        return addCORSHeaders({statusCode: 500, message: 'Internal Server Error' });
    }
};
const verifyToken = (event) => {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = event.queryStringParameters?.token || (authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1]);

    if (!token) {
        throw new Error('Unauthorized: No token provided');
    }

    try {
        // Validate the token (using the same secret key)
        return jwt.verify(token, 'your-secret-key');
    } catch (error) {
        throw new Error('Unauthorized: Invalid token');
    }
};

const checkUsername = async (event) => {
    const { username } = JSON.parse(event.body || '{}');

    // Simulate username validation (replace with your database logic)
    const validUsernames = ['johndoe', 'janedoe', 'admin', 'testuser'];
    if (!validUsernames.includes(username)) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Username not found' }),
        };
    }

    // Generate JWT (replace 'your-secret-key' with a secure secret)
    const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });

    return {
        statusCode: 200,
        body: JSON.stringify({ token }),
    };
};

const checkWeight = async (event) => {
    try {
        // Verify token and extract user details
        const user = verifyToken(event);

        // Parse and validate input
        const { date, weight, fat_pctg } = JSON.parse(event.body || '{}');

        if (!date || !weight || !fat_pctg) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'All fields are required' }),
            };
        }

        const formattedDate = moment(date, 'YYYY-MM-DD').startOf('week').toDate();
        const fat_mass = weight * (fat_pctg / 100);

        // Save data to DynamoDB
        const params = {
            TableName: 'Weights', 
            Item: {
                username: user.username, // Use username from the verified token
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
        console.error('Error:', error.message);

        if (error.message.includes('Unauthorized')) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: error.message }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

const getOverallLeaderboard = async () => {
    try {
        const currentDate = moment();
        const lastWeekDate = moment("2025-01-08", "YYYY-MM-DD");

        const paramsCurrent = {
            TableName: 'Weights',
            FilterExpression: '#date >= :currentStartOfWeek',
            ExpressionAttributeNames: {
                '#date': 'date',  // Map #date to the reserved word 'date'
            },
            ExpressionAttributeValues: {
                ':currentStartOfWeek': currentDate.startOf('week').toISOString(),
            },
        };

        const paramsLastWeek = {
            TableName: 'Weights',
            FilterExpression: '#date >= :lastWeekStartOfWeek',
            ExpressionAttributeNames: {
                '#date': 'date',  // Map #date to the reserved word 'date'
            },
            ExpressionAttributeValues: {
                ':lastWeekStartOfWeek': lastWeekDate.startOf('week').toISOString(),
            },
        };

        // Fetch current week and last week data from DynamoDB
        const currentWeekData = await dynamoDb.scan(paramsCurrent).promise();
        const lastWeekData = await dynamoDb.scan(paramsLastWeek).promise();

        return leaderboard_logic(currentWeekData,lastWeekData);

    } catch (err) {
        console.error('Error fetching data:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
}

const getWeeklyLeaderboard = async () => {
    try {
        const currentDate = moment();
        const lastWeekDate = moment().subtract(1, 'weeks');

        const paramsCurrent = {
            TableName: 'Weights',
            FilterExpression: '#date >= :currentStartOfWeek',
            ExpressionAttributeNames: {
                '#date': 'date',  // Map #date to the reserved word 'date'
            },
            ExpressionAttributeValues: {
                ':currentStartOfWeek': currentDate.startOf('week').toISOString(),
            },
        };

        const paramsLastWeek = {
            TableName: 'Weights',
            FilterExpression: '#date >= :lastWeekStartOfWeek',
            ExpressionAttributeNames: {
                '#date': 'date',  // Map #date to the reserved word 'date'
            },
            ExpressionAttributeValues: {
                ':lastWeekStartOfWeek': lastWeekDate.startOf('week').toISOString(),
            },
        };

        // Fetch current week and last week data from DynamoDB
        const currentWeekData = await dynamoDb.scan(paramsCurrent).promise();
        const lastWeekData = await dynamoDb.scan(paramsLastWeek).promise();

        return leaderboard_logic(currentWeekData,lastWeekData);

    } catch (err) {
        console.error('Error fetching data:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};

function leaderboard_logic(currentWeekData,lastWeekData){
    // Ensure that Items exist in both data sets
    if (!currentWeekData.Items || !currentWeekData.Items.length || !lastWeekData.Items || !lastWeekData.Items.length) {
        return { statusCode: 200, body: JSON.stringify([]) };
    }

    // Logic to calculate leaderboard...
    const groupAndAverage = (data) => {
        // Ensure data is an array
        if (!Array.isArray(data)) {
            console.error('Invalid data format', data);
            return [];
        }

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
            avgFatMass: parseFloat((totalFatMass / count).toFixed(2)),
        }));
    };

    const avgCurrentWeekData = groupAndAverage(currentWeekData.Items);  // Use Items here
    const avgLastWeekData = groupAndAverage(lastWeekData.Items);        // Use Items here

    const leaderboard = avgCurrentWeekData
        .map((userThisWeek) => {
            const userLastWeek = avgLastWeekData.find(
                (user) => user.username === userThisWeek.username
            );

            if (userLastWeek) {
                const fatLossPercentage =
                parseFloat(
                    (
                        ((userLastWeek.avgFatMass - userThisWeek.avgFatMass) /
                            userLastWeek.avgFatMass) *100
                    ).toFixed(2)
                );
                return { name: userThisWeek.username, fatLossPercentage };
            }

            return null;
        })
        .filter((entry) => entry !== null);

    const rankedData = leaderboard.sort(
        (a, b) => b.fatLossPercentage - a.fatLossPercentage
    );

    return { statusCode: 200, 
        body: JSON.stringify(rankedData) ,
        headers: { 'Content-Type': 'application/json' }, 
    };
}

// Helper function to read and return file content
function serveFile(filePath, contentType, userToken = null) {
    try {
        let fileContent = fs.readFileSync(filePath, 'utf8');

        if(userToken){
            fileContent = fileContent.replace('<!--modify_username-->', `<b><i>${userToken}</i></b>`);
        }

        return {
            statusCode: 200,
            body: fileContent,
            headers: { 'Content-Type': contentType },
        };
    } catch (err) {
        console.error('Error reading file:', err);
        return {
            statusCode: 500,
            body: 'Internal Server Error',
            headers: { 'Content-Type': 'text/plain' },
        };
    }
}

const getUserStat = async (username) => {
    try {
        // Query parameters to retrieve the most recent record for the given user
        const params = {
            TableName: 'Weights',
            KeyConditionExpression: '#username = :username',  // Query by username
            ExpressionAttributeNames: {
                '#username': 'username',  // Map #username to the reserved word 'username'
            },
            ExpressionAttributeValues: {
                ':username': username,  // Provide the username value
            },
            // Sort by the 'date' field in descending order to get the most recent record
            ScanIndexForward: false,
            Limit: 1,  // Only fetch the latest entry
        };

        // Fetch the user's most recent record from DynamoDB
        const userData = await dynamoDb.query(params).promise();

        if (!userData.Items || userData.Items.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'User not found' }),
            };
        }

        // Extract the latest user's record (most recent date)
        const latestRecord = userData.Items[0];

        // Construct response with relevant user data
        const userStat = {
            username: latestRecord.username,
            date: latestRecord.date,
            weight: latestRecord.weight,
            fat_pctg: latestRecord.fat_pctg,
            fat_mass: latestRecord.fat_mass,
        };

        return {
            statusCode: 200,
            body: JSON.stringify(userStat),
        };
    } catch (err) {
        console.error('Error fetching user data:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};

// Helper function to fetch file from S3
async function fetchFileFromS3(key, contentType, userToken = null) {
    try {
        const s3Params = {
            Bucket: BUCKET_NAME ,
            Key: key,
        };
        const s3Object = await s3.getObject(s3Params).promise();
        let fileContent = s3Object.Body.toString('utf-8');

        if (userToken) {
            fileContent = fileContent.replace('<!--modify_username-->', `<b><i>${userToken}</i></b>`);
        }

        return {
            statusCode: 200,
            body: fileContent,
            headers: { 'Content-Type': contentType },
        };
    } catch (err) {
        console.error('Error fetching file from S3:', err);
        return {
            statusCode: 500,
            body: 'Internal Server Error',
            headers: { 'Content-Type': 'text/plain' },
        };
    }
}