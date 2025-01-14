import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, Button, AppBar, Toolbar } from '@mui/material';
import { useSelector } from 'react-redux';
import SettingsPanel from './SettingsPanel';
import VisualizationPanel from './VisualizationPanel';
import HypothesisPanel from './HypothesisPanel';
import UserMenu from '../Components/UserMenu';

const Layout = ({ step, setStep }) => {
  const [activePanel, setActivePanel] = useState('settings');
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true);
  const location = useLocation();
  const { status } = useSelector(state => state.results);

  // Only show the navigation and settings panel on the workflow page
  const isWorkflowPage = location.pathname === '/run';
  console.log("Current pathname:", location.pathname, "isWorkflowPage:", isWorkflowPage);

  if (!isWorkflowPage) {
    return <Outlet />;
  }

  const handlePanelChange = (newValue) => {
    // Allow opening visualization panel if results are available
    if (newValue === 'visualization' && status !== 'completed') {
      console.log('Cannot open visualization panel - no results available');
      return;
    }
    setActivePanel(newValue);
    setIsSettingsPanelOpen(true);
  };

  const handlePanelOpen = (panel) => {
    handlePanelChange(panel);
  };

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
              onClick={() => handlePanelChange('settings')}
              variant={activePanel === 'settings' ? 'contained' : 'text'}
              sx={{ mr: 1, py: 0.5 }}
              size="small"
            >
              Settings
            </Button>
            <Button 
              color="inherit"
              onClick={() => handlePanelChange('visualization')}
              variant={activePanel === 'visualization' ? 'contained' : 'text'}
              sx={{ mr: 1, py: 0.5 }}
              size="small"
              disabled={status !== 'completed'}
            >
              Visualization
            </Button>
            <Button 
              color="inherit"
              onClick={() => handlePanelChange('hypothesis')}
              variant={activePanel === 'hypothesis' ? 'contained' : 'text'}
              sx={{ py: 0.5 }}
              size="small"
              disabled={status !== 'completed'}
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
          <Outlet context={{ isSettingsPanelOpen, activePanel, handlePanelOpen }} />
        </Box>

        {/* Overlay panels */}
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          zIndex: 1
        }}>
          {/* Settings Panel */}
          <SettingsPanel
            isOpen={isSettingsPanelOpen && activePanel === 'settings'}
            onClose={() => setIsSettingsPanelOpen(false)}
            activePanel={activePanel}
            handlePanelOpen={handlePanelOpen}
            setStep={setStep}
          />

          {/* Visualization Panel */}
          <VisualizationPanel
            isOpen={isSettingsPanelOpen && activePanel === 'visualization'}
            onClose={() => setIsSettingsPanelOpen(false)}
          />

          {/* Hypothesis Panel */}
          <HypothesisPanel
            isOpen={isSettingsPanelOpen && activePanel === 'hypothesis'}
            onClose={() => setIsSettingsPanelOpen(false)}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
