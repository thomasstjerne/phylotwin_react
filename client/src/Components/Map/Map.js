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
import { getColorScale } from '../../utils/colorScales';
import { selectColorSchemeType } from '../../store/visualizationSlice';

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
  const tooltipRef = useRef(null);
  const hoveredFeatureRef = useRef(null);
  const dispatch = useDispatch();

  // Get state from Redux
  const areaSelectionMode = useSelector(state => state.map.areaSelectionMode);
  const selectedIndices = useSelector(state => state.visualization?.selectedIndices || []);
  const colorPalette = useSelector(state => state.visualization?.colorPalette);
  const useQuantiles = useSelector(state => state.visualization?.useQuantiles);
  const valueRange = useSelector(state => state.visualization?.valueRange);
  const minRecords = useSelector(state => state.visualization?.minRecords);
  const resultsGeoJSON = useSelector(state => state.results?.geoJSON);
  const drawnItems = useSelector(state => state.map.drawnItems);

  // Get color scheme type from Redux
  const colorSchemeType = useSelector(selectColorSchemeType);

  // Create tooltip element
  useEffect(() => {
    if (!tooltipRef.current) {
      const tooltip = document.createElement('div');
      tooltip.className = 'map-tooltip';
      tooltip.style.position = 'fixed';
      document.body.appendChild(tooltip);
      tooltipRef.current = tooltip;
    }

    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
        tooltipRef.current = null;
      }
    };
  }, []);

  // Function to format value for display
  const formatValue = (value) => {
    if (typeof value === 'number') {
      // Check if value is an integer
      return Number.isInteger(value) ? value : value.toFixed(2);
    }
    return value;
  };

  // Function to update tooltip content and position
  const updateTooltip = (pixel, feature) => {
    if (!tooltipRef.current || !feature) {
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
      return;
    }

    const h3Id = feature.get('h3_index');
    if (!h3Id) return;

    let content = `<strong>H3 ID:</strong> ${h3Id}<br/>`;
    
    // Get all properties of the feature
    const properties = feature.getProperties();

    // List of properties to exclude from display
    const excludeProps = ['h3_index', 'geometry'];

    // Add all numeric properties (indices)
    Object.entries(properties)
      .filter(([key, value]) => !excludeProps.includes(key) && typeof value === 'number')
      .sort(([a], [b]) => a.localeCompare(b)) // Sort alphabetically
      .forEach(([key, value]) => {
        const formattedValue = formatValue(value);
        content += `<strong>${key}:</strong> ${formattedValue}<br/>`;
      });

    tooltipRef.current.innerHTML = content;
    tooltipRef.current.style.display = 'block';

    // Use the mouse coordinates directly for positioning
    const x = pixel[0];
    const y = pixel[1];

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Get tooltip dimensions
    const tooltipWidth = tooltipRef.current.offsetWidth;
    const tooltipHeight = tooltipRef.current.offsetHeight;

    // Calculate position, keeping tooltip within viewport
    let left = x + 15; // 15px offset from cursor
    let top = y + 15;

    // Adjust if tooltip would go off right edge
    if (left + tooltipWidth > viewportWidth) {
      left = x - tooltipWidth - 15;
    }

    // Adjust if tooltip would go off bottom edge
    if (top + tooltipHeight > viewportHeight) {
      top = y - tooltipHeight - 15;
    }

    // Apply the position
    tooltipRef.current.style.left = `${left}px`;
    tooltipRef.current.style.top = `${top}px`;
  };

  // Color schemes for different metric types
  const colorSchemes = {
    sequential: (value, min, max) => {
      const t = (value - min) / (max - min);
      return `rgba(72, 118, 255, ${0.4 + t * 0.6})`; // Blue with varying opacity from 0.4 to 1.0
    },
    diverging: (value, min, max) => {
      const mid = (max + min) / 2;
      const t = (value - min) / (max - min);
      if (value < mid) {
        return `rgba(255, 0, 0, ${0.4 + t * 0.6})`; // Red for negative, opacity 0.4-1.0
      }
      return `rgba(72, 118, 255, ${0.4 + t * 0.6})`; // Blue for positive, opacity 0.4-1.0
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
  const getResultStyle = (feature, indexId, palette, useQuantiles, valueRange, minRecords, isHovered = false) => {
    const value = feature.get(indexId);
    const numRecords = feature.get('NumRecords') || 0;
    
    // Hide cells with too few records or invalid values
    if (numRecords < minRecords || value === undefined || value === null || isNaN(value)) {
      return null;
    }

    // Hide cells outside the value range
    if (valueRange && (value < valueRange[0] || value > valueRange[1])) {
      return null;
    }

    // Get all values for the selected index to calculate min/max
    const allValues = vectorSourceRef.current.getFeatures()
      .map(f => f.get(indexId))
      .filter(v => typeof v === 'number' && !isNaN(v));
    
    const min = valueRange ? valueRange[0] : Math.min(...allValues);
    const max = valueRange ? valueRange[1] : Math.max(...allValues);

    // Get color based on value and color scheme type
    let fillColor;

    if (indexId === 'CANAPE') {
      fillColor = colorSchemes.canape(value);
    } else {
      // Get the appropriate color scale based on the type
      const colorScale = getColorScale(colorSchemeType, [min, max], palette);
      
      // Apply the color scale directly to the value
      fillColor = colorScale(value);

      // Add logging for debugging
      console.log('Style calculation:', {
        indexId,
        value,
        min,
        max,
        colorSchemeType,
        palette,
        fillColor
      });
    }

    return new Style({
      fill: new Fill({
        color: fillColor
      }),
      stroke: new Stroke({
        color: isHovered ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0)',
        width: isHovered ? 2 : 0
      })
    });
  };

  // Watch for changes in drawnItems from Redux
  useEffect(() => {
    if (vectorSourceRef.current && drawnItems.features.length === 0) {
      console.log('Clearing vector source due to Redux state change');
      vectorSourceRef.current.clear();
    }
  }, [drawnItems]);

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

      // Add pointer move handler for tooltips
      mapInstanceRef.current.on('pointermove', (evt) => {
        if (evt.dragging) {
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none';
          }
          if (hoveredFeatureRef.current) {
            hoveredFeatureRef.current = null;
            resultsLayersRef.current.forEach(layer => layer.changed());
          }
          return;
        }

        const pixel = mapInstanceRef.current.getEventPixel(evt.originalEvent);
        const hit = mapInstanceRef.current.hasFeatureAtPixel(pixel, {
          layerFilter: layer => resultsLayersRef.current.includes(layer)
        });

        mapInstanceRef.current.getTargetElement().style.cursor = hit ? 'pointer' : '';

        // Handle hover effect and tooltip
        let foundFeature = null;
        mapInstanceRef.current.forEachFeatureAtPixel(pixel, (feature, layer) => {
          if (resultsLayersRef.current.includes(layer)) {
            foundFeature = feature;
            return true;
          }
        }, {
          layerFilter: layer => resultsLayersRef.current.includes(layer)
        });

        // Update hover effect
        if (hoveredFeatureRef.current !== foundFeature) {
          hoveredFeatureRef.current = foundFeature;
          resultsLayersRef.current.forEach(layer => layer.changed());
        }

        // Update tooltip using mouse event coordinates
        updateTooltip([evt.originalEvent.clientX, evt.originalEvent.clientY], foundFeature);
      });

      // Hide tooltip when leaving the map
      mapInstanceRef.current.getViewport().addEventListener('mouseout', () => {
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
        if (hoveredFeatureRef.current) {
          hoveredFeatureRef.current = null;
          resultsLayersRef.current.forEach(layer => layer.changed());
        }
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
          minRecords,
          feature === hoveredFeatureRef.current
        ),
        // Ensure layers are above the base map
        zIndex: idx + 1,
        // Important: ensure the layer is updateWhileAnimating and updateWhileInteracting
        updateWhileAnimating: true,
        updateWhileInteracting: true
      });

      mapInstanceRef.current.addLayer(layer);
      resultsLayersRef.current.push(layer);

      // Fit view to layer extent only once
      if (idx === 0 && source.getFeatures().length > 0) {
        const extent = source.getExtent();
        mapInstanceRef.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 12
        });
      }
    });

    // Add swipe control if two indices are selected
    if (selectedIndices.length === 2) {
      console.log('Setting up swipe control for layers:', selectedIndices);
      
      // Create and configure the swipe control
      swipeControlRef.current = new Swipe({
        // The layer to swipe
        layers: resultsLayersRef.current[1],
        // Set initial position to center
        position: 0.5,
        // Ensure the swipe control is above other elements
        className: 'ol-swipe',
        // Add orientation
        orientation: 'vertical'
      });

      mapInstanceRef.current.addControl(swipeControlRef.current);

      // Force map render when swipe position changes
      swipeControlRef.current.on('moving', function() {
        mapInstanceRef.current.render();
      });
    }

    return () => {
      if (swipeControlRef.current) {
        mapInstanceRef.current.removeControl(swipeControlRef.current);
        swipeControlRef.current = null;
      }
    };

  }, [resultsGeoJSON, selectedIndices, colorPalette, useQuantiles, valueRange, minRecords, colorSchemeType]);

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