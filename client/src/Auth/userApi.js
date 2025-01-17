import axios from 'axios';
import base64 from 'base-64';
import config from '../config';
import { setUserInRedux, setTokenInRedux, logoutFromRedux } from './authService';

// Constants
export const JWT_STORAGE_NAME = "phylonext_auth_token";

// Create axios instance with auth header
export const axiosWithAuth = axios.create({
  baseURL: config.phylonextWebservice,
  withCredentials: true
});

// Decode JWT token
const decode = (jwt) => {
  try {
    const base64Url = jwt.split('.')[1];
    const base64Str = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64Str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch(e) {
    return null;
  }
};

// Intercept requests to add auth token
axiosWithAuth.interceptors.request.use(
  (config) => {
    // In development mode, add a dev token
    if (process.env.REACT_APP_DEV_MODE === 'true') {
      config.headers.Authorization = `Bearer ${process.env.REACT_APP_DEV_TOKEN || 'dev_token'}`;
      return config;
    }

    // In production, use stored token
    const token = localStorage.getItem(JWT_STORAGE_NAME);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication functions
export const authenticate = async (username, password) => {
  // In development mode, return mock response
  if (process.env.REACT_APP_DEV_MODE === 'true') {
    const mockResponse = {
      token: process.env.REACT_APP_DEV_TOKEN || 'dev_token',
      user: {
        userName: process.env.REACT_APP_DEV_USER || 'dev_user'
      }
    };
    return Promise.resolve(mockResponse);
  }

  // In production, make real API call
  const response = await axios.post(`${config.authWebservice}/login`, {}, {
    headers: {
      Authorization: `Basic ${base64.encode(username + ":" + password)}`,
    },
  });

  const { token, user } = response.data;
  
  // Store token
  localStorage.setItem(JWT_STORAGE_NAME, token);
  sessionStorage.setItem(JWT_STORAGE_NAME, token);
  
  // Update Redux store
  setUserInRedux(user);
  setTokenInRedux(token);
  
  return response.data;
};

export const login = authenticate; // Alias for authenticate

export const refreshLogin = async () => {
  try {
    const response = await axiosWithAuth.post(`${config.authWebservice}/whoami`);
    if (response?.data?.token) {
      localStorage.setItem(JWT_STORAGE_NAME, response.data.token);
      setTokenInRedux(response.data.token);
    }
    return response.data;
  } catch (error) {
    logout();
    throw error;
  }
};

export const checkAuthStatus = async () => {
  try {
    const token = localStorage.getItem(JWT_STORAGE_NAME);
    if (!token) {
      return null;
    }

    const response = await axios.get(`${config.authWebservice}/check`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Update Redux store with user data
    setUserInRedux(response.data.user);
    setTokenInRedux(token);

    return response.data;
  } catch (error) {
    localStorage.removeItem(JWT_STORAGE_NAME);
    sessionStorage.removeItem(JWT_STORAGE_NAME);
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem(JWT_STORAGE_NAME);
  sessionStorage.removeItem(JWT_STORAGE_NAME);
  logoutFromRedux();
};

export const getTokenUser = () => {
  // Development mode bypass
  if (process.env.REACT_APP_DEV_MODE === 'true') {
    return {
      username: process.env.REACT_APP_DEV_USER || 'dev_user',
      token: process.env.REACT_APP_DEV_TOKEN || 'mock_token'
    };
  }

  const jwt = localStorage.getItem(JWT_STORAGE_NAME) || sessionStorage.getItem(JWT_STORAGE_NAME);
  if (jwt) {
    return decode(jwt);
  }
  return null;
};

// Make sure all necessary functions are exported
export {
  authenticate as default,  // Default export
};


