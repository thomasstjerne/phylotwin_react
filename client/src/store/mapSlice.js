import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  center: [20, 0],
  zoom: 2,
  drawnItems: {
    type: 'FeatureCollection',
    features: []
  },
  areaSelectionMode: null
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    updateMapCenter: (state, action) => {
      state.center = action.payload;
    },
    updateMapZoom: (state, action) => {
      state.zoom = action.payload;
    },
    updateDrawnItems: (state, action) => {
      state.drawnItems = action.payload;
    },
    clearDrawnItems: (state) => {
      state.drawnItems = {
        type: 'FeatureCollection',
        features: []
      };
    },
    setAreaSelectionMode: (state, action) => {
      state.areaSelectionMode = action.payload;
      // Clear drawn items when changing mode (except for map mode)
      if (action.payload !== 'map') {
        state.drawnItems = {
          type: 'FeatureCollection',
          features: []
        };
      }
    }
  }
});

export const {
  updateMapCenter,
  updateMapZoom,
  updateDrawnItems,
  clearDrawnItems,
  setAreaSelectionMode
} = mapSlice.actions;

export default mapSlice.reducer; 