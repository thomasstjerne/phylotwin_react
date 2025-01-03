'use strict';
const express = require('express');
const cors = require('cors');
const router = express.Router();
const User = require('./user.model');
module.exports = function(app) {
    app.use(cors({exposedHeaders: ['token']}))
    app.use('/auth', router);
};

router.get('/login', function(req, res) {
    // Bypass authentication in development mode
    if(process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
        return res.json({
            username: process.env.DEV_USER || "dev_user",
            token: process.env.DEV_TOKEN || "mock_token"
        });
    }
    
    User.login(req.headers.authorization)
        .then((user) => {
            res.json(user)
        })
        .catch((err) => res.sendStatus(403));
})

router.post('/whoami', function(req, res) {
    // Bypass authentication in development mode
    if(process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
        return res.json({
            username: process.env.DEV_USER || "dev_user",
            token: process.env.DEV_TOKEN || "mock_token"
        });
    }

    User.getFromToken(req.headers.authorization)
        .then((user) => {
            if (user) {
                res.setHeader('token', user?.token);
                res.json(user)
            } else {
                res.removeHeader('token');
                throw "No user"
            }
        })
        .catch((err) => res.sendStatus(403));
})

