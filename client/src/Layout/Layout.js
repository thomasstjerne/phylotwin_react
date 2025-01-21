import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { Layout as AntLayout, Button, theme, Spin, Dropdown } from 'antd';
import { useSelector } from 'react-redux';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  LineChartOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { Box, Typography } from '@mui/material';

import SettingsPanel from './SettingsPanel';
import VisualizationPanel from './VisualizationPanel';
import HypothesisPanel from './HypothesisPanel';
import UserMenu from '../Components/UserMenu';
import JobStatusPoller from '../Components/JobStatusPoller';
import Logo from './Logo';

const { Header, Content } = AntLayout;

const Layout = ({ step, setStep }) => {
  const [activePanel, setActivePanel] = useState('settings');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const location = useLocation();
  const { id: runId } = useParams();
  const { status } = useSelector(state => state.results);
  const isAnalysisRunning = status === 'running';
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // Only show the navigation and settings panel on the workflow page
  const isWorkflowPage = location.pathname === '/run' || location.pathname.startsWith('/run/');

  // Set initial active panel based on conditions
  useEffect(() => {
    if (!isWorkflowPage) return;

    // Only set initial panel if no panel is currently active
    // or if we're just loading the page (no manual panel change has occurred)
    const isInitialLoad = !activePanel;

    const determineInitialPanel = () => {
      if (runId) {
        console.log('Initial panel: visualization (historical run)');
        return 'visualization';
      }
      if (status === 'completed' || status === 'running') {
        console.log('Initial panel: visualization (active analysis)');
        return 'visualization';
      }
      console.log('Initial panel: settings (new analysis)');
      return 'settings';
    };

    if (isInitialLoad) {
      const newPanel = determineInitialPanel();
      if (activePanel !== newPanel) {
        console.log(`Updating active panel from ${activePanel} to ${newPanel}`);
        setActivePanel(newPanel);
      }
    }
  }, [isWorkflowPage, runId, status, activePanel]);

  // Add a debug effect to track panel changes
  useEffect(() => {
    console.log('Active panel changed:', {
      activePanel,
      status,
      runId,
      isWorkflowPage
    });
  }, [activePanel, status, runId, isWorkflowPage]);

  const handleMenuClick = (key) => {
    console.log('Menu click:', {
      key,
      currentPanel: activePanel,
      currentStatus: status,
      runId,
      isHistoricalRun: !!runId
    });
    
    // Prevent unnecessary state updates
    if (key === activePanel) {
      console.log('Panel already active:', key);
      return;
    }

    // For historical runs (when runId exists), allow switching between panels freely
    if (runId) {
      console.log('Historical run - allowing panel switch to:', key);
      setActivePanel(key);
      setIsPanelCollapsed(false);
      return;
    }

    // For active sessions, validate panel transitions
    if (key === 'visualization' && status !== 'completed' && status !== 'running') {
      console.log('Cannot open visualization panel - no analysis in progress or completed');
      return;
    }

    if (key === 'settings' && status === 'running') {
      console.log('Cannot switch to settings while analysis is running');
      return;
    }

    if (key === 'hypothesis' && status !== 'completed') {
      console.log('Cannot open hypothesis panel - analysis not completed');
      return;
    }

    console.log('Active session - allowing panel switch to:', key);
    setActivePanel(key);
    setIsPanelCollapsed(false);
  };

  // Separate function for programmatic panel switching
  const handlePanelOpen = useCallback((key) => {
    console.log('Opening panel:', key, {
      currentPanel: activePanel,
      currentStatus: status,
      runId,
      isHistoricalRun: !!runId
    });
    
    // Prevent unnecessary state updates
    if (key === activePanel) {
      console.log('Panel already active:', key);
      return;
    }

    // For historical runs (when runId exists), allow switching between panels freely
    if (runId) {
      console.log('Historical run - allowing panel switch to:', key);
      setActivePanel(key);
      setIsPanelCollapsed(false);
      return;
    }

    // For active sessions, validate panel transitions
    if (key === 'settings' && status === 'running') {
      console.log('Cannot switch to settings while analysis is running');
      return;
    }

    console.log('Active session - allowing panel switch to:', key);
    setActivePanel(key);
    setIsPanelCollapsed(false);
  }, [activePanel, status, runId]);

  // Get panel title based on active panel
  const getPanelTitle = () => {
    switch (activePanel) {
      case 'settings':
        return 'Settings';
      case 'visualization':
        return 'Visualization';
      case 'hypothesis':
        return 'Tests';
      default:
        return '';
    }
  };

  // Menu items for the dropdown
  const menuItems = {
    items: [
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Settings',
        // Only disable settings in active runs when analysis is running
        disabled: !runId && status === 'running'
      },
      {
        key: 'visualization',
        icon: <LineChartOutlined />,
        label: 'Visualization',
        // Enable visualization for historical runs or when analysis is running/completed
        disabled: !runId && status !== 'completed' && status !== 'running'
      },
      {
        key: 'hypothesis',
        icon: <ExperimentOutlined />,
        label: 'Tests',
        // Enable hypothesis for historical runs or when analysis is completed
        disabled: !runId && status !== 'completed'
      },
    ],
    onClick: ({ key }) => handleMenuClick(key),
  };

  // For non-workflow pages, render a simpler layout with just the header and content
  if (!isWorkflowPage) {
    return (
      <AntLayout style={{ minHeight: '100vh' }}>
        <Header style={{ 
          padding: '0 16px', 
          background: colorBgContainer, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'flex-end',
          height: 48,
          lineHeight: '48px'
        }}>
          <UserMenu />
        </Header>
        <Content style={{ margin: '0 16px' }}>
          <Outlet />
        </Content>
      </AntLayout>
    );
  }

  // For workflow page, render the full layout with panels
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <JobStatusPoller handlePanelOpen={handlePanelOpen} />
      <Header style={{ 
        padding: '0 16px', 
        background: colorBgContainer, 
        display: 'flex', 
        alignItems: 'center',
        height: 48,
        lineHeight: '48px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1002,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 2,
          flexGrow: 1
        }}>
          <Dropdown 
            menu={menuItems} 
            trigger={['click']}
            placement="bottomLeft"
            getPopupContainer={(trigger) => trigger.parentNode}
            overlayStyle={{ zIndex: 1003 }}
          >
            <Button
              type="text"
              icon={isPanelCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={(e) => {
                if (e.domEvent) {
                  e.domEvent.stopPropagation();
                }
                // Only toggle collapse if we have an active panel
                if (activePanel) {
                  setIsPanelCollapsed(!isPanelCollapsed);
                }
              }}
              style={{
                fontSize: '16px',
                width: 48,
                height: 48,
              }}
            />
          </Dropdown>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 500,
              minWidth: 100
            }}
          >
            {getPanelTitle()}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Logo />
            {isAnalysisRunning && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1 
              }}>
                <Spin size="small" />
                <Typography variant="body2">
                  Analysis running...
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
        <UserMenu />
      </Header>

      <Content style={{ 
        marginTop: 48, 
        position: 'relative', 
        height: 'calc(100vh - 48px)',
        overflow: 'hidden'
      }}>
        {/* Main content area (map) */}
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          overflow: 'hidden'
        }}>
          <Outlet context={{ activePanel, handlePanelOpen }} />
        </Box>

        {/* Panel overlays */}
        <SettingsPanel
          isOpen={activePanel === 'settings'}
          onClose={() => setActivePanel(null)}
          isCollapsed={isPanelCollapsed}
          activePanel={activePanel}
          handlePanelOpen={handlePanelOpen}
          setStep={setStep}
        />

        <VisualizationPanel
          isOpen={activePanel === 'visualization'}
          onClose={() => setActivePanel(null)}
          isCollapsed={isPanelCollapsed}
          handlePanelOpen={handlePanelOpen}
        />

        <HypothesisPanel
          isOpen={activePanel === 'hypothesis'}
          onClose={() => setActivePanel(null)}
          isCollapsed={isPanelCollapsed}
        />
      </Content>
    </AntLayout>
  );
};

export default Layout;
