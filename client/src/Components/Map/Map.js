import React, { useEffect, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { Draw, Modify, Snap } from 'ol/interaction';
import { get } from 'ol/proj';
import { useSelector } from 'react-redux';
import 'ol/ol.css';

const MapComponent = () => {
  const mapRef = useRef();
  const mapInstanceRef = useRef(null);
  const vectorSourceRef = useRef(null);
  const drawRef = useRef(null);
  const snapRef = useRef(null);
  const modifyRef = useRef(null);

  const areaSelectionMode = useSelector(state => state.map.areaSelectionMode);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      // Create vector source and layer
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

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle drawing interactions based on areaSelectionMode
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
      drawRef.current.on('drawend', (event) => {
        // You can dispatch an action here to update your Redux store with the new feature
        console.log('Feature drawn:', event.feature.getGeometry().getCoordinates());
      });
    }
  }, [areaSelectionMode]);

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