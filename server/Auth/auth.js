'use strict';
const express = require('express');
const compose = require('composable-middleware');
const User = require('./user.model');

const router = express.Router();

// Middleware
const appendUser = () => async (req, res, next) => {
    try {
        console.log('Auth middleware executing', {
            hasAuthHeader: !!req.headers.authorization,
            isDev: process.env.NODE_ENV === 'development'
        });

        // Development mode bypass
        if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
            req.user = {
                userName: process.env.DEV_USER || 'dev_user',
                token: process.env.DEV_TOKEN || 'mock_token'
            };
            return next();
        }

        // Normal auth flow
        const user = await User.getFromToken(req.headers.authorization);
        if (user) {
            req.user = user;
            res.setHeader('token', user?.token);
        } else {
            res.removeHeader('token');
            delete req.user;
        }
        next();
    } catch (error) {
        console.error('Auth error:', error);
        next(error);
    }
};

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