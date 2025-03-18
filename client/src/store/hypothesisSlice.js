import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  drawingMode: null, // 'reference', 'test', or null
  referenceArea: {
    type: 'FeatureCollection',
    features: []
  },
  testArea: {
    type: 'FeatureCollection',
    features: []
  },
  testResults: null,
  testStatus: 'idle', // 'idle', 'loading', 'success', 'error'
  error: null,
  resultsOpacity: 0.5, // Default opacity for results layers when hypothesis testing is active
  hypothesisTestResults: null // Store the results of the hypothesis test
};

const hypothesisSlice = createSlice({
  name: 'hypothesis',
  initialState,
  reducers: {
    setDrawingMode: (state, action) => {
      state.drawingMode = action.payload;
    },
    addReferenceFeature: (state, action) => {
      // Add areaType property to the feature
      const feature = {
        ...action.payload,
        properties: {
          ...action.payload.properties,
          areaType: 'reference'
        }
      };
      state.referenceArea.features.push(feature);
    },
    addTestFeature: (state, action) => {
      // Add areaType property to the feature
      const feature = {
        ...action.payload,
        properties: {
          ...action.payload.properties,
          areaType: 'test'
        }
      };
      state.testArea.features.push(feature);
    },
    clearReferenceArea: (state) => {
      state.referenceArea.features = [];
    },
    clearTestArea: (state) => {
      state.testArea.features = [];
    },
    setTestResults: (state, action) => {
      state.testResults = action.payload;
      state.testStatus = 'success';
    },
    setTestStatus: (state, action) => {
      state.testStatus = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.testStatus = 'error';
    },
    setResultsOpacity: (state, action) => {
      state.resultsOpacity = action.payload;
    },
    setHypothesisTestResults: (state, action) => {
      state.hypothesisTestResults = action.payload;
      console.log('Hypothesis test results stored in Redux:', action.payload);
    },
    resetHypothesis: (state) => {
      return initialState;
    }
  }
});

export const {
  setDrawingMode,
  addReferenceFeature,
  addTestFeature,
  clearReferenceArea,
  clearTestArea,
  setTestResults,
  setTestStatus,
  setError,
  setResultsOpacity,
  setHypothesisTestResults,
  resetHypothesis
} = hypothesisSlice.actions;

export default hypothesisSlice.reducer; 