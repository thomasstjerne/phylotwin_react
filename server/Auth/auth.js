'use strict';
const express = require('express');
const compose = require('composable-middleware');
const User = require('./user.model');

const router = express.Router();

// Middleware
function appendUser() {
    return compose()
        .use(async (req, res, next) => {
            try {
                const user = await User.getFromToken(req.headers.authorization);
                if (user) {
                    req.user = user;
                    res.setHeader('token', user?.token);
                } else {
                    res.removeHeader('token');
                    delete req.user;
                }
                next();
            } catch (err) {
                res.sendStatus(err.statusCode || 500);
            }
        });
}

// Routes
router.post('/login', async (req, res) => {
    try {
        const user = await User.login(req.headers.authorization);
        res.json(user);
    } catch (error) {
        res.status(error.statusCode || 500).json(error);
    }
});

router.get('/me', appendUser(), (req, res) => {
    res.json(req.user);
});

module.exports = {
    router,
    appendUser
};