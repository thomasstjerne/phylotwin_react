import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

const DEV_USER = {
  userName: 'dev_user',
  token: 'dev_token'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Check if we have a stored user
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // Persist user data
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = async (credentials) => {
    if (process.env.REACT_APP_DEV_MODE === 'true') {
      // In dev mode, simulate successful login
      setUser(DEV_USER);
      return Promise.resolve(DEV_USER);
    }

    // In production, this would make a real API call
    try {
      // TODO: Replace with actual API call
      const response = await Promise.resolve({
        userName: credentials.username,
        token: 'sample_token'
      });
      setUser(response);
      return response;
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
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