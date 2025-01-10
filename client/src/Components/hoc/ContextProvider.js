import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getTokenUser, authenticate, JWT_STORAGE_NAME } from '../../Auth/userApi';
import { getTrees } from '../../Api';
import { setUserInRedux } from '../../Auth/authService';

// Initializing and exporting AppContext - common for whole application
export const AppContext = React.createContext({});

const ContextProvider = ({ children }) => {
  const dispatch = useDispatch();
  const [user, setUser] = useState(getTokenUser());
  const [loading, setLoading] = useState(false);
  const [runID, setRunID] = useState(null);
  const [step, setStep] = useState(0);
  const [currentTask, setCurrentTask] = useState(null);
  const [preparedTrees, setPreparedTrees] = useState([]);

  // Sync user state with Redux when it changes
  useEffect(() => {
    if (user) {
      setUserInRedux(user);
    }
  }, [user]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [treesResponse] = await Promise.all([getTrees()]);
        setPreparedTrees(treesResponse?.data || []);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  const login = async (username, password, remember) => {
    setLoading(true);
    try {
      const response = await authenticate(username, password);
      const jwt = response.token;
      
      sessionStorage.setItem(JWT_STORAGE_NAME, jwt);
      if (remember) {
        localStorage.setItem(JWT_STORAGE_NAME, jwt);
      }
      
      const userData = getTokenUser();
      setUser(userData);
      setUserInRedux(userData); // Explicitly update Redux
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(JWT_STORAGE_NAME);
    sessionStorage.removeItem(JWT_STORAGE_NAME);
    setUser(null);
    setUserInRedux(null); // Clear Redux state
  };

  // Create context value object
  const contextValue = {
    runID,
    step,
    currentTask,
    user,
    preparedTrees,
    login,
    logout,
    setRunID,
    setStep,
    setCurrentTask,
    loading
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default ContextProvider;
