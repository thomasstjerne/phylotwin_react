import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedIndices: [],
  colorPalette: 'sequential',
  useQuantiles: false,
  valueRange: [0, 100],
  minRecords: 0,
  geoJSON: null
};

const visualizationSlice = createSlice({
  name: 'visualization',
  initialState,
  reducers: {
    setSelectedIndices: (state, action) => {
      state.selectedIndices = action.payload;
    },
    setColorPalette: (state, action) => {
      state.colorPalette = action.payload;
    },
    setUseQuantiles: (state, action) => {
      state.useQuantiles = action.payload;
    },
    setValueRange: (state, action) => {
      state.valueRange = action.payload;
    },
    setMinRecords: (state, action) => {
      state.minRecords = action.payload;
    },
    setGeoJSON: (state, action) => {
      state.geoJSON = action.payload;
    },
    resetVisualization: (state) => {
      return initialState;
    }
  }
});

export const {
  setSelectedIndices,
  setColorPalette,
  setUseQuantiles,
  setValueRange,
  setMinRecords,
  setGeoJSON,
  resetVisualization
} = visualizationSlice.actions;

export default visualizationSlice.reducer; 