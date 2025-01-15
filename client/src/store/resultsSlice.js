import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'idle', // 'idle' | 'running' | 'completed' | 'failed'
  indices: [],
  geoJSON: null,
  error: null,
  jobId: null
};

const resultsSlice = createSlice({
  name: 'results',
  initialState,
  reducers: {
    setPipelineStatus: (state, action) => {
      console.log('Setting pipeline status:', action.payload);
      state.status = action.payload;
    },
    setIndices: (state, action) => {
      console.log('Setting indices:', action.payload);
      state.indices = action.payload;
    },
    setGeoJSON: (state, action) => {
      console.log('Setting GeoJSON:', {
        type: action.payload?.type,
        featureCount: action.payload?.features?.length
      });
      state.geoJSON = action.payload;
    },
    setError: (state, action) => {
      console.log('Setting error:', action.payload);
      state.error = action.payload;
    },
    setJobId: (state, action) => {
      console.log('Setting job ID:', action.payload);
      state.jobId = action.payload;
    },
    resetResults: (state) => {
      console.log('Resetting results state');
      return initialState;
    }
  }
});

export const {
  setPipelineStatus,
  setIndices,
  setGeoJSON,
  setError,
  setJobId,
  resetResults
} = resultsSlice.actions;

export default resultsSlice.reducer; 