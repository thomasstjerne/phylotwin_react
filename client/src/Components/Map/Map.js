import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useOutletContext } from 'react-router-dom';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { Draw, Modify, Snap } from 'ol/interaction';
import { get } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Fill, Stroke, Circle } from 'ol/style';
import 'ol/ol.css';
import { updateDrawnItems } from '../../store/mapSlice';
import { getColorScale } from '../../utils/colorScales';
import { selectColorSchemeType } from '../../store/visualizationSlice';
import diversityIndices from '../../shared/vocabularies/diversityIndices.json';
import html2canvas from 'html2canvas';

// Import the swipe control from ol-ext
import 'ol-ext/dist/ol-ext.css';
import Swipe from 'ol-ext/control/Swipe';

// Import styles for the legend
import './MapLegend.css';

// Import hypothesis slice
import { 
  addReferenceFeature, 
  addTestFeature 
} from '../../store/hypothesisSlice';

// Legend component
const ColorLegend = ({ 
  colorScale, 
  domain, 
  title, 
  type = 'sequential',
  isCanape = false,
  onFoldClick,
  isFolded,
  useQuantiles = false
}) => {
  const legendRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltipValue, setTooltipValue] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!tooltipRef.current) {
      const tooltip = document.createElement('div');
      tooltip.className = 'legend-tooltip';
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

  const handleMouseMove = useCallback((e) => {
    if (!legendRef.current || isCanape) return;

    const rect = legendRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Calculate value based on position
    let t = x / width;
    let value;
    
    if (type === 'diverging') {
      // For diverging scales, map the position to [-1, 1]
      const [min, max] = domain;
      const absMax = Math.max(Math.abs(min), Math.abs(max));
      value = (t * 2 - 1) * absMax;
    } else {
      // For sequential scales, map position to domain
      const [min, max] = domain;
      value = min + t * (max - min);
    }

    setTooltipValue(value);
    setTooltipPosition({ x: e.clientX, y: e.clientY });

    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'block';
      tooltipRef.current.style.left = `${e.clientX + 10}px`;
      tooltipRef.current.style.top = `${e.clientY - 25}px`;
      tooltipRef.current.textContent = value.toFixed(2);
    }
  }, [domain, type, isCanape]);

  const handleMouseLeave = useCallback(() => {
    setTooltipValue(null);
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
  }, []);

  if (isCanape) {
    // Render discrete legend for CANAPE
    const canapeValues = [
      { value: 'NEO', color: "#FF0000", label: "Neo-endemism" },
      { value: 'PALAEO', color: "#4876FF", label: "Paleo-endemism" },
      { value: 'non-significant', color: "#FAFAD2", label: "Not significant" },
      { value: 'MIXED', color: "#CB7FFF", label: "Mixed endemism" },
      { value: 'SUPER', color: "#9D00FF", label: "Super endemism" }
    ];

    return (
      <div className="map-legend">
        <button 
          className="legend-fold-button"
          onClick={onFoldClick}
          title={isFolded ? "Show legend" : "Hide legend"}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        <div className="legend-content">
          <div className="legend-title">{title}</div>
          <div className="legend-items">
            {canapeValues.map(({ value, color, label }) => (
              <div key={value} className="legend-item">
                <div className="color-box" style={{ backgroundColor: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (useQuantiles) {
    // Create discrete bins for binned data
    let bins;
    if (type === 'diverging') {
      bins = [
        { label: '≤ -2.58 (p ≤ 0.01)', value: -3, color: colorScale(-3) },
        { label: '-2.58 to -1.96 (p ≤ 0.05)', value: -2.27, color: colorScale(-2.27) },
        { label: 'Not significant', value: 0, color: colorScale(0) },
        { label: '1.96 to 2.58 (p ≤ 0.05)', value: 2.27, color: colorScale(2.27) },
        { label: '≥ 2.58 (p ≤ 0.01)', value: 3, color: colorScale(3) }
      ];
    } else {
      const positions = [0, 0.25, 0.5, 0.75, 1];
      bins = [
        { label: '0-20%', value: domain[0] + positions[0] * (domain[1] - domain[0]), color: colorScale(domain[0]) },
        { label: '20-40%', value: domain[0] + positions[1] * (domain[1] - domain[0]), color: colorScale(domain[0] + 0.25 * (domain[1] - domain[0])) },
        { label: '40-60%', value: domain[0] + positions[2] * (domain[1] - domain[0]), color: colorScale(domain[0] + 0.5 * (domain[1] - domain[0])) },
        { label: '60-80%', value: domain[0] + positions[3] * (domain[1] - domain[0]), color: colorScale(domain[0] + 0.75 * (domain[1] - domain[0])) },
        { label: '80-100%', value: domain[0] + positions[4] * (domain[1] - domain[0]), color: colorScale(domain[1]) }
      ];
    }

    return (
      <div className="map-legend">
        <button 
          className="legend-fold-button"
          onClick={onFoldClick}
          title={isFolded ? "Show legend" : "Hide legend"}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        <div className="legend-content">
          <div className="legend-title">{title}</div>
          <div className="legend-items">
            {bins.map((bin, index) => (
              <div key={index} className="legend-item">
                <div className="color-box" style={{ backgroundColor: bin.color }} />
                <span>{bin.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Generate gradient stops
  const gradientStops = Array.from({ length: 100 }, (_, i) => {
    const t = i / 99;
    let color;
    
    if (type === 'diverging') {
      // Map t from [0, 1] to [-1, 1] for diverging scales
      const mappedT = t * 2 - 1;
      const [min, max] = domain;
      const absMax = Math.max(Math.abs(min), Math.abs(max));
      color = colorScale(mappedT * absMax);
    } else {
      // For sequential scales, map t directly to domain
      const [min, max] = domain;
      color = colorScale(min + t * (max - min));
    }
    
    return `${color} ${t * 100}%`;
  });

  return (
    <div className="map-legend">
      <button 
        className="legend-fold-button"
        onClick={onFoldClick}
        title={isFolded ? "Show legend" : "Hide legend"}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <div className="legend-content">
        <div className="legend-title">{title}</div>
        <div 
          ref={legendRef}
          className="color-scale"
          style={{ 
            background: `linear-gradient(to right, ${gradientStops.join(', ')})`
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        <div className="legend-labels">
          <span>{domain[0].toFixed(2)}</span>
          {type === 'diverging' && <span>0</span>}
          <span>{domain[1].toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

// Helper function to apply opacity to a color
const applyOpacity = (color, opacity) => {
  // Handle rgba colors
  if (color.startsWith('rgba')) {
    return color.replace(/rgba\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/, 
      (_, r, g, b) => `rgba(${r}, ${g}, ${b}, ${opacity})`);
  }
  // Handle rgb colors
  if (color.startsWith('rgb')) {
    return color.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/, 
      (_, r, g, b) => `rgba(${r}, ${g}, ${b}, ${opacity})`);
  }
  // Handle hex colors
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

// Debug helper function for polygon features
const debugFeature = (feature, source) => {
  try {
    const geometry = feature.getGeometry();
    const coordinates = geometry ? geometry.getCoordinates() : 'No geometry';
    const extent = geometry ? geometry.getExtent() : 'No extent';
    const properties = feature.getProperties();
    
    console.log('Debug feature:', {
      id: feature.getId() || 'No ID',
      type: geometry ? geometry.getType() : 'No geometry type',
      coordinates: coordinates,
      extent: extent,
      properties: properties,
      sourceFeatureCount: source ? source.getFeatures().length : 'No source'
    });
    
    // Check if the feature is valid
    if (geometry) {
      console.log('Feature is valid with geometry type:', geometry.getType());
      
      // For polygons, check if coordinates are valid
      if (geometry.getType() === 'Polygon') {
        const coords = geometry.getCoordinates();
        if (coords && coords.length > 0 && coords[0].length >= 4) {
          console.log('Polygon has valid coordinates with', coords[0].length, 'points');
          console.log('First few coordinates:', coords[0].slice(0, 3));
        } else {
          console.warn('Polygon has invalid coordinates:', coords);
        }
      }
    } else {
      console.warn('Feature has no geometry');
    }
  } catch (error) {
    console.error('Error debugging feature:', error);
  }
};

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
  const hasInitiallyFitView = useRef(false);
  const prevResultsGeoJSONRef = useRef(null);
  const dispatch = useDispatch();
  const [isLegendFolded, setIsLegendFolded] = useState(false);

  // Add refs for hypothesis testing
  const referenceSourceRef = useRef(null);
  const testSourceRef = useRef(null);
  const referenceLayerRef = useRef(null);
  const testLayerRef = useRef(null);

  // Get state from Redux
  const { selectedIndices, colorPalette, useQuantiles, valueRange, minRecords, geoJSON: visualizationGeoJSON } = useSelector(state => state.visualization);
  const { geoJSON: resultsGeoJSON } = useSelector(state => state.results);
  const { referenceArea, testArea, resultsOpacity } = useSelector(state => state.hypothesis);
  const { activePanel } = useOutletContext() || {};
  const isHypothesisPanelActive = activePanel === 'hypothesis';
  const areaSelectionMode = useSelector(state => state.map.areaSelectionMode);
  const drawnItems = useSelector(state => state.map.drawnItems);
  const colorSchemeType = useSelector(selectColorSchemeType);

  // Add selectors for hypothesis testing
  const hypothesisDrawingMode = useSelector(state => state.hypothesis.drawingMode);

  // Debug logging for tooltip
  useEffect(() => {
    console.log('Selected indices changed:', selectedIndices);
  }, [selectedIndices]);

  // Create tooltip element
  useEffect(() => {
    if (!tooltipRef.current) {
      const tooltip = document.createElement('div');
      tooltip.className = 'map-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        background: rgba(51, 51, 51, 0.95);
        color: #ffffff;
        padding: 8px 12px;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: none;
        line-height: 1.5;
        min-width: 150px;
      `;
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
  const formatValue = (value, indexId) => {
    // Special handling for CANAPE values
    if (indexId === 'CANAPE') {
      const canapeCategories = {
        0: 'Not significant',
        1: 'Neo-endemism',
        2: 'Paleo-endemism',
        3: 'Mixed endemism',
        4: 'Super endemism',
        'non-significant': 'Not significant',
        'NEO': 'Neo-endemism',
        'PALAEO': 'Paleo-endemism',
        'MIXED': 'Mixed endemism',
        'SUPER': 'Super endemism'
      };
      return canapeCategories[value] || 'Unknown';
    }
    
    // For numeric values
    if (typeof value === 'number') {
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

    // Debug logging
    console.log('Updating tooltip with:', {
      selectedIndices,
      properties: feature.getProperties()
    });

    const h3Id = feature.get('h3_index');
    if (!h3Id) return;

    // Get all properties of the feature
    const properties = feature.getProperties();

    // Start with basic info (always shown)
    let content = `
      <div class="tooltip-content">
        <div class="tooltip-section">
          <div class="tooltip-row"><strong>H3 ID:</strong> ${h3Id}</div>
    `;

    // Add Number of records (always shown)
    const numRecords = properties['NumRecords'];
    if (typeof numRecords === 'number') {
      content += `<div class="tooltip-row"><strong>Number of records:</strong> ${formatValue(numRecords)}</div>`;
    }

    // Add selected indices first
    if (selectedIndices && selectedIndices.length > 0) {
      selectedIndices.forEach(indexId => {
        const value = properties[indexId];
        if (value !== undefined && value !== null) {  // to show CANAPE values
          // Get metadata for the index
          const metadata = diversityIndices.groups
            .flatMap(group => group.indices)
            .find(index => {
              if (indexId === 'CANAPE' && index.id === 'canape') {
                return true;
              }
              if (Array.isArray(index.resultName)) {
                return index.resultName.includes(indexId);
              }
              return index.resultName === indexId || index.commandName === indexId;
            });
          let displayName = metadata ? metadata.displayName : indexId;
          
          // Special case for Hurlbert's ES
          if (indexId.startsWith('ES_')) {
            const match = indexId.match(/ES_(\d+)/);
            const sampleSize = match ? match[1] : '';
            const hurlbertMetadata = diversityIndices.groups
              .flatMap(group => group.indices)
              .find(index => index.id === 'hurlbert');
            
            if (hurlbertMetadata) {
              displayName = `${hurlbertMetadata.displayName} (n=${sampleSize})`;
            }
          }
          
          content += `<div class="tooltip-row"><strong>${displayName}:</strong> ${formatValue(value, indexId)}</div>`;
        }
      });
    }

    // Add Species richness only if it's not already selected
    if (!selectedIndices.includes('Richness')) {
      const richness = properties['Richness'];
      if (typeof richness === 'number') {
        content += `<div class="tooltip-row"><strong>Species richness:</strong> ${formatValue(richness)}</div>`;
      }
    }

    // Add Hurlbert's ES only if no ES_X is already selected and we're not in swipe mode
    if (!selectedIndices.some(idx => idx.startsWith('ES_')) && selectedIndices.length < 2) {
      // Get the Hurlbert's ES metadata to find the exact resultName values
      const hurlbertMetadata = diversityIndices.groups
        .flatMap(group => group.indices)
        .find(index => index.id === 'hurlbert');
      
      // Get the exact ES_X values from resultName
      const validESKeys = hurlbertMetadata?.resultName || [];
      
      // Find all valid ES_X properties
      const esKeys = Object.keys(properties).filter(key => 
        validESKeys.includes(key) && key.startsWith('ES_')
      );
      
      if (esKeys.length > 0) {
        // Sort by sample size and get the one with the lowest sample size
        const sortedESKeys = esKeys.sort((a, b) => {
          const aMatch = a.match(/ES_(\d+)$/);
          const bMatch = b.match(/ES_(\d+)$/);
          const aValue = aMatch ? parseInt(aMatch[1], 10) : Infinity;
          const bValue = bMatch ? parseInt(bMatch[1], 10) : Infinity;
          return aValue - bValue;
        });
        
        const esKey = sortedESKeys[0];
        const esValue = properties[esKey];
        
        if (typeof esValue === 'number') {
          // Get the sample size from the key
          const match = esKey.match(/ES_(\d+)/);
          const sampleSize = match ? match[1] : '';
          
          // Get the Hurlbert's ES metadata
          const hurlbertMetadata = diversityIndices.groups
            .flatMap(group => group.indices)
            .find(index => index.id === 'hurlbert');
          
          const displayName = hurlbertMetadata 
            ? `${hurlbertMetadata.displayName} (n=${sampleSize})` 
            : esKey;
          
          content += `<div class="tooltip-row"><strong>${displayName}:</strong> ${formatValue(esValue)}</div>`;
        }
      }
    }

    content += `
        </div>
      </div>
    `;

    // Debug logging
    console.log('Generated tooltip content:', content);

    tooltipRef.current.innerHTML = content;
    tooltipRef.current.style.display = 'block';

    // Calculate position
    const tooltipWidth = tooltipRef.current.offsetWidth;
    const tooltipHeight = tooltipRef.current.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Position tooltip with smart placement
    let left = pixel[0] + 15;
    let top = pixel[1] + 15;

    // Adjust if tooltip would go off right edge
    if (left + tooltipWidth > viewportWidth) {
      left = pixel[0] - tooltipWidth - 15;
    }

    // Adjust if tooltip would go off bottom edge
    if (top + tooltipHeight > viewportHeight) {
      top = pixel[1] - tooltipHeight - 15;
    }

    // Apply the position
    tooltipRef.current.style.left = `${left}px`;
    tooltipRef.current.style.top = `${top}px`;
  };

  // Color schemes for different metric types
  const colorSchemes = {
    sequential: (value, min, max) => {
      const t = (value - min) / (max - min);
      // Return RGB values without opacity, we'll apply opacity separately
      return `rgb(72, 118, 255)`;
    },
    diverging: (value, min, max) => {
      const mid = (max + min) / 2;
      // Return RGB values without opacity, we'll apply opacity separately
      if (value < mid) {
        return `rgb(255, 0, 0)`;
      }
      return `rgb(72, 118, 255)`;
    },
    canape: (value) => {
      // Return RGB values without opacity, we'll apply opacity separately
      const colors = {
        1: "rgb(255, 0, 0)", // Neo-endemism
        2: "rgb(72, 118, 255)", // Paleo-endemism
        0: "rgb(250, 250, 210)", // Not significant
        3: "rgb(203, 127, 255)", // Mixed endemism
        4: "rgb(157, 0, 255)"  // Super endemism
      };
      return colors[value] || "rgb(128, 128, 128)";
    }
  };

  // Style function for results layer
  const getResultStyle = (feature, indexId, palette, useQuantiles, valueRange, minRecords, isHovered = false, source) => {
    const value = feature.get(indexId);
    const numRecords = feature.get('NumRecords') || 0;

    // Debug logging for first few features
    const featureId = feature.get('h3_index');
    if (featureId && featureId.endsWith('0000')) {
      console.log('Styling feature:', {
        featureId,
        indexId,
        value,
        numRecords,
        minRecords,
        useQuantiles,
        valueRange,
        isHypothesisPanelActive,
        resultsOpacity
      });
    }

    // Hide cells with too few records
    if (numRecords < minRecords) {
      return null;
    }

    // For CANAPE, only check if value exists
    if (indexId === 'CANAPE') {
      if (value === undefined || value === null) {
        return null;
      }
      // Get the appropriate color scale for CANAPE
      const colorScale = getColorScale('CANAPE');
      let fillColor = colorScale(value);
      
      // Apply opacity based on panel
      const opacity = isHypothesisPanelActive ? resultsOpacity : 1.0;
      fillColor = applyOpacity(fillColor, opacity);
      
      if (featureId && featureId.endsWith('0000')) {
        console.log('Applied opacity to CANAPE color:', {
          value,
          fillColor,
          opacity
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
    }

    // For numeric indices, check for valid numbers and value range
    if (value === undefined || value === null || isNaN(value)) {
      return null;
    }

    // Hide cells outside the value range for numeric indices
    if (valueRange && (value < valueRange[0] || value > valueRange[1])) {
      return null;
    }

    // Get all values for the selected index to calculate min/max
    const allValues = source.getFeatures()
      .map(f => f.get(indexId))
      .filter(v => typeof v === 'number' && !isNaN(v) && 
        (!valueRange || (v >= valueRange[0] && v <= valueRange[1])));
    
    const min = valueRange ? valueRange[0] : Math.min(...allValues);
    const max = valueRange ? valueRange[1] : Math.max(...allValues);

    // Get the appropriate color scale based on the type
    const metadata = diversityIndices.groups
      .flatMap(group => group.indices)
      .find(index => {
        if (indexId === 'CANAPE' && index.id === 'canape') {
          return true;
        }
        if (Array.isArray(index.resultName)) {
          return index.resultName.includes(indexId);
        }
        return index.resultName === indexId || index.commandName === indexId;
      });
    const type = metadata?.colorSchemeType || 'sequential';

    let fillColor;
    if (useQuantiles) {
      // Step 1: Check if this is a diverging index
      if (type === 'diverging') {
        // Use fixed Z-score thresholds for diverging indices (SES and others)
        const boundaries = [-2.58, -1.96, 1.96, 2.58];
        let binValue;

        // Determine which bin the value falls into
        if (value <= -2.58) {
          binValue = -3; // Use a value beyond -2.58 for the most extreme negative bin
        } else if (value <= -1.96) {
          binValue = -2.27; // Midpoint between -2.58 and -1.96
        } else if (value < 1.96) {
          binValue = 0; // Center value for non-significant results
        } else if (value < 2.58) {
          binValue = 2.27; // Midpoint between 1.96 and 2.58
        } else {
          binValue = 3; // Use a value beyond 2.58 for the most extreme positive bin
        }

        // Get color scale and apply it
        const absMax = 3; // Use 3 as the max to ensure proper color scaling
        const colorScale = getColorScale(type, [-absMax, absMax], palette);
        fillColor = colorScale(binValue);
        
        // Apply opacity based on panel
        const opacity = isHypothesisPanelActive ? resultsOpacity : 1.0;
        fillColor = applyOpacity(fillColor, opacity);

        // Debug final values for some features
        if (featureId && featureId.endsWith('0000')) {
          console.log('Diverging index binning result:', {
            indexId,
            value,
            boundaries,
            binValue,
            fillColor,
            opacity
          });
        }
      } else {
        // Original percentile-based binning for non-diverging indices
        // Step 1: Data Collection
        const validValues = source.getFeatures()
          .map(f => f.get(indexId))
          .filter(v => typeof v === 'number' && !isNaN(v));

        // Sort values once
        const sortedValues = [...validValues].sort((a, b) => a - b);

        // Debug data collection for some features
        if (featureId && featureId.endsWith('0000')) {
          console.log('Data collection:', {
            totalValues: validValues.length,
            sortedRange: `${sortedValues[0]} to ${sortedValues[sortedValues.length - 1]}`
          });
        }

        // Step 2: Calculate quintile boundaries (0%, 20%, 40%, 60%, 80%, 100%)
        const boundaries = [];
        for (let i = 0; i <= 5; i++) {
          const index = Math.floor((i * (sortedValues.length - 1)) / 5);
          boundaries.push(sortedValues[index]);
        }

        // Debug boundaries for some features
        if (featureId && featureId.endsWith('0000')) {
          console.log('Quintile boundaries:', boundaries);
        }

        // Step 3: Determine which bin the value falls into and map to evenly distributed colors
        let colorPosition; // Will be 0, 0.25, 0.5, 0.75, or 1
        for (let i = 0; i < 5; i++) {
          if (value <= boundaries[i + 1]) {
            // Map each bin to evenly distributed points in the color scale
            colorPosition = i / 4; // Dividing by 4 to get 0, 0.25, 0.5, 0.75, 1
            break;
          }
        }

        // If no bin was found (shouldn't happen), use the last bin
        if (colorPosition === undefined) {
          colorPosition = 1;
        }

        // Get color scale and apply it using the full range
        const colorScale = getColorScale(type, [min, max], palette);
        // Map the color position to the actual value range
        const mappedValue = min + colorPosition * (max - min);
        fillColor = colorScale(mappedValue);
        
        // Apply opacity based on panel
        const opacity = isHypothesisPanelActive ? resultsOpacity : 1.0;
        fillColor = applyOpacity(fillColor, opacity);

        // Debug final values for some features
        if (featureId && featureId.endsWith('0000')) {
          console.log('Quantile result:', {
            value,
            boundaries,
            colorPosition,
            mappedValue,
            fillColor,
            opacity
          });
        }
      }
    } else {
      const colorScale = getColorScale(type, [min, max], palette);
      fillColor = colorScale(value);
      
      // Apply opacity based on panel
      const opacity = isHypothesisPanelActive ? resultsOpacity : 1.0;
      fillColor = applyOpacity(fillColor, opacity);
      
      // Debug for some features
      if (featureId && featureId.endsWith('0000')) {
        console.log('Regular color scale result with opacity:', {
          indexId,
          value,
          min,
          max,
          type,
          fillColor,
          isHypothesisPanelActive,
          resultsOpacity,
          appliedOpacity: opacity
        });
      }
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
    if (!mapRef.current) return;

    // Create vector source for drawn items
    vectorSourceRef.current = new VectorSource();
    
    // Create vector sources for hypothesis testing
    referenceSourceRef.current = new VectorSource();
    testSourceRef.current = new VectorSource();

    // Create vector layer for drawn items
    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new Stroke({
          color: '#ffcc33',
          width: 2
        }),
        image: new Circle({
          radius: 7,
          fill: new Fill({
            color: '#ffcc33'
          })
        })
      }),
      zIndex: 100 // Highest zIndex to ensure it's above all other layers
    });
    
    // Create vector layers for hypothesis testing
    referenceLayerRef.current = new VectorLayer({
      source: referenceSourceRef.current,
      style: new Style({
        fill: new Fill({
          color: 'rgba(0, 0, 255, 0.2)'  // Semi-transparent blue fill
        }),
        stroke: new Stroke({
          color: 'rgba(0, 0, 255, 0.8)',  // More opaque blue border
          width: 3,  // Thicker border
          lineDash: [10, 5]  // Dashed line for better visibility
        }),
        image: new Circle({
          radius: 7,
          fill: new Fill({
            color: 'blue'
          })
        })
      }),
      zIndex: 150  // High zIndex to ensure it's above other layers
    });
    
    testLayerRef.current = new VectorLayer({
      source: testSourceRef.current,
      style: new Style({
        fill: new Fill({
          color: 'rgba(0, 128, 0, 0.2)'  // Semi-transparent green fill
        }),
        stroke: new Stroke({
          color: 'rgba(0, 128, 0, 0.8)',  // More opaque green border
          width: 3,  // Thicker border
          lineDash: [10, 5]  // Dashed line for better visibility
        }),
        image: new Circle({
          radius: 7,
          fill: new Fill({
            color: 'green'
          })
        })
      }),
      zIndex: 151  // Highest zIndex to ensure it's above all other layers
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
      layers: [raster, vectorLayer, referenceLayerRef.current, testLayerRef.current],
      view: new View({
        center: [0, 0],
        zoom: 2,
        projection: 'EPSG:3857',
        extent,
      })
    });

    // No need to add the hypothesis testing layers again since they're included in the initial layers array
    // mapInstanceRef.current.addLayer(referenceLayerRef.current);
    // mapInstanceRef.current.addLayer(testLayerRef.current);

    // Add pointer move handler for tooltips
    const handlePointerMove = (evt) => {
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
    };

    // Bind the pointer move handler
    mapInstanceRef.current.on('pointermove', handlePointerMove);

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
    const map = mapInstanceRef.current;

    if (!map || !resultsGeoJSON) return;

    console.log('Handling results visualization:', {
      resultsGeoJSON: resultsGeoJSON ? 'present' : 'missing',
      selectedIndices,
      features: resultsGeoJSON?.features?.length,
      isHypothesisPanelActive,
      resultsOpacity
    });

    // Reset the view fitting flag when new results are loaded
    if (resultsGeoJSON !== prevResultsGeoJSONRef.current) {
      hasInitiallyFitView.current = false;
      prevResultsGeoJSONRef.current = resultsGeoJSON;
    }

    // Remove existing results layers
    resultsLayersRef.current.forEach(layer => {
      map.removeLayer(layer);
    });
    resultsLayersRef.current = [];

    // Remove existing swipe control
    if (swipeControlRef.current) {
      map.removeControl(swipeControlRef.current);
      swipeControlRef.current = null;
    }

    // Create new layers for selected indices
    selectedIndices.forEach((indexId, idx) => {
      console.log('Creating layer for index:', indexId);
      
      const source = new VectorSource({
        features: new GeoJSON().readFeatures(resultsGeoJSON, {
          featureProjection: 'EPSG:3857'
        })
      });

      console.log(`Added ${source.getFeatures().length} features to source for index ${indexId}`);

      const layer = new VectorLayer({
        source: source,
        style: (feature) => getResultStyle(
          feature, 
          indexId, 
          colorPalette, 
          useQuantiles, 
          (selectedIndices.length < 2 ? valueRange : null), 
          minRecords,
          feature === hoveredFeatureRef.current,
          source,
        ),
        // Ensure layers are above the base map but below hypothesis layers
        zIndex: 50 + idx, // Higher than base map (0) but lower than hypothesis layers (150+)
        // Important: ensure the layer is updateWhileAnimating and updateWhileInteracting
        updateWhileAnimating: true,
        updateWhileInteracting: true
      });

      map.addLayer(layer);
      resultsLayersRef.current.push(layer);

      // Fit view to layer extent only once when results are first loaded
      if (idx === 0 && source.getFeatures().length > 0 && !hasInitiallyFitView.current) {
        const extent = source.getExtent();
        map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 12
        });
        hasInitiallyFitView.current = true;
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

      map.addControl(swipeControlRef.current);

      // Force map render when swipe position changes
      swipeControlRef.current.on('moving', function() {
        map.render();
      });
    }

    return () => {
      if (swipeControlRef.current) {
        map.removeControl(swipeControlRef.current);
        swipeControlRef.current = null;
      }
    };
  }, [resultsGeoJSON, selectedIndices, colorPalette, useQuantiles, valueRange, minRecords, colorSchemeType, isHypothesisPanelActive, resultsOpacity]);

  // Handle map export
  const handleExportMap = async () => {
    const mapContainer = mapRef.current;
    if (!mapContainer) return;

    try {
      // Get the current map canvas
      const mapCanvas = mapContainer.querySelector('.ol-viewport canvas');
      const mapContext = mapCanvas.getContext('2d');

      // Create a temporary canvas with the same dimensions
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = mapCanvas.width;
      tempCanvas.height = mapCanvas.height;
      const tempContext = tempCanvas.getContext('2d');

      // Copy the map to the temporary canvas
      tempContext.drawImage(mapCanvas, 0, 0);

      // If legend is visible, add it to the canvas
      if (!isLegendFolded) {
        const legendContainer = mapContainer.querySelector('.map-legends-container');
        if (legendContainer) {
          // Convert legend to canvas
          const legendCanvas = await html2canvas(legendContainer, {
            backgroundColor: null,
            scale: window.devicePixelRatio
          });

          // Calculate position for legend (maintain its current position relative to map)
          const mapRect = mapCanvas.getBoundingClientRect();
          const legendRect = legendContainer.getBoundingClientRect();
          const x = (legendRect.left - mapRect.left) * window.devicePixelRatio;
          const y = (legendRect.top - mapRect.top) * window.devicePixelRatio;

          // Draw legend onto the temporary canvas
          tempContext.drawImage(legendCanvas, x, y);
        }
      }

      // Convert the combined canvas to data URL and trigger download
      const link = document.createElement('a');
      link.download = 'map_export.png';
      link.href = tempCanvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error exporting map:', error);
    }
  };

  // Handle hypothesis drawing mode changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
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
    
    // Add new interactions if hypothesis drawing is enabled
    if (hypothesisDrawingMode) {
      console.log('Hypothesis drawing mode enabled:', hypothesisDrawingMode);
      
      // Determine which source to use based on drawing mode
      const source = hypothesisDrawingMode === 'reference' 
        ? referenceSourceRef.current 
        : testSourceRef.current;
      
      // Add modify interaction
      modifyRef.current = new Modify({ source });
      mapInstanceRef.current.addInteraction(modifyRef.current);
      
      // Add draw interaction
      drawRef.current = new Draw({
        source,
        type: 'Polygon'
      });
      mapInstanceRef.current.addInteraction(drawRef.current);
      
      // Add snap interaction
      snapRef.current = new Snap({ source });
      mapInstanceRef.current.addInteraction(snapRef.current);
      
      // Handle draw events
      drawRef.current.on('drawend', (event) => {
        console.log('Hypothesis draw ended:', hypothesisDrawingMode);
        
        // Get the feature
        const drawnFeature = event.feature;
        
        // Debug the drawn feature
        console.log('Raw drawn feature:', drawnFeature);
        debugFeature(drawnFeature, source);
        
        // Convert feature to GeoJSON
        const format = new GeoJSON();
        const feature = format.writeFeatureObject(drawnFeature, {
          featureProjection: 'EPSG:3857',
          dataProjection: 'EPSG:3857' // Keep in the same projection
        });
        
        // Ensure the feature has properties
        if (!feature.properties) {
          feature.properties = {};
        }
        
        // Add areaType property and mark as drawn on map
        feature.properties.areaType = hypothesisDrawingMode;
        feature.properties.drawnOnMap = true;
        
        console.log('Dispatching feature with properties:', feature);
        
        // Dispatch to the appropriate action
        if (hypothesisDrawingMode === 'reference') {
          dispatch(addReferenceFeature(feature));
        } else {
          dispatch(addTestFeature(feature));
        }
      });
      
      // Handle modify events
      modifyRef.current.on('modifyend', (event) => {
        console.log('Hypothesis modify ended:', hypothesisDrawingMode);
        
        // Get all features from the source
        const features = source.getFeatures().map(feature => {
          const format = new GeoJSON();
          return format.writeFeatureObject(feature);
        });
        
        // Clear the source and re-add all features
        if (hypothesisDrawingMode === 'reference') {
          dispatch({ type: 'hypothesis/clearReferenceArea' });
          features.forEach(feature => dispatch(addReferenceFeature(feature)));
        } else {
          dispatch({ type: 'hypothesis/clearTestArea' });
          features.forEach(feature => dispatch(addTestFeature(feature)));
        }
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
  }, [hypothesisDrawingMode, dispatch]);
  
  // Update reference area on map when it changes in Redux
  useEffect(() => {
    if (!referenceSourceRef.current) return;
    
    console.log('Updating reference area on map:', referenceArea);
    
    // Clear the source
    referenceSourceRef.current.clear();
    
    // Add features from Redux
    if (referenceArea.features && referenceArea.features.length > 0) {
      console.log('Adding reference features to map:', referenceArea.features.length);
      const format = new GeoJSON();
      
      referenceArea.features.forEach(feature => {
        try {
          // Ensure the feature has a geometry
          if (!feature.geometry) {
            console.error('Feature missing geometry:', feature);
            return;
          }
          
          // Create a deep copy of the feature to avoid reference issues
          const featureCopy = JSON.parse(JSON.stringify(feature));
          
          // Ensure properties exist
          if (!featureCopy.properties) {
            featureCopy.properties = { areaType: 'reference' };
          } else if (!featureCopy.properties.areaType) {
            featureCopy.properties.areaType = 'reference';
          }
          
          // Check if the feature was drawn on the map or uploaded
          const wasDrawnOnMap = feature.properties?.drawnOnMap === true;
          
          // Read the feature and add it to the source
          const olFeature = format.readFeature(featureCopy, {
            featureProjection: 'EPSG:3857',
            // If the feature was drawn on the map, it's already in EPSG:3857
            // Otherwise, assume it's in EPSG:4326 (standard GeoJSON)
            dataProjection: wasDrawnOnMap ? 'EPSG:3857' : 'EPSG:4326'
          });
          
          console.log('Added reference feature to map:', olFeature);
          referenceSourceRef.current.addFeature(olFeature);
          
          // Debug the feature
          debugFeature(olFeature, referenceSourceRef.current);
        } catch (error) {
          console.error('Error adding reference feature to map:', error, feature);
        }
      });
      
      // Force redraw of the layer
      if (referenceLayerRef.current) {
        referenceLayerRef.current.changed();
        console.log('Forced redraw of reference layer');
      }
    }
  }, [referenceArea]);
  
  // Update test area on map when it changes in Redux
  useEffect(() => {
    if (!testSourceRef.current) return;
    
    console.log('Updating test area on map:', testArea);
    
    // Clear the source
    testSourceRef.current.clear();
    
    // Add features from Redux
    if (testArea.features && testArea.features.length > 0) {
      console.log('Adding test features to map:', testArea.features.length);
      const format = new GeoJSON();
      
      testArea.features.forEach(feature => {
        try {
          // Ensure the feature has a geometry
          if (!feature.geometry) {
            console.error('Feature missing geometry:', feature);
            return;
          }
          
          // Create a deep copy of the feature to avoid reference issues
          const featureCopy = JSON.parse(JSON.stringify(feature));
          
          // Ensure properties exist
          if (!featureCopy.properties) {
            featureCopy.properties = { areaType: 'test' };
          } else if (!featureCopy.properties.areaType) {
            featureCopy.properties.areaType = 'test';
          }
          
          // Check if the feature was drawn on the map or uploaded
          const wasDrawnOnMap = feature.properties?.drawnOnMap === true;
          
          // Read the feature and add it to the source
          const olFeature = format.readFeature(featureCopy, {
            featureProjection: 'EPSG:3857',
            // If the feature was drawn on the map, it's already in EPSG:3857
            // Otherwise, assume it's in EPSG:4326 (standard GeoJSON)
            dataProjection: wasDrawnOnMap ? 'EPSG:3857' : 'EPSG:4326'
          });
          
          console.log('Added test feature to map:', olFeature);
          testSourceRef.current.addFeature(olFeature);
          
          // Debug the feature
          debugFeature(olFeature, testSourceRef.current);
        } catch (error) {
          console.error('Error adding test feature to map:', error, feature);
        }
      });
      
      // Force redraw of the layer
      if (testLayerRef.current) {
        testLayerRef.current.changed();
        console.log('Forced redraw of test layer');
      }
    }
  }, [testArea]);

  // Update pointer move handler when selectedIndices changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      
      // Remove existing pointermove listeners
      const listeners = map.getListeners('pointermove');
      if (listeners) {
        listeners.forEach(listener => map.removeEventListener('pointermove', listener));
      }

      // Add new pointer move handler
      const handlePointerMove = (evt) => {
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

        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
          layerFilter: layer => resultsLayersRef.current.includes(layer)
        });

        map.getTargetElement().style.cursor = hit ? 'pointer' : '';

        let foundFeature = null;
        map.forEachFeatureAtPixel(pixel, (feature, layer) => {
          if (resultsLayersRef.current.includes(layer)) {
            foundFeature = feature;
            return true;
          }
        }, {
          layerFilter: layer => resultsLayersRef.current.includes(layer)
        });

        if (hoveredFeatureRef.current !== foundFeature) {
          hoveredFeatureRef.current = foundFeature;
          resultsLayersRef.current.forEach(layer => layer.changed());
        }

        updateTooltip([evt.originalEvent.clientX, evt.originalEvent.clientY], foundFeature);
      };

      map.on('pointermove', handlePointerMove);
    }
  }, [selectedIndices]); // Re-run when selectedIndices changes

  // Force re-render when active panel changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      console.log('Active panel changed, forcing map re-render:', activePanel);
      mapInstanceRef.current.render();
      
      // Force re-render of results layers
      resultsLayersRef.current.forEach(layer => {
        layer.changed();
      });
    }
  }, [activePanel]);

  // Force re-render when opacity changes
  useEffect(() => {
    if (mapInstanceRef.current && isHypothesisPanelActive) {
      console.log('Results opacity changed, forcing map re-render:', resultsOpacity);
      
      // Force re-render of results layers
      resultsLayersRef.current.forEach(layer => {
        layer.changed();
      });
      
      // Force map render
      mapInstanceRef.current.render();
    }
  }, [resultsOpacity, isHypothesisPanelActive]);

  // Handle hypothesis panel activation
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    console.log('Hypothesis panel active state changed:', isHypothesisPanelActive);
    
    // When hypothesis panel becomes active, ensure reference and test layers are visible
    if (isHypothesisPanelActive) {
      // Make sure the layers are visible
      if (referenceLayerRef.current) {
        referenceLayerRef.current.setVisible(true);
        referenceLayerRef.current.changed();
      }
      
      if (testLayerRef.current) {
        testLayerRef.current.setVisible(true);
        testLayerRef.current.changed();
      }
      
      // Fit view to include reference and test areas if they exist
      const referenceFeatures = referenceSourceRef.current?.getFeatures() || [];
      const testFeatures = testSourceRef.current?.getFeatures() || [];
      
      if (referenceFeatures.length > 0 || testFeatures.length > 0) {
        // Calculate combined extent
        let combinedExtent = null;
        
        // Add reference features to extent
        if (referenceFeatures.length > 0) {
          combinedExtent = referenceSourceRef.current.getExtent();
        }
        
        // Add test features to extent
        if (testFeatures.length > 0) {
          const testExtent = testSourceRef.current.getExtent();
          if (combinedExtent) {
            // Extend the existing extent
            for (let i = 0; i < 4; i += 2) {
              combinedExtent[i] = Math.min(combinedExtent[i], testExtent[i]);
              combinedExtent[i+1] = Math.max(combinedExtent[i+1], testExtent[i+1]);
            }
          } else {
            combinedExtent = testExtent;
          }
        }
        
        // Fit view to the combined extent with padding
        if (combinedExtent) {
          console.log('Fitting view to hypothesis areas:', combinedExtent);
          mapInstanceRef.current.getView().fit(combinedExtent, {
            padding: [50, 50, 50, 50],
            maxZoom: 12,
            duration: 1000 // Smooth animation
          });
        }
      }
      
      // Force map render
      mapInstanceRef.current.render();
    }
  }, [isHypothesisPanelActive]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative'
      }} 
    >
      {selectedIndices.length > 0 && resultsGeoJSON && (
        <div className={`map-legends-container ${isLegendFolded ? 'folded' : ''}`}>
          {selectedIndices.map((indexId, idx) => {
            // Get all values for the selected index
            const values = resultsGeoJSON.features
              .map(f => f.properties[indexId])
              .filter(v => typeof v === 'number' && !isNaN(v));
            
            let min = Math.min(...values);
            let max = Math.max(...values);

            if (valueRange && selectedIndices.length < 2) {
              min = Math.max(min, valueRange[0]);
              max = Math.min(max, valueRange[1]);
            }

            const appliedPalette = colorPalette;

            let appliedColorSchemeType = colorSchemeType;

            if (indexId === 'CANAPE') {
              appliedColorSchemeType = 'canape';
            } else if (indexId === 'SES.PD') {
              appliedColorSchemeType = 'diverging';
            }
            
            // Get the appropriate color scale
            const scale = getColorScale(
              appliedColorSchemeType,
              [min, max],
              appliedPalette
            );

            // Get index metadata for display name
            const metadata = diversityIndices.groups
              .flatMap(group => group.indices)
              .find(index => {
                if (indexId === 'CANAPE' && index.id === 'canape') {
                  return true;
                }
                if (Array.isArray(index.resultName)) {
                  return index.resultName.includes(indexId);
                }
                return index.resultName === indexId || index.commandName === indexId;
              });
            
            let displayTitle = metadata?.displayName || indexId;
            
            // Special case for Hurlbert's ES
            if (indexId.startsWith('ES_')) {
              const match = indexId.match(/ES_(\d+)/);
              const sampleSize = match ? match[1] : '';
              const hurlbertMetadata = diversityIndices.groups
                .flatMap(group => group.indices)
                .find(index => index.id === 'hurlbert');
              
              if (hurlbertMetadata) {
                displayTitle = `${hurlbertMetadata.displayName} (n=${sampleSize})`;
              }
            }

            return (
              <ColorLegend
                key={indexId}
                colorScale={scale}
                domain={[min, max]}
                title={displayTitle}
                type={appliedColorSchemeType}
                isCanape={indexId === 'CANAPE'}
                onFoldClick={() => setIsLegendFolded(!isLegendFolded)}
                isFolded={isLegendFolded}
                useQuantiles={useQuantiles}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MapComponent; 