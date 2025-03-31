import React, { createContext, useState, useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setUser as setUserAction, setToken as setTokenAction } from '../store/authSlice';
import {authenticate, JWT_STORAGE_NAME} from './userApi';
const AuthContext = createContext(null);

const DEV_USER = {
  userName: 'dev_user',
  token: 'dev_token'
};

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const [user, setUser] = useState(() => {
    // Check if we have a stored user
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // Persist user data and sync with Redux
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      dispatch(setUserAction(user));
      dispatch(setTokenAction(user.token));
    } else {
      localStorage.removeItem('user');
      dispatch(setUserAction(null));
      dispatch(setTokenAction(null));
    }
  }, [user, dispatch]);

  const login = async (credentials) => {
    if (
      credentials?.isDevUser /* || process.env.REACT_APP_DEV_MODE === true */) {
      // In dev mode, simulate successful login
      setUser(DEV_USER);
      return Promise.resolve(DEV_USER);
    }

    // In production, this would make a real API call
    try {
      // TODO: Replace with actual API call
      const response = await authenticate(credentials.username, credentials.password);
      setUser(response);
      return response;
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem(JWT_STORAGE_NAME);
  sessionStorage.removeItem(JWT_STORAGE_NAME);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 