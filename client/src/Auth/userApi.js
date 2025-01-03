import base64 from "base-64";
import config from "../config";
import axios from "axios";

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

export const JWT_STORAGE_NAME = "phylonext_auth_token";

export const axiosWithAuth = axios.create();

axiosWithAuth.interceptors.response.use(
  (res) => { 
    // extend login
    if(res?.headers?.token){
      axiosWithAuth.defaults.headers.common["Authorization"] = `Bearer ${res?.headers?.token}`;
      storeToken(res?.headers?.token)
    }
    return res;
  });
  
const storeToken = (jwt) => {
  sessionStorage.setItem(JWT_STORAGE_NAME, jwt);
  localStorage.setItem(JWT_STORAGE_NAME, jwt);    
}
export const authenticate = async (username, password) => {
  return axios(`${config.authWebservice}/login`, {
    headers: {
      Authorization: `Basic ${base64.encode(username + ":" + password)}`,
    },
  })
    .then((res) => {
      //  localStorage.setItem('col_plus_auth_token', res.data)
      if(res?.data?.token){
        axiosWithAuth.defaults.headers.common["Authorization"] = `Bearer ${res?.data?.token}`;
      }
      return res?.data;
    })
   
};

export const refreshLogin = async () => {
  try {
    await axiosWithAuth.post(`${config.authWebservice}/whoami`)
  } catch (err) {
    logout()
  }
}

export const logout = () => {
  localStorage.removeItem(JWT_STORAGE_NAME);
  sessionStorage.removeItem(JWT_STORAGE_NAME);
  // Unset Authorization header after logout
  axiosWithAuth.defaults.headers.common["Authorization"] = "";
};

export const getTokenUser = () => {
  // Development mode bypass
  if (process.env.REACT_APP_DEV_MODE === 'true') {
    return {
      username: process.env.REACT_APP_DEV_USER || 'dev_user',
      token: process.env.REACT_APP_DEV_TOKEN || 'mock_token'
    };
  }

  // Original production code
  const jwt = localStorage.getItem(JWT_STORAGE_NAME) || sessionStorage.getItem(JWT_STORAGE_NAME);
  if (jwt) {
    return decode(jwt);
  }
  return null;
};

// use sessionstorage for the session, but save in local storage if user choose to be remembered
const jwt = localStorage.getItem(JWT_STORAGE_NAME);
if (jwt) {
  sessionStorage.setItem(JWT_STORAGE_NAME, jwt);
  //const jwt = sessionStorage.getItem(JWT_STORAGE_NAME);

  axiosWithAuth.defaults.headers.common["Authorization"] = `Bearer ${jwt}`;

  getTokenUser(); // will log the user out if the token has expired
}


