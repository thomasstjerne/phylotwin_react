import React from 'react';
import { Box } from '@mui/material';
import KeplerMap from './KeplerMap';

const MapContainer = ({ data, config, onMapEngineReady }) => {
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <KeplerMap 
        data={data}
        config={config}
        onMapEngineReady={onMapEngineReady}
      />
    </Box>
  );
};

export default MapContainer; 