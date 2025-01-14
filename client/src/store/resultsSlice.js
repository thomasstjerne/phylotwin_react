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
      state.status = action.payload;
    },
    setIndices: (state, action) => {
      state.indices = action.payload;
    },
    setGeoJSON: (state, action) => {
      state.geoJSON = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setJobId: (state, action) => {
      state.jobId = action.payload;
    },
    resetResults: (state) => {
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