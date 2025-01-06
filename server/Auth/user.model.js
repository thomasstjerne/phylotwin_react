'use strict';
const config = require('../config');
const axios = require('axios');

module.exports = {
    login: login,
    getFromToken: getFromToken
};

async function login(auth) {
    try {
        const response = await axios({
            url: `${config.GBIF_API}user/login`,
            method: 'GET',
            headers: {
                authorization: auth
            }
        });
        return response.data;
    } catch (error) {
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