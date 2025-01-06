import { createStore, combineReducers, applyMiddleware } from 'redux';
import { keplerGlReducer, enhanceReduxMiddleware } from 'kepler.gl';

const customizedKeplerGlReducer = keplerGlReducer.initialState({
  uiState: {
    // Add custom UI state configuration here
    readOnly: false,
    currentModal: null
  }
});

const reducers = combineReducers({
  keplerGl: customizedKeplerGlReducer
});

const store = createStore(
  reducers,
  {},
  enhanceReduxMiddleware([])
);

export default store; 