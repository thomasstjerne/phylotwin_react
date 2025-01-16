import axios from 'axios';

const axiosWithAuth = axios.create();

// Add a request interceptor to add auth token
axiosWithAuth.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosWithAuth; 