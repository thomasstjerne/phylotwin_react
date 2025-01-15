const express = require('express');
const app = express();
const addRequestId = require('express-request-id')();
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

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

// Middleware
app.use(cors());
app.use(addRequestId);
app.use(bodyParser.json({
    limit: '1mb'
}));

// Debug middleware
app.use((req, res, next) => {
    if (process.env.DEBUG_REQUESTS === 'true') {
        console.log('\n=== INCOMING REQUEST ===');
        console.log('Method:', req.method);
        console.log('Path:', req.path);
        console.log('Query:', req.query);
        console.log('Headers:', req.headers);
        console.log('======================\n');
    }
    next();
});

// Add headers before the routes are defined
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    next();
});

// Routes
app.use('/api/auth', require('./Auth/auth.controller'));
app.use('/api/phylonext/runs', require('./routes/runs'));
app.use('/api/phylonext/jobs', require('./routes/jobs'));

// Add results routes
require('./results')(app);

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

http.listen(config.EXPRESS_PORT, function() {
    console.log('Express server listening on port ' + config.EXPRESS_PORT);
});