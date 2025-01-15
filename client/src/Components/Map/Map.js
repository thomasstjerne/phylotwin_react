import React, { useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { Draw, Modify, Snap } from 'ol/interaction';
import { get } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Fill, Stroke } from 'ol/style';
import 'ol/ol.css';
import { updateDrawnItems } from '../../store/mapSlice';

// Import the swipe control from ol-ext
import 'ol-ext/dist/ol-ext.css';
import Swipe from 'ol-ext/control/Swipe';

const MapComponent = () => {
  const mapRef = useRef();
  const mapInstanceRef = useRef(null);
  const vectorSourceRef = useRef(null);
  const drawRef = useRef(null);
  const snapRef = useRef(null);
  const modifyRef = useRef(null);
  const swipeControlRef = useRef(null);
  const resultsLayersRef = useRef([]);
  const dispatch = useDispatch();

  // Get state from Redux
  const areaSelectionMode = useSelector(state => state.map.areaSelectionMode);
  const selectedIndices = useSelector(state => state.visualization?.selectedIndices || []);
  const colorPalette = useSelector(state => state.visualization?.colorPalette);
  const useQuantiles = useSelector(state => state.visualization?.useQuantiles);
  const valueRange = useSelector(state => state.visualization?.valueRange);
  const minRecords = useSelector(state => state.visualization?.minRecords);
  const resultsGeoJSON = useSelector(state => state.results?.geoJSON);

  // Function to convert features to GeoJSON
  const featuresToGeoJSON = () => {
    if (!vectorSourceRef.current) return null;
    
    const features = vectorSourceRef.current.getFeatures();
    if (features.length === 0) return null;

    const geoJSONFormat = new GeoJSON();
    const featureCollection = {
      type: 'FeatureCollection',
      features: features.map(feature => {
        const clonedGeometry = feature.getGeometry().clone();
        clonedGeometry.transform('EPSG:3857', 'EPSG:4326');
        return {
          type: 'Feature',
          geometry: geoJSONFormat.writeGeometryObject(clonedGeometry),
          properties: feature.getProperties()
        };
      })
    };

    console.log('Generated GeoJSON from features:', featureCollection);
    return featureCollection;
  };

  // Color schemes for different metric types
  const colorSchemes = {
    sequential: (value, min, max) => {
      const t = (value - min) / (max - min);
      return `rgba(72, 118, 255, ${0.2 + t * 0.8})`; // Blue with varying opacity
    },
    diverging: (value, min, max) => {
      const mid = (max + min) / 2;
      const t = (value - min) / (max - min);
      if (value < mid) {
        return `rgba(255, 0, 0, ${0.2 + t * 0.8})`; // Red for negative
      }
      return `rgba(72, 118, 255, ${0.2 + t * 0.8})`; // Blue for positive
    },
    canape: (value) => {
      const colors = {
        1: "#FF0000", // Neo-endemism
        2: "#4876FF", // Paleo-endemism
        0: "#FAFAD2", // Not significant
        3: "#CB7FFF", // Mixed endemism
        4: "#9D00FF"  // Super endemism
      };
      return colors[value] || "#808080"; // Gray for missing values
    }
  };

  // Style function for results layer
  const getResultStyle = (feature, indexId, palette, useQuantiles, valueRange, minRecords) => {
    const value = feature.get(indexId);
    const numRecords = feature.get('NumRecords') || 0;
    
    // Hide cells with too few records
    if (numRecords < minRecords) {
      return null;
    }

    // Get all values for the selected index to calculate min/max
    const allValues = vectorSourceRef.current.getFeatures()
      .map(f => f.get(indexId))
      .filter(v => v !== undefined && v !== null);
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // Get color based on value and palette type
    let fillColor;
    if (indexId === 'canape') {
      fillColor = colorSchemes.canape(value);
    } else if (indexId.startsWith('ses.')) {
      fillColor = colorSchemes.diverging(value, min, max);
    } else {
      fillColor = colorSchemes.sequential(value, min, max);
    }

    return new Style({
      fill: new Fill({
        color: fillColor
      }),
      stroke: new Stroke({
        color: fillColor.replace(/[^,]+\)/, '1)'), // Make stroke fully opaque
        width: 1
      })
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapInstanceRef.current) {
      // Create vector source and layer for drawing
      vectorSourceRef.current = new VectorSource();
      const vector = new VectorLayer({
        source: vectorSourceRef.current,
        style: {
          'fill-color': 'rgba(255, 255, 255, 0.2)',
          'stroke-color': '#ffcc33',
          'stroke-width': 2,
          'circle-radius': 7,
          'circle-fill-color': '#ffcc33',
        },
      });

      // Create base map layer
      const raster = new TileLayer({
        source: new OSM()
      });

      // Limit multi-world panning
      const extent = get('EPSG:3857').getExtent().slice();
      extent[0] += extent[0];
      extent[2] += extent[2];

      // Create map instance
      mapInstanceRef.current = new Map({
        target: mapRef.current,
        layers: [raster, vector],
        view: new View({
          center: [0, 0],
          zoom: 2,
          projection: 'EPSG:3857',
          extent,
        })
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle drawing interactions
  useEffect(() => {
    if (!mapInstanceRef.current || !vectorSourceRef.current) return;

    // Remove existing interactions
    if (drawRef.current) {
      mapInstanceRef.current.removeInteraction(drawRef.current);
      drawRef.current = null;
    }
    if (snapRef.current) {
      mapInstanceRef.current.removeInteraction(snapRef.current);
      snapRef.current = null;
    }
    if (modifyRef.current) {
      mapInstanceRef.current.removeInteraction(modifyRef.current);
      modifyRef.current = null;
    }

    // Add new interactions if map selection is enabled
    if (areaSelectionMode === 'map') {
      console.log('Map selection mode enabled');
      
      // Add modify interaction
      modifyRef.current = new Modify({ source: vectorSourceRef.current });
      mapInstanceRef.current.addInteraction(modifyRef.current);

      // Add draw interaction
      drawRef.current = new Draw({
        source: vectorSourceRef.current,
        type: 'Polygon'
      });
      mapInstanceRef.current.addInteraction(drawRef.current);

      // Add snap interaction
      snapRef.current = new Snap({ source: vectorSourceRef.current });
      mapInstanceRef.current.addInteraction(snapRef.current);

      // Handle draw events
      const updateStore = () => {
        const geoJSON = featuresToGeoJSON();
        if (geoJSON) {
          console.log('Updating Redux store with GeoJSON:', geoJSON);
          dispatch(updateDrawnItems(geoJSON));
        } else {
          console.log('No features to convert to GeoJSON');
        }
      };

      drawRef.current.on('drawend', () => {
        console.log('Draw ended, updating store');
        setTimeout(updateStore, 0);
      });

      modifyRef.current.on('modifyend', () => {
        console.log('Modify ended, updating store');
        updateStore();
      });
      
      vectorSourceRef.current.on('removefeature', () => {
        console.log('Feature removed, updating store');
        updateStore();
      });
    }

    return () => {
      if (drawRef.current) {
        drawRef.current.setActive(false);
      }
      if (modifyRef.current) {
        modifyRef.current.setActive(false);
      }
      if (snapRef.current) {
        snapRef.current.setActive(false);
      }
    };
  }, [areaSelectionMode, dispatch]);

  // Handle results visualization
  useEffect(() => {
    if (!mapInstanceRef.current || !resultsGeoJSON) return;

    // Remove existing results layers
    resultsLayersRef.current.forEach(layer => {
      mapInstanceRef.current.removeLayer(layer);
    });
    resultsLayersRef.current = [];

    // Remove existing swipe control
    if (swipeControlRef.current) {
      mapInstanceRef.current.removeControl(swipeControlRef.current);
      swipeControlRef.current = null;
    }

    // Create new layers for selected indices
    selectedIndices.forEach((indexId, idx) => {
      const source = new VectorSource({
        features: new GeoJSON().readFeatures(resultsGeoJSON, {
          featureProjection: 'EPSG:3857'
        })
      });

      const layer = new VectorLayer({
        source: source,
        style: (feature) => getResultStyle(
          feature, 
          indexId, 
          colorPalette, 
          useQuantiles, 
          valueRange, 
          minRecords
        )
      });

      mapInstanceRef.current.addLayer(layer);
      resultsLayersRef.current.push(layer);

      // Fit view to layer extent
      if (idx === 0) {
        const extent = source.getExtent();
        mapInstanceRef.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 12
        });
      }
    });

    // Add swipe control if two indices are selected
    if (selectedIndices.length === 2) {
      swipeControlRef.current = new Swipe();
      swipeControlRef.current.set('rightLayer', resultsLayersRef.current[1]);
      mapInstanceRef.current.addControl(swipeControlRef.current);
    }

  }, [resultsGeoJSON, selectedIndices, colorPalette, useQuantiles, valueRange, minRecords]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%' 
      }} 
    />
  );
};

export default MapComponent; 