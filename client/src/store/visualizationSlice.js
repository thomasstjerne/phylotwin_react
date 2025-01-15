import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedIndices: [],
  colorPalette: 'sequential',
  useQuantiles: false,
  valueRange: null,
  minRecords: 0,
  geoJSON: null
};

const visualizationSlice = createSlice({
  name: 'visualization',
  initialState,
  reducers: {
    setSelectedIndices: (state, action) => {
      state.selectedIndices = action.payload.slice(0, 2);
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
      
      if (action.payload?.features?.length > 0) {
        const allValues = action.payload.features
          .map(f => Object.values(f.properties))
          .flat()
          .filter(v => typeof v === 'number');
        
        if (allValues.length > 0) {
          state.valueRange = [
            Math.min(...allValues),
            Math.max(...allValues)
          ];
        }
      }
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