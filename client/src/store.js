import { createStore, combineReducers } from 'redux';

// Initial state for the map
const initialMapState = {
    center: [20, 0],
    zoom: 2,
    drawnItems: {
        type: 'FeatureCollection',
        features: []
    },
    areaSelectionMode: null
};

// Initial state for settings
// Note: For diversity indices, we use the 'id' field from the diversityIndices.json vocabulary
// See client/src/Vocabularies/diversityIndices.json for all available options
const initialSettingsState = {
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
    // Record filtering modes:
    // - 'specimen': Includes PRESERVED_SPECIMEN, MATERIAL_SAMPLE, MATERIAL_CITATION, MACHINE_OBSERVATION
    // - 'observation': Additionally includes HUMAN_OBSERVATION and other observation types
    recordFilteringMode: 'specimen',
    yearRange: [1950, 2024],
    // Using 'id' values from diversityIndices.json
    selectedDiversityIndices: ['richness', 'pd'],  // Default: species richness and phylogenetic diversity
    randomizations: 100
};

// Initial state for auth
const initialAuthState = {
    user: null,
    token: null,
    isAuthenticated: false
};

// Map reducer
const mapReducer = (state = initialMapState, action) => {
    switch (action.type) {
        case 'UPDATE_MAP_CENTER':
            return { ...state, center: action.payload };
        case 'UPDATE_MAP_ZOOM':
            return { ...state, zoom: action.payload };
        case 'UPDATE_DRAWN_ITEMS':
            return { ...state, drawnItems: action.payload };
        case 'CLEAR_DRAWN_ITEMS':
            return { 
                ...state, 
                drawnItems: {
                    type: 'FeatureCollection',
                    features: []
                }
            };
        case 'SET_AREA_SELECTION_MODE':
            // Clear drawn items when changing mode
            return { 
                ...state, 
                areaSelectionMode: action.payload,
                ...(action.payload !== 'map' && {
                    drawnItems: {
                        type: 'FeatureCollection',
                        features: []
                    }
                })
            };
        default:
            return state;
    }
};

// Settings reducer
const settingsReducer = (state = initialSettingsState, action) => {
    switch (action.type) {
        case 'UPDATE_SPATIAL_RESOLUTION':
            return { ...state, spatialResolution: action.payload };
        case 'UPDATE_SELECTED_COUNTRIES':
            return { ...state, selectedCountries: action.payload };
        case 'UPDATE_SELECTED_PHYLO_TREE':
            return { ...state, selectedPhyloTree: action.payload };
        case 'UPDATE_TAXONOMIC_FILTERS':
            return { ...state, taxonomicFilters: { ...state.taxonomicFilters, ...action.payload } };
        case 'UPDATE_RECORD_FILTERING_MODE':
            return { ...state, recordFilteringMode: action.payload };
        case 'UPDATE_YEAR_RANGE':
            return { ...state, yearRange: action.payload };
        case 'UPDATE_DIVERSITY_INDICES':
            return { ...state, selectedDiversityIndices: action.payload };
        case 'UPDATE_RANDOMIZATIONS':
            return { ...state, randomizations: action.payload };
        default:
            return state;
    }
};

// Auth reducer
const authReducer = (state = initialAuthState, action) => {
    switch (action.type) {
        case 'SET_USER':
            return {
                ...state,
                user: action.payload,
                isAuthenticated: !!action.payload
            };
        case 'SET_TOKEN':
            return {
                ...state,
                token: action.payload
            };
        case 'LOGOUT':
            return initialAuthState;
        default:
            return state;
    }
};

const reducers = combineReducers({
    map: mapReducer,
    settings: settingsReducer,
    auth: authReducer
});

const store = createStore(
    reducers,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

export default store; 