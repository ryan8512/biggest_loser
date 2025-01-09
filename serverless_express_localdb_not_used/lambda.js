const awsServerlessExpress = require('aws-serverless-express');
const app = require('./index_express'); // Import your Express app
const server = awsServerlessExpress.createServer(app);

// Lambda handler function
exports.lambdaHandler = (event, context) => {
    awsServerlessExpress.proxy(server, event, context);
};