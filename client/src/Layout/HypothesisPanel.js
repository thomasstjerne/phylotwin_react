import React from 'react';
import {
  Box,
  Typography,
  Drawer,
} from '@mui/material';

const drawerWidth = 340;

const HypothesisPanel = ({ isOpen, onClose, isCollapsed }) => {
  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={isOpen}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        position: 'relative',
        height: '100%',
        '& .MuiDrawer-paper': {
          width: isCollapsed ? 0 : drawerWidth,
          boxSizing: 'border-box',
          position: 'absolute',
          height: '100%',
          border: 'none',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          top: 0,
          transition: 'width 0.2s ease-in-out',
          overflow: 'hidden',
          zIndex: 1001, // Below header but above map
        },
      }}
    >
      <Box sx={{ 
        p: 3, 
        overflow: 'auto', 
        height: '100%',
        width: drawerWidth, // Keep content width fixed
      }}>
        <Typography variant="body1" paragraph>
          This feature is currently in development. The hypothesis testing module will allow you to check:
        </Typography>
        <Typography component="ul" sx={{ pl: 2 }}>
          <li>Which of several (2 or more) proposed new nature reserves (e.g., supplied as shape files) would increase the total PD of the nature reserves of a country</li>
          <li>Which of areas has the highest PD</li>
          <li>Etc.</li>
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          ...
        </Typography>
      </Box>
    </Drawer>
  );
};

export default HypothesisPanel; 