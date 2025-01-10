import React, { useEffect } from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { AuthProvider, useAuth } from './Auth/AuthContext';
import Layout from './Layout/Layout';
import Home from './Home';
import Run from './Run';
import MyRuns from './MyRuns';
import Workflow from './Workflow';
import ContextProvider from './Components/hoc/ContextProvider';
import { checkAuthStatus } from './Auth/userApi';

const App = () => {
  const { user, logout } = useAuth();

  React.useEffect(() => {
    if (!user) {
      logout();
    }
  }, [user, logout]);

  // Check auth status when app loads
  useEffect(() => {
    const initAuth = async () => {
      try {
        await checkAuthStatus();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      }
    };
    
    initAuth();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="run" element={<Workflow />} />
        <Route path="run/:id" element={<Workflow />} />
        <Route path="myruns" element={<MyRuns />} />
      </Route>
    </Routes>
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
