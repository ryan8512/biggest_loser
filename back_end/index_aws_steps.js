const moment = require('moment');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');

const isLocal = process.env.AWS_SAM_LOCAL === 'true';

let dynamoDb = null;
let dynamoDbService = null;

if(isLocal){
    dynamoDb = new AWS.DynamoDB.DocumentClient({
        region: 'us-east-1',
        endpoint: 'http://host.docker.internal:8000/',
    });
    dynamoDbService = new AWS.DynamoDB({
        region: 'us-east-1',
        endpoint: 'http://host.docker.internal:8000/', 
    });
}else{
    dynamoDb = new AWS.DynamoDB.DocumentClient();
}

// Function to create the "Steps" table if it doesn't exist
async function createTable() {
    if(!isLocal) return;
    const params = {
        TableName: 'Steps',
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
    const statusCode = response.statusCode;
    return {
        statusCode,
        body: response.body,
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
        if (httpMethod === 'POST' && path === '/login_steps') {
            return addCORSHeaders(await loginSteps(event));
        }

        if (httpMethod === 'POST' && path === '/submit_steps') {
            return addCORSHeaders(await submitSteps(event));
        }

        if (httpMethod === 'GET' && path === '/overall_steps_leaderboard') {
            return addCORSHeaders(await getOverallStepsLeaderboard(event));
        }

        if (httpMethod === 'GET' && path === '/weekly_steps_leaderboard') {
            return addCORSHeaders(await getWeeklyStepsLeaderboard(event));
        }

        if (httpMethod === 'GET' && path.startsWith('/user_steps_stats/')) {
            return addCORSHeaders(await getUserStepsStats(event));
        }

        return addCORSHeaders({statusCode: 404, body: JSON.stringify({message: 'Route not found' })});
    } catch (error) {
        console.error('Error:', error);
        return addCORSHeaders({statusCode: 500, body: JSON.stringify({message: 'Internal Server Error' })});
    }
};

const verifyToken = (event) => {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = JSON.parse(event.body)?.token || (authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1]);

    if (!token) {
        throw new Error('Unauthorized: No token provided');
    }

    try {
        return jwt.verify(token, 'your-secret-key');
    } catch (error) {
        throw new Error('Unauthorized: Invalid token');
    }
};

const loginSteps = async (event) => {
    const { username } = JSON.parse(event.body || '{}');

    // Using the same valid usernames as the weight tracking app
    const validUsernames = ["warpedrufus", "mark", "ryan8512", "fitpokiko", "KLazo", "inchieinch", "capumali17", 
                            "elvin6969", "sashimimojo", "mjadonis27", "jbuslig", "vintousan", "sgcalingasan", "fibi", 
                            "jmborja", "anritsumae23", "demi1111", "lawrence", "pmc14", "riev", "jdcastro", "mmoyco", 
                            "erika", "alucido"];
    if (!validUsernames.includes(username)) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Username not found' }),
        };
    }

    const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });

    return {
        statusCode: 200,
        body: JSON.stringify({ token }),
    };
};

const submitSteps = async (event) => {
    try {
        const user = verifyToken(event);
        const { date, steps } = JSON.parse(event.body || '{}');

        if (!date || !steps) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Date and steps are required' }),
            };
        }

        const formattedDate = moment(date, 'YYYY-MM-DD').toDate();

        const params = {
            TableName: 'Steps',
            Item: {
                username: user.username,
                date: formattedDate.toISOString(),
                steps: parseInt(steps),
            },
        };

        await dynamoDb.put(params).promise();

        return {
            statusCode: 201,
            body: JSON.stringify({
                success: true,
                message: 'Steps saved successfully',
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

const getOverallStepsLeaderboard = async () => {
    try {
        const params = {
            TableName: 'Steps',
        };

        const result = await dynamoDb.scan(params).promise();
        const userData = result.Items;

        // Group by username and sum steps
        const userTotals = userData.reduce((acc, item) => {
            const username = item.username;
            if (!acc[username]) {
                acc[username] = 0;
            }
            acc[username] += item.steps;
            return acc;
        }, {});

        // Convert to array and sort by total steps
        const leaderboard = Object.entries(userTotals)
            .map(([username, steps]) => ({ username, steps }))
            .sort((a, b) => b.steps - a.steps)
            .slice(0, 10); // Top 10

        return {
            statusCode: 200,
            body: JSON.stringify(leaderboard),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

const getWeeklyStepsLeaderboard = async () => {
    try {
        const currentDate = moment();
        const startOfWeek = currentDate.clone().startOf('week').toISOString();
        const endOfWeek = currentDate.clone().endOf('week').toISOString();

        const params = {
            TableName: 'Steps',
            FilterExpression: '#date >= :startOfWeek AND #date <= :endOfWeek',
            ExpressionAttributeNames: {
                '#date': 'date',
            },
            ExpressionAttributeValues: {
                ':startOfWeek': startOfWeek,
                ':endOfWeek': endOfWeek,
            },
        };

        const result = await dynamoDb.scan(params).promise();
        const weeklyData = result.Items;

        // Group by username and get maximum steps
        const userMaxSteps = weeklyData.reduce((acc, item) => {
            const username = item.username;
            if (!acc[username] || item.steps > acc[username]) {
                acc[username] = item.steps;
            }
            return acc;
        }, {});

        // Convert to array and sort by maximum steps
        const leaderboard = Object.entries(userMaxSteps)
            .map(([username, steps]) => ({ username, steps }))
            .sort((a, b) => b.steps - a.steps)
            .slice(0, 10); // Top 10

        return {
            statusCode: 200,
            body: JSON.stringify(leaderboard),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

const getUserStepsStats = async (event) => {
    try {
        const username = event.path.split('/').pop();

        // Get all steps for the user
        const params = {
            TableName: 'Steps',
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username
            }
        };

        const result = await dynamoDb.query(params).promise();
        const userData = result.Items;

        // Calculate total steps
        const total_steps = userData.reduce((sum, item) => sum + item.steps, 0);

        // Calculate weekly steps
        const currentDate = moment();
        const startOfWeek = currentDate.clone().startOf('week').toISOString();
        const endOfWeek = currentDate.clone().endOf('week').toISOString();

        const weekly_steps = userData
            .filter(item => item.date >= startOfWeek && item.date <= endOfWeek)
            .reduce((sum, item) => sum + item.steps, 0);

        // Calculate daily average
        const daily_average = userData.length > 0 ? Math.round(total_steps / userData.length) : 0;

        return {
            statusCode: 200,
            body: JSON.stringify({
                total_steps,
                weekly_steps,
                daily_average
            }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};