import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, Button, AppBar, Toolbar, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { Spin } from 'antd';
import SettingsPanel from './SettingsPanel';
import VisualizationPanel from './VisualizationPanel';
import HypothesisPanel from './HypothesisPanel';
import UserMenu from '../Components/UserMenu';
import JobStatusPoller from '../Components/JobStatusPoller';

const Layout = ({ step, setStep }) => {
  const [activePanel, setActivePanel] = useState('settings');
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true);
  const location = useLocation();
  const { status } = useSelector(state => state.results);
  const isAnalysisRunning = status === 'running';

  // Only show the navigation and settings panel on the workflow page
  const isWorkflowPage = location.pathname === '/run';

  if (!isWorkflowPage) {
    return <Outlet />;
  }

  const handlePanelChange = (newValue) => {
    console.log('Panel change requested:', {
      newValue,
      currentStatus: status,
      hasResults: status === 'completed'
    });
    
    // Only block manual visualization panel opening
    // Allow programmatic opening from JobStatusPoller
    if (newValue === 'visualization' && status !== 'completed' && !isAnalysisRunning) {
      console.log('Cannot open visualization panel - no results available');
      return;
    }
    setActivePanel(newValue);
    setIsSettingsPanelOpen(true);
  };

  const handlePanelOpen = (panel) => {
    console.log('Opening panel:', panel);
    setActivePanel(panel);
    setIsSettingsPanelOpen(true);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <JobStatusPoller handlePanelOpen={handlePanelOpen} />
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
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
              {status === 'completed' && (
                <Box component="span" sx={{ ml: 1, width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
              )}
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
            {isAnalysisRunning && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                <Spin size="small" />
                <Typography variant="body2" color="inherit" sx={{ ml: 1 }}>
                  Analysis running...
                </Typography>
              </Box>
            )}
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
