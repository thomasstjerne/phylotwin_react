import React, { useEffect, useRef } from 'react';
import { useMap, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

const Map = ({ value, onChange }) => {
  const map = useMap();
  const featureGroupRef = useRef(null);

  // Clear existing drawings when component unmounts or value changes
  useEffect(() => {
    return () => {
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }
    };
  }, []);

  const onCreated = (e) => {
    const type = e.layerType;
    const layer = e.layer;
    if (type === 'rectangle' || type === 'polygon') {
      const bounds = layer.getBounds();
      if (onChange) {
        onChange([bounds]);
      }
    }
  };

  const onDeleted = (e) => {
    if (onChange) {
      onChange(null);
    }
  };

  return (
    <FeatureGroup ref={featureGroupRef}>
      <EditControl
        position="topright"
        onCreated={onCreated}
        onDeleted={onDeleted}
        draw={{
          rectangle: true,
          circle: false,
          circlemarker: false,
          marker: false,
          polyline: false,
          polygon: true,
        }}
      />
    </FeatureGroup>
  );
};

export default Map;