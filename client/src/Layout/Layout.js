import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { Layout as AntLayout, Button, theme, Spin, Dropdown, Tooltip, message, Tour } from 'antd';
import { useSelector } from 'react-redux';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  LineChartOutlined,
  ExperimentOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../Auth/AuthContext';

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
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const location = useLocation();
  const { id: runId } = useParams();
  const { status } = useSelector(state => state.results);
  const isAnalysisRunning = status === 'running';
  const { user } = useAuth();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // Add ref to track previous status
  const prevStatusRef = useRef(status);

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

  // Separate function for programmatic panel switching - MOVED BEFORE IT'S USED
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

  // Function to expand accordion based on tour step
  const expandAccordionForStep = useCallback((step) => {
    if (!isWorkflowPage) return;
    
    // Get all accordions
    const accordions = document.querySelectorAll('.MuiAccordion-root');
    if (!accordions.length) return;
    
    // Map step to accordion index
    let accordionIndex = -1;
    if (step === 1) accordionIndex = 0; // Spatial Filters
    if (step === 2) accordionIndex = 1; // Taxonomic Filters
    if (step === 3) accordionIndex = 2; // Data Selection
    if (step === 4) accordionIndex = 3; // Diversity Estimation
    
    // Expand the target accordion and collapse others
    if (accordionIndex >= 0 && accordionIndex < accordions.length) {
      accordions.forEach((accordion, index) => {
        const expanded = index === accordionIndex;
        const summaryButton = accordion.querySelector('.MuiAccordionSummary-root');
        
        // Only toggle if current state doesn't match desired state
        const isCurrentlyExpanded = accordion.classList.contains('Mui-expanded');
        if (expanded !== isCurrentlyExpanded && summaryButton) {
          summaryButton.click();
        }
      });
    }
  }, [isWorkflowPage]);

  // Handle tour step change
  const handleTourChange = useCallback((current) => {
    console.log('Tour step changed to:', current);
    
    // First expand the accordions with a small delay to ensure DOM is ready
    setTimeout(() => {
      expandAccordionForStep(current);
      
      // Then update the tour step after accordion expansion is complete
      setTimeout(() => {
        setCurrentTourStep(current);
      }, 300);
    }, 50);
  }, [expandAccordionForStep]);

  // Handle tour close
  const handleTourClose = useCallback(() => {
    setIsTourActive(false);
    message.success('Tour completed! You can click the question mark icon anytime to restart the tour.');
    console.log('Tour completed');
  }, []);

  // Effect to handle tour state changes
  useEffect(() => {
    if (isTourActive && user) {
      console.log('Starting application tour...');
      // Make sure settings panel is open
      if (activePanel !== 'settings') {
        handlePanelOpen('settings');
      }
      
      // Make sure panel is not collapsed
      setIsPanelCollapsed(false);
      
      // Initial accordion setup with a delay to ensure DOM is ready
      // We need this to happen before setting the first tour step
      setTimeout(() => {
        expandAccordionForStep(1); // Expand first accordion for Spatial Filters
        
        // Set tour step after accordion is expanded
        setTimeout(() => {
          setCurrentTourStep(0); // Start with welcome screen
        }, 300);
      }, 300);
    } else if (isTourActive && !user) {
      // If somehow the tour is activated without a user, reset it
      setIsTourActive(false);
    }
  }, [isTourActive, user, activePanel, handlePanelOpen, expandAccordionForStep]);

  const handleMenuClick = useCallback((key) => {
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
  }, [activePanel, status, runId]);

  useEffect(() => {
    // Only switch to visualization when status changes from something else to 'completed'
    if (status === 'completed' && prevStatusRef.current !== 'completed') {
      handlePanelOpen('visualization');
    }
    // Update the ref
    prevStatusRef.current = status;
  }, [status, handlePanelOpen]);

  // Simple tour steps
  const tourSteps = [
    {
      title: 'Welcome to PhyloNext',
      description: 'This guided tour will help you understand the key features of PhyloNext. Let\'s start with the Settings panel, which is where you configure your biodiversity analysis.',
      target: null,
      placement: 'center',
    },
    {
      title: 'Spatial filters',
      description: 'Here you can set the spatial resolution of your analysis and select the geographic area of interest. You can draw polygons on the map, select countries, or upload your own spatial files.',
      target: () => document.querySelector('.MuiAccordion-root:nth-child(1)'),
      placement: 'right',
    },
    {
      title: 'Taxonomic filters',
      description: 'Choose a phylogenetic tree and filter by taxonomic groups. Then, you may adjust the selection by including specific taxa at different ranks (Phylum, Class, Order, Family, Genus) or upload your own custom species list.',
      target: () => document.querySelector('.MuiAccordion-root:nth-child(2)'),
      placement: 'right',
    },
    {
      title: 'Data selection criteria',
      description: 'Refine your analysis by controlling species occurrence types and time period. Set the sensitivity for outlier removal and specify a year range for occurrence records.',
      target: () => document.querySelector('.MuiAccordion-root:nth-child(3)'),
      placement: 'right',
    },
    {
      title: 'Diversity estimation',
      description: 'Select the biodiversity indices you want to calculate. Multiple indices can be selected to compare different aspects of diversity simultaneously.',
      target: () => document.querySelector('.MuiAccordion-root:nth-child(4)'),
      placement: 'right',
    },
    {
      title: 'Start analysis',
      description: 'Once you\'ve configured all settings, click this button to start the analysis. Your results will be displayed in the Visualization panel when ready.',
      target: () => {
        // Get all buttons in the drawer
        const allButtons = document.querySelectorAll('.MuiDrawer-paper button');
        // Find the button with text "Start Analysis"
        for (let i = 0; i < allButtons.length; i++) {
          if (allButtons[i].textContent.includes('Start Analysis')) {
            return allButtons[i];
          }
        }
        // Fallback to position-based selector if text search fails
        return document.querySelector('.MuiDrawer-paper > div > div:last-of-type button');
      },
      placement: 'top',
    },
    {
      title: 'Navigation menu',
      description: 'Use this menu to switch between different panels: Settings, Visualization, and Tests. The Visualization panel will show your results, and the Tests panel allows you to compare diversities of two areas.',
      target: () => document.querySelector('.ant-dropdown-trigger'),
      placement: 'bottomLeft',
    },
    {
      title: 'User menu',
      description: 'Click your username to access the user menu. From here, you can start a new analysis and view your analysis history. In the `Run history` section, you can download the results as a zip file, or delete them.',
      target: () => document.querySelector('span[style*="cursor: pointer"]'),
      placement: 'bottomRight',
    },
    {
      title: 'Tour complete',
      description: 'You can start the tour again at any time by clicking the question mark icon in the top right corner. Happy exploring!',
      target: null,
      placement: 'center',
    }
  ];

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
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={user ? "Start a guided tour to learn about the application features and how to use them" : "Please log in to access the guided tour"}>
              <Button 
                type="text" 
                icon={<QuestionCircleOutlined style={{ color: user ? '#1890ff' : '#bfbfbf', fontSize: '20px' }} />} 
                style={{ 
                  marginRight: 8,
                  background: user ? 'rgba(24, 144, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: user ? 'pointer' : 'not-allowed'
                }}
                onClick={() => user && setIsTourActive(true)}
                disabled={!user}
              />
            </Tooltip>
            <UserMenu />
          </Box>
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
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={user ? "Start a guided tour to learn about the application features and how to use them" : "Please log in to access the guided tour"}>
            <Button 
              type="text" 
              icon={<QuestionCircleOutlined style={{ color: user ? '#1890ff' : '#bfbfbf', fontSize: '20px' }} />} 
              style={{ 
                marginRight: 8,
                background: user ? 'rgba(24, 144, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: user ? 'pointer' : 'not-allowed'
              }}
              onClick={() => user && setIsTourActive(true)}
              disabled={!user}
            />
          </Tooltip>
          <UserMenu />
        </Box>
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
        
        {/* Tour component */}
        {isWorkflowPage && (
          <Tour
            open={isTourActive}
            onClose={handleTourClose}
            steps={tourSteps}
            current={currentTourStep}
            onChange={handleTourChange}
            arrow={true}
            placement="right"
            mask={{
              style: {
                backgroundColor: 'rgba(0, 0, 0, 0.2)'
              },
              color: 'rgba(0, 0, 0, 0.2)'
            }}
            type="primary"
            scrollIntoViewOptions={true}
            zIndex={1050}
            disabledInteraction={false}
          />
        )}
      </Content>
    </AntLayout>
  );
};

export default Layout;
