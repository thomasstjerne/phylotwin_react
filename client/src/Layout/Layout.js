import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, Button, AppBar, Toolbar } from '@mui/material';
import SettingsPanel from './SettingsPanel';
import HypothesisPanel from './HypothesisPanel';
import UserMenu from '../Components/UserMenu';

const Layout = () => {
  const [activePanel, setActivePanel] = useState('settings');
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true);
  const location = useLocation();

  // Only show the navigation and settings panel on the workflow page
  const isWorkflowPage = location.pathname.startsWith('/run');
  console.log("Current pathname:", location.pathname, "isWorkflowPage:", isWorkflowPage);  // for debugging

  if (!isWorkflowPage) {
    return <Outlet />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar 
        position="static" 
        sx={{ 
          '& .MuiToolbar-root': {
            minHeight: '48px',
            '@media (min-width: 600px)': {
              minHeight: '48px'
            }
          }
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Button 
              color="inherit"
              onClick={() => {
                setActivePanel('settings');
                setIsSettingsPanelOpen(true);
              }}
              variant={activePanel === 'settings' ? 'contained' : 'text'}
              sx={{ mr: 1, py: 0.5 }}
              size="small"
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
              sx={{ py: 0.5 }}
              size="small"
            >
              Hypothesis test
            </Button>
          </Box>
          <Box>
            <UserMenu />
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ 
        position: 'relative', 
        flexGrow: 1, 
        overflow: 'hidden'
      }}>
        {/* Main content area (map) that takes full width */}
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0
        }}>
          <Outlet context={{ isSettingsPanelOpen, activePanel }} />
        </Box>

        {/* Overlay panels */}
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          zIndex: 1
        }}>
          {activePanel === 'settings' ? (
            <SettingsPanel 
              isOpen={isSettingsPanelOpen} 
              onClose={() => setIsSettingsPanelOpen(false)}
              activePanel={activePanel}
            />
          ) : (
            <HypothesisPanel
              isOpen={isSettingsPanelOpen}
              onClose={() => setIsSettingsPanelOpen(false)}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
