import { configureStore } from '@reduxjs/toolkit';
import settingsReducer from './store/settingsSlice';
import mapReducer from './store/mapSlice';
import authReducer from './store/authSlice';
import visualizationReducer from './store/visualizationSlice';
import resultsReducer from './store/resultsSlice';

const store = configureStore({
  reducer: {
    settings: settingsReducer,
    map: mapReducer,
    auth: authReducer,
    visualization: visualizationReducer,
    results: resultsReducer
  }
});

export default store; 