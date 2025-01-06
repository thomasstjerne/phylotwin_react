import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Button, AppBar, Toolbar } from '@mui/material';
import SettingsPanel from './SettingsPanel';

const Layout = () => {
  const [viewMode, setViewMode] = useState('map');
  const [activePanel, setActivePanel] = useState('settings');
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Button 
              color="inherit"
              onClick={() => setActivePanel('settings')}
              variant={activePanel === 'settings' ? 'contained' : 'text'}
            >
              Settings
            </Button>
            <Button 
              color="inherit"
              onClick={() => setActivePanel('hypothesis')}
              variant={activePanel === 'hypothesis' ? 'contained' : 'text'}
            >
              Hypothesis test
            </Button>
          </Box>
          <Box>
            <Button 
              color="inherit"
              onClick={() => setViewMode('map')}
              variant={viewMode === 'map' ? 'contained' : 'text'}
            >
              Map
            </Button>
            <Button 
              color="inherit"
              onClick={() => setViewMode('table')}
              variant={viewMode === 'table' ? 'contained' : 'text'}
            >
              Table
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <SettingsPanel 
          isOpen={isSettingsPanelOpen} 
          onClose={() => setIsSettingsPanelOpen(false)}
          activePanel={activePanel}
        />
        
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Outlet />
          {viewMode === 'map' ? (
            <div>Map View</div>
          ) : (
            <div>Table View</div>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
