import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedIndices: [],
  colorPalette: 'sequential',
  useQuantiles: false,
  valueRange: null,
  minRecords: 0,
  geoJSON: null,
  quantileBins: null
};

// Helper function to calculate quantile bins
const calculateQuantileBins = (values) => {
  if (!values || values.length === 0) {
    console.log('No values provided for quantile calculation');
    return null;
  }
  
  console.log('Calculating quantiles for values:', values.length, 'data points');
  
  // Sort values for percentile calculation
  const sortedValues = [...values].sort((a, b) => a - b);
  
  // Calculate percentiles (20%, 40%, 60%, 80%)
  const bins = [0.2, 0.4, 0.6, 0.8].map(percentile => {
    const index = Math.floor(sortedValues.length * percentile);
    return sortedValues[index];
  });
  
  console.log('Calculated quantile bins:', bins);
  return bins;
};

// Helper function to get quantile category (0-4)
const getQuantileCategory = (value, bins) => {
  if (!bins || value === null || value === undefined) return null;
  
  if (value <= bins[0]) return 0;
  if (value <= bins[1]) return 1;
  if (value <= bins[2]) return 2;
  if (value <= bins[3]) return 3;
  return 4;
};

const visualizationSlice = createSlice({
  name: 'visualization',
  initialState,
  reducers: {
    setSelectedIndices: (state, action) => {
      state.selectedIndices = action.payload.slice(0, 2);
      // Recalculate quantile bins if needed
      if (state.useQuantiles && state.geoJSON && state.selectedIndices.length === 1) {
        console.log('Recalculating quantiles after index selection:', state.selectedIndices[0]);
        const values = state.geoJSON.features
          .map(f => f.properties[state.selectedIndices[0]])
          .filter(v => typeof v === 'number' && !isNaN(v));
        state.quantileBins = calculateQuantileBins(values);
      }
    },
    setColorPalette: (state, action) => {
      state.colorPalette = action.payload;
    },
    setUseQuantiles: (state, action) => {
      state.useQuantiles = action.payload;
      console.log('Quantile mode toggled:', action.payload);
      
      // Calculate quantile bins when enabled
      if (action.payload && state.geoJSON && state.selectedIndices.length === 1) {
        console.log('Calculating quantiles for index:', state.selectedIndices[0]);
        const values = state.geoJSON.features
          .map(f => f.properties[state.selectedIndices[0]])
          .filter(v => typeof v === 'number' && !isNaN(v));
        console.log('Found values for quantile calculation:', values.length);
        state.quantileBins = calculateQuantileBins(values);
      } else {
        console.log('Clearing quantile bins');
        state.quantileBins = null;
      }
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
        console.log('Setting GeoJSON with features:', action.payload.features.length);
        
        // Calculate quantile bins if needed
        if (state.useQuantiles && state.selectedIndices.length === 1) {
          console.log('Calculating quantiles after GeoJSON update for index:', state.selectedIndices[0]);
          const values = action.payload.features
            .map(f => f.properties[state.selectedIndices[0]])
            .filter(v => typeof v === 'number' && !isNaN(v));
          console.log('Found values for quantile calculation:', values.length);
          state.quantileBins = calculateQuantileBins(values);
        }
        
        // Set value range from all numeric values
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

// Selector to get quantile category for a value
export const selectQuantileCategory = (state, value) => {
  if (!state.visualization.useQuantiles || !state.visualization.quantileBins) {
    return null;
  }
  return getQuantileCategory(value, state.visualization.quantileBins);
};

// Selector to get quantile bins with labels
export const selectQuantileBins = (state) => {
  const bins = state.visualization.quantileBins;
  console.log('selectQuantileBins called, bins:', bins);
  
  if (!bins) return null;
  
  const result = [
    { label: '0-20%', range: [Number.NEGATIVE_INFINITY, bins[0]] },
    { label: '20-40%', range: [bins[0], bins[1]] },
    { label: '40-60%', range: [bins[1], bins[2]] },
    { label: '60-80%', range: [bins[2], bins[3]] },
    { label: '80-100%', range: [bins[3], Number.POSITIVE_INFINITY] }
  ];
  
  console.log('Formatted quantile bins:', result);
  return result;
};

export default visualizationSlice.reducer; 