import base64 from "base-64";
import config from "../config";
import axios from "axios";
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
  const jwt = sessionStorage.getItem(JWT_STORAGE_NAME);
  if (jwt) {
    const user = JSON.parse(base64.decode(jwt.split(".")[1]));
    // is the token still valid - if not then delete it. This of course is only to ensure the client knows that the token has expired. any authenticated requests would fail anyhow
    if (new Date(user.exp * 1000).toISOString() < new Date().toISOString()) {
      logout();
    }
    return user;
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


