'use strict';
const config = require('../config');
const axios = require('axios');

module.exports = {
    login: login,
    getFromToken: getFromToken
};

async function login(auth) {
    console.log('auth', auth);
    try {
        const response = await axios(`${config.GBIF_REGISTRY_API}user/login`, {
            headers: {
                authorization: auth
            }
        });
        return response.data;
    } catch (error) {
        console.log(error);
        throw error.response?.data || error;
    }
}

async function getFromToken(auth) {
    try {
        const response = await axios({
            method: 'POST',
            url: `${config.GBIF_REGISTRY_API}user/whoami`,
            headers: {
                authorization: auth
            }
        });
        return {
            ...response.data,
            token: response.headers?.token || ''
        };
    } catch (error) {
        throw error.response?.data || error;
    }
} 