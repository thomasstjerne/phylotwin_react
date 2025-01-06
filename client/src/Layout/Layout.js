import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, Button, AppBar, Toolbar } from '@mui/material';
import SettingsPanel from './SettingsPanel';
import HypothesisPanel from './HypothesisPanel';

const Layout = () => {
  const [viewMode, setViewMode] = useState('map');
  const [activePanel, setActivePanel] = useState('settings');
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true);
  const location = useLocation();

  // Only show the navigation and settings panel on the workflow page
  const isWorkflowPage = location.pathname.startsWith('/run');

  if (!isWorkflowPage) {
    return <Outlet />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Button 
              color="inherit"
              onClick={() => {
                setActivePanel('settings');
                setIsSettingsPanelOpen(true);
              }}
              variant={activePanel === 'settings' ? 'contained' : 'text'}
              sx={{ mr: 1 }}
            >
              Settings
            </Button>
            <Button 
              color="inherit"
              onClick={() => {
                setActivePanel('hypothesis');
                setIsSettingsPanelOpen(true);
              }}
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
              sx={{ mr: 1 }}
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
        {activePanel === 'settings' ? (
          <SettingsPanel 
            isOpen={isSettingsPanelOpen} 
            onClose={() => setIsSettingsPanelOpen(false)}
            activePanel={activePanel}
            viewMode={viewMode}
          />
        ) : (
          <HypothesisPanel
            isOpen={isSettingsPanelOpen}
            onClose={() => setIsSettingsPanelOpen(false)}
          />
        )}
        
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: 3, 
            overflow: 'auto',
            marginLeft: isSettingsPanelOpen ? '340px' : 0,
            transition: 'margin 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms'
          }}
        >
          <Outlet context={{ viewMode, activePanel }} />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
