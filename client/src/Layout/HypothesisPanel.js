import React from 'react';
import {
  Box,
  Typography,
  Drawer,
  IconButton,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

const drawerWidth = 340;

const HypothesisPanel = ({ isOpen, onClose }) => {
  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={isOpen}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Hypothesis testing
        </Typography>
        <IconButton onClick={onClose}>
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      <Box sx={{ p: 3 }}>
        <Typography variant="body1" paragraph>
          This feature is currently in development. The hypothesis testing module will allow you to check:
        </Typography>
        <Typography component="ul" sx={{ pl: 2 }}>
          <li>Which of several (2 or more) proposed new nature reserves  (e.g., supplied as shape files) would increase the total PD of the nature reserves of a country</li>
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