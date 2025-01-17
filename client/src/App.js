import React, { useEffect } from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { AuthProvider, useAuth } from './Auth/AuthContext';
import Layout from './Layout/Layout';
import Home from './Home';
import Workflow from './Workflow';
import ContextProvider from './Components/hoc/ContextProvider';
import JobStatusPoller from './Components/JobStatusPoller';
import { checkAuthStatus } from './Auth/userApi';
import MyRuns from './MyRuns';

const App = () => {
  const { user, logout } = useAuth();

  // Only check auth status in production mode
  React.useEffect(() => {
    if (!user && process.env.REACT_APP_DEV_MODE !== 'true') {
      logout();
    }
  }, [user, logout]);

  // Check auth status when app loads (only in production)
  useEffect(() => {
    if (process.env.REACT_APP_DEV_MODE !== 'true') {
      const initAuth = async () => {
        try {
          await checkAuthStatus();
        } catch (error) {
          console.error('Failed to initialize auth:', error);
        }
      };
      
      initAuth();
    }
  }, []);

  return (
    <>
      <JobStatusPoller />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="run" element={<Workflow />} />
          <Route path="run/:id" element={<Workflow />} />
          <Route path="myruns" element={<MyRuns />} />
        </Route>
      </Routes>
    </>
  );
};

const AppWrapper = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <ContextProvider>
            <App />
          </ContextProvider>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
};

export default AppWrapper;
