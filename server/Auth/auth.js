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
            isDev: process.env.NODE_ENV === 'development',
            devAuthBypass: process.env.DEV_AUTH_BYPASS
        });

        // Development mode bypass
        if (!req.headers.authorization && process.env.NODE_ENV === 'development') {
            console.log('Development mode detected, using dev user');
            req.user = {
                userName: 'dev_user',
                token: 'dev_token'
            };
            return next();
        }

        // Normal auth flow
        if (!req.headers.authorization) {
            throw new Error('No authorization header present');
        }

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
        res.status(401).json({ error: 'Authentication failed', details: error.message });
    }
};

// Routes
router.post('/login', async (req, res) => {
    try {
        const user = await User.login(req.headers.authorization);
        res.json(user);
    } catch (error) {
        console.error('Login error:', error);
        res.sendStatus(error?.response?.status || 403)    }
});

router.get('/me', appendUser(), (req, res) => {
    res.json(req.user);
});

module.exports = {
    router,
    appendUser
};