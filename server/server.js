const express = require('express');
const app = express();
const addRequestId = require('express-request-id')();
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Initialize required directories
const initDirectories = () => {
    const dirs = [
        config.OUTPUT_PATH,
        config.PERSISTANT_ACCESS_PATH,
        path.dirname(config.DB_LOCATION)
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });
};

// Initialize directories before starting the server
initDirectories();

app.use(addRequestId);
app.use(bodyParser.json({
    limit: '1mb'
}));

// Add headers before the routes are defined
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Pass to next layer of middleware
    next();
});

require('./Auth/auth.controller')(app);
require('./runs')(app);
require('./results')(app);
require('./citation')(app);

http.listen(config.EXPRESS_PORT, function() {
    console.log('Express server listening on port ' + config.EXPRESS_PORT);
});