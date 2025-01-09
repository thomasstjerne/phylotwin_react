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

const reducers = combineReducers({
    map: mapReducer
});

const store = createStore(
    reducers,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

export default store; 