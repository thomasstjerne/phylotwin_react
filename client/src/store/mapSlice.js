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
      console.log('Updating drawn items in Redux:', action.payload);
      state.drawnItems = action.payload;
    },
    clearDrawnItems: (state) => {
      console.log('Clearing drawn items in Redux');
      state.drawnItems = {
        type: 'FeatureCollection',
        features: []
      };
    },
    setAreaSelectionMode: (state, action) => {
      console.log('Setting area selection mode:', action.payload);
      state.areaSelectionMode = action.payload;
    },
    resetMapState: (state) => {
      return initialState;
    }
  }
});

export const {
  updateMapCenter,
  updateMapZoom,
  updateDrawnItems,
  clearDrawnItems,
  setAreaSelectionMode,
  resetMapState
} = mapSlice.actions;

export default mapSlice.reducer; 