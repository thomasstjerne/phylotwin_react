import React, { useContext } from 'react';
import { authenticate } from './userApi';
import { AppContext } from '../Components/hoc/ContextProvider';

const DevLogin = () => {
  const { login } = useContext(AppContext);

  const handleDevLogin = async () => {
    try {
      await login('dev_user', 'dev_password', true); // Pass remember=true for dev login
      window.location.reload(); // Refresh to ensure all components get updated auth state
    } catch (error) {
      console.error('Dev login failed:', error);
    }
  };

  return (
    <button onClick={handleDevLogin}>
      Dev Login
    </button>
  );
};

export default DevLogin; 