import { configureStore } from '@reduxjs/toolkit';
import settingsReducer from './store/settingsSlice';
import mapReducer from './store/mapSlice';
import authReducer from './store/authSlice';
import visualizationReducer from './store/visualizationSlice';
import resultsReducer from './store/resultsSlice';

// Create logger middleware
const logger = store => next => action => {
  console.log('Dispatching:', action);
  const result = next(action);
  console.log('Next State:', store.getState());
  return result;
};

const store = configureStore({
  reducer: {
    settings: settingsReducer,
    map: mapReducer,
    auth: authReducer,
    visualization: visualizationReducer,
    results: resultsReducer
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(logger),
  devTools: process.env.NODE_ENV !== 'production'
});

export default store; 