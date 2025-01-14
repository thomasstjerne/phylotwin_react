import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  spatialResolution: 4,
  selectedCountries: [],
  selectedPhyloTree: null,
  taxonomicFilters: {
    phylum: [],
    class: [],
    order: [],
    family: [],
    genus: []
  },
  recordFilteringMode: 'specimen',
  yearRange: [1950, 2024],
  selectedDiversityIndices: ['richness', 'pd'],
  randomizations: 100
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSpatialResolution: (state, action) => {
      state.spatialResolution = action.payload;
    },
    updateSelectedCountries: (state, action) => {
      state.selectedCountries = action.payload;
    },
    updateSelectedPhyloTree: (state, action) => {
      state.selectedPhyloTree = action.payload;
    },
    updateTaxonomicFilters: (state, action) => {
      state.taxonomicFilters = { ...state.taxonomicFilters, ...action.payload };
    },
    updateRecordFilteringMode: (state, action) => {
      state.recordFilteringMode = action.payload;
    },
    updateYearRange: (state, action) => {
      state.yearRange = action.payload;
    },
    updateDiversityIndices: (state, action) => {
      state.selectedDiversityIndices = action.payload;
    },
    updateRandomizations: (state, action) => {
      state.randomizations = action.payload;
    },
    resetSettings: (state) => {
      return initialState;
    }
  }
});

export const {
  updateSpatialResolution,
  updateSelectedCountries,
  updateSelectedPhyloTree,
  updateTaxonomicFilters,
  updateRecordFilteringMode,
  updateYearRange,
  updateDiversityIndices,
  updateRandomizations,
  resetSettings
} = settingsSlice.actions;

export default settingsSlice.reducer; 