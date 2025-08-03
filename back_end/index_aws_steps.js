const moment = require('moment');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');

const isLocal = process.env.AWS_SAM_LOCAL === 'true';
const BUCKET_NAME = 'biggestloser8152-steps'; // S3 bucket for steps photos

let dynamoDb = null;
let dynamoDbService = null;
const s3 = new AWS.S3();
const TABLE_NAME = process.env.STEPS_TABLE || 'Steps';

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
        TableName: TABLE_NAME,
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

        if (httpMethod === 'POST' && path === '/submit_photo_proof') {
            return addCORSHeaders(await submitPhotoProof(event));
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
    const validUsernames = [
        "feetpokiko", "kierc", "elvin6969", "edgar", "inchieinch", "mark", "jdcastro", 
        "jan", "atrin", "jbuslig", "alucido", "caryllll", "m3ow", "yugi14", "divine", "capumali17", 
        "gryan", "riev", "ryan8512","lawrence","mjadonis27", "vintousan", "demi1111", "sashimimojo","krn",
        "rumali","androidiee","erika","fibi"
    ];
    
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
        const { date, endDate, steps, type } = JSON.parse(event.body || '{}');

        if (!date || !steps || !type) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Date, steps, and type are required' }),
            };
        }

        if (type === 'weekly' && !endDate) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'End date is required for weekly submissions' }),
            };
        }

        const params = {
            TableName: TABLE_NAME,
            Item: {
                username: user.username,
                date: date,
                steps: parseInt(steps),
                type: type,
                ...(type === 'weekly' && { endDate: endDate })
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

const submitPhotoProof = async (event) => {
    try {
        const user = verifyToken(event);
        
        // Parse multipart form data
        const boundary = event.headers['Content-Type'].split('=')[1];
        const parts = event.body.split(boundary);
        const photoData = parts.find(part => part.includes('name="photo"'));
        
        if (!photoData) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'No photo provided' }),
            };
        }

        // Extract file content and metadata
        const fileContent = Buffer.from(photoData.split('\r\n\r\n')[1], 'binary');
        const timestamp = new Date().toISOString();
        const key = `${user.username}/${timestamp}.jpg`;

        // Upload to S3
        await s3.putObject({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ContentType: 'image/jpeg'
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Photo uploaded successfully',
                url: `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`
            }),
        };
    } catch (error) {
        console.error('Error:', error);
        if (error.message.includes('Unauthorized')) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: error.message }),
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error uploading photo' }),
        };
    }
};

const leaderboard_step_logic = (userData, overall) => {
    const usernameToName = {
        "feetpokiko": "Francis",
        "kierc": "Kierc",
        "elvin6969": "Elvin",
        "edgar": "Edgar",
        "inchieinch": "Inch",
        "mark": "Mark",
        "jdcastro": "Justine",
        "jan": "Jan",
        "atrin": "Kay",
        "jbuslig": "Joshua",
        "alucido": "Alvin",
        "caryllll": "Caryll",
        "m3ow": "Nathanael",
        "yugi14": "Mehar",
        "divine": "Divine",
        "capumali17": "Coleen",
        "gryan": "Gryan",
        "riev": "Gerard",
        "ryan8512": "Sam",
        "lawrence" : "Lawrence",
        "mjadonis27" : "Jonas",
        "vintousan": "Vincent",
        "demi1111": "Demi",
        "sashimimojo": "PauGab",
        "krn": "Karen",
        "rumali": "Romeo",
        "androidiee": "A-Jay",
        "erika":"Erika",
        "fibi": "Phoebe"
    };
    

    const userStepsMap = {};
        
    for (const item of userData) {
        const { username, steps, type } = item;

        if (!userStepsMap[username]) {
            userStepsMap[username] = { steps: 0, hasWeekly: false };
        }

        if(overall == 1){
            userStepsMap[username].steps += steps;
        }else{
            if (type === 'weekly') {
                userStepsMap[username] = { steps, hasWeekly: true };
            } else if (type === 'daily' && !userStepsMap[username].hasWeekly) {
                userStepsMap[username].steps += steps;
            }
        }
    }

    const leaderboard = Object.entries(userStepsMap)
        .map(([username, { steps }]) => ({
            username: usernameToName[username] || username,  // Get name from usernameToName or fall back to username
            steps
        }))
        .sort((a, b) => b.steps - a.steps)
        .slice(0, 15); // Limit to top 15

    return {
        statusCode: 200,
        body: JSON.stringify(leaderboard),
    };
}

const getOverallStepsLeaderboard = async (event) => {
    try {
        // Get week_offset from query parameters, default to 0 (current week)
        const monthOffset = parseInt(event.queryStringParameters?.month_offset || '0');
        
        const currentDate = moment();
        const targetDate = currentDate.clone().subtract(monthOffset, 'month');
        const startOfMonth = targetDate.clone().startOf('month').format('YYYY-MM-DD');
        const endOfMonth = targetDate.clone().endOf('month').format('YYYY-MM-DD');

        const params = {
            TableName: TABLE_NAME,
            FilterExpression: '#date >= :startOfMonth AND #date <= :endOfMonth',
            ExpressionAttributeNames: {
                '#date': 'date',
            },
            ExpressionAttributeValues: {
                ':startOfMonth': startOfMonth,
                ':endOfMonth': endOfMonth,
            },
        };

        const result = await dynamoDb.scan(params).promise();
        const userData = result.Items;

        return leaderboard_step_logic(userData, 1);
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

const getWeeklyStepsLeaderboard = async (event) => {
    try {
        // Get week_offset from query parameters, default to 0 (current week)
        const weekOffset = parseInt(event.queryStringParameters?.week_offset || '0');
        
        const currentDate = moment();
        const targetDate = currentDate.clone().subtract(weekOffset, 'weeks');
        const startOfWeek = targetDate.clone().startOf('week').format('YYYY-MM-DD');
        const endOfWeek = targetDate.clone().endOf('week').format('YYYY-MM-DD');

        const params = {
            TableName: TABLE_NAME,
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

        return leaderboard_step_logic(weeklyData, 0);

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
            TableName: TABLE_NAME,
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username
            }
        };

        const result = await dynamoDb.query(params).promise();
        const userData = result.Items;

        // Calculate total steps
        const total_steps = userData.reduce((sum, item) => sum + item.steps, 0);

        // Calculate weekly steps (current week)
        const currentDate = moment();
        const startOfWeek = currentDate.clone().startOf('week').format('YYYY-MM-DD');
        const endOfWeek = currentDate.clone().endOf('week').format('YYYY-MM-DD');

        const weekly_steps = userData
            .filter(item => item.date >= startOfWeek && item.date <= endOfWeek)
            .reduce((sum, item) => sum + item.steps, 0);

        // Calculate daily average (using all entries)
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