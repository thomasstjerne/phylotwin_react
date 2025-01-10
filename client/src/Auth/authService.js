import store from '../store';

export const setUserInRedux = (user) => {
    store.dispatch({ type: 'SET_USER', payload: user });
};

export const setTokenInRedux = (token) => {
    store.dispatch({ type: 'SET_TOKEN', payload: token });
};

export const logoutFromRedux = () => {
    store.dispatch({ type: 'LOGOUT' });
}; 