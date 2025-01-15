import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  FormControl,
  FormLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  Button,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Slider,
  ListSubheader,
  CircularProgress
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import diversityIndices from '../shared/vocabularies/diversityIndices.json';
import {
  setSelectedIndices,
  setColorPalette,
  setUseQuantiles,
  setValueRange,
  setMinRecords
} from '../store/visualizationSlice';

const drawerWidth = 340;

// Color schemes for different metric types
const colorSchemes = {
  effectSize: {
    HighlyNegative: "#8B0000",
    Negative: "#FF0000",
    NotSignificant: "#FAFAD2",
    Positive: "#4876FF",
    HighlyPositive: "#27408B"
  },
  canape: {
    Neo_endemism: "#FF0000",
    Paleo_endemism: "#4876FF",
    NotSignificant: "#FAFAD2",
    Mixed_endemism: "#CB7FFF",
    Super_endemism: "#9D00FF"
  },
  missing: "#808080"
};

const VisualizationPanel = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  
  // Get state from Redux
  const {
    selectedIndices,
    colorPalette,
    useQuantiles,
    valueRange,
    minRecords
  } = useSelector(state => state.visualization);
  
  const { status, indices: computedIndices, error, geoJSON } = useSelector(state => state.results);
  const hasResults = status === 'completed' && computedIndices.length > 0;
  const isLoading = status === 'running';
  const hasFailed = status === 'failed';

  // Debug logging
  useEffect(() => {
    console.log('VisualizationPanel state:', {
      isOpen,
      status,
      computedIndices,
      selectedIndices,
      hasResults,
      isLoading,
      hasFailed,
      geoJSON: geoJSON ? {
        type: geoJSON.type,
        featureCount: geoJSON.features?.length
      } : null
    });
  }, [isOpen, status, computedIndices, selectedIndices, hasResults, isLoading, hasFailed, geoJSON]);

  // Don't automatically close the panel, let the Layout component handle it
  useEffect(() => {
    if (isOpen && hasResults) {
      // If we have results and no indices are selected, select Richness by default
      if (selectedIndices.length === 0 && computedIndices.includes('Richness')) {
        console.log('Setting default index to Richness in VisualizationPanel');
        dispatch(setSelectedIndices(['Richness']));
      }
    }
  }, [isOpen, hasResults, selectedIndices, computedIndices, dispatch]);

  // Handle index selection
  const handleIndicesChange = (event) => {
    const value = event.target.value;
    // Limit to max 2 indices
    if (value.length <= 2) {
      dispatch(setSelectedIndices(value));
    }
  };

  // Get index metadata from diversityIndices vocabulary
  const getIndexMetadata = (indexId) => {
    return diversityIndices.groups
      .flatMap(group => group.indices)
      .find(index => index.commandName === indexId);
  };

  // Determine color palette type based on index
  const getDefaultPalette = (indexId) => {
    const metadata = getIndexMetadata(indexId);
    if (!metadata) return 'sequential';

    if (indexId === 'CANAPE') return 'categorical';
    if (indexId.startsWith('SES.')) return 'diverging';
    return 'sequential';
  };

  // Update color palette when indices change
  useEffect(() => {
    if (selectedIndices.length === 1) {
      const defaultPalette = getDefaultPalette(selectedIndices[0]);
      if (defaultPalette !== colorPalette) {
        dispatch(setColorPalette(defaultPalette));
      }
    }
  }, [selectedIndices, colorPalette, dispatch, getDefaultPalette]);

  // Calculate min/max values for the selected index
  const getValueRangeForIndex = (indexName) => {
    if (!geoJSON?.features?.length || !indexName) {
      console.log('No GeoJSON data or index name:', { 
        hasFeatures: geoJSON?.features?.length > 0, 
        indexName 
      });
      return null;
    }
    
    console.log('Getting value range for index:', indexName);
    console.log('GeoJSON features count:', geoJSON.features.length);
    console.log('First feature properties:', geoJSON.features[0]?.properties);
    
    const values = geoJSON.features
      .map(f => f.properties[indexName])
      .filter(v => typeof v === 'number' && !isNaN(v) && v !== null);
    
    if (values.length === 0) {
      console.log('No valid values found for index:', indexName);
      return null;
    }
    
    const range = [Math.min(...values), Math.max(...values)];
    console.log('Calculated range for', indexName, ':', range);
    return range;
  };

  // Initialize value ranges when GeoJSON data is loaded
  useEffect(() => {
    if (geoJSON?.features?.length > 0 && selectedIndices.length === 1) {
      console.log('Initializing value range for index:', selectedIndices[0]);
      const newRange = getValueRangeForIndex(selectedIndices[0]);
      if (newRange) {
        console.log('Setting initial value range:', newRange);
        dispatch(setValueRange(newRange));
      }
    }
  }, [geoJSON, selectedIndices, dispatch]);

  // Render index selection menu items
  const renderIndexMenuItems = () => {
    return diversityIndices.groups.map((group) => [
      <ListSubheader key={group.id}>
        <Typography variant="subtitle2">{group.name}</Typography>
      </ListSubheader>,
      ...group.indices
        .filter(index => computedIndices.includes(index.commandName))
        .map((index) => (
          <MenuItem 
            key={index.id} 
            value={index.commandName}
            disabled={selectedIndices.length >= 2 && !selectedIndices.includes(index.commandName)}
          >
            <FormControlLabel
              control={
                <Checkbox 
                  checked={selectedIndices.includes(index.commandName)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{index.displayName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {index.description}
                  </Typography>
                </Box>
              }
            />
          </MenuItem>
        ))
    ]);
  };

  // Handle color palette change
  const handleColorPaletteChange = (event) => {
    dispatch(setColorPalette(event.target.value));
  };

  // Handle quantile toggle
  const handleQuantileToggle = (event) => {
    dispatch(setUseQuantiles(event.target.checked));
  };

  // Handle value range change
  const handleValueRangeChange = (event, newValue) => {
    dispatch(setValueRange(newValue));
  };

  // Handle minimum records change
  const handleMinRecordsChange = (event, newValue) => {
    dispatch(setMinRecords(newValue));
  };

  // Handle map export
  const handleExportMap = () => {
    const map = document.querySelector('.ol-viewport canvas');
    if (map) {
      const link = document.createElement('a');
      link.download = 'map_export.png';
      link.href = map.toDataURL();
      link.click();
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 4 }}>
          <CircularProgress />
          <Typography>Analysis in progress...</Typography>
          <Typography variant="caption" color="text.secondary">
            Please wait while the pipeline completes.
          </Typography>
        </Box>
      );
    }

    if (hasFailed) {
      return (
        <Box sx={{ textAlign: 'center', mt: 4, color: 'error.main' }}>
          <Typography>Analysis failed</Typography>
          {error && (
            <Typography variant="caption" color="text.secondary">
              {error}
            </Typography>
          )}
        </Box>
      );
    }

    if (!hasResults) {
      return (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          No analysis results available. Run an analysis first.
        </Typography>
      );
    }

    return (
      <>
        {/* Index Selection */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Select Indices</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl fullWidth>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FormLabel>Diversity indices</FormLabel>
                <Tooltip 
                  title="Select up to two indices to visualize. If two are selected, a swipe comparison will be enabled."
                  placement="right"
                >
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Select
                multiple
                value={selectedIndices}
                onChange={handleIndicesChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {selected.map((indexId) => {
                      const index = diversityIndices.groups
                        .flatMap(group => group.indices)
                        .find(index => index.commandName === indexId);
                      return index?.displayName || indexId;
                    }).join(', ')}
                  </Box>
                )}
              >
                {renderIndexMenuItems()}
              </Select>
            </FormControl>
          </AccordionDetails>
        </Accordion>

        {/* Visualization Options */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Display Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Color Palette Selection */}
              <FormControl fullWidth>
                <FormLabel>Color palette</FormLabel>
                <Select
                  value={colorPalette}
                  onChange={handleColorPaletteChange}
                >
                  <MenuItem value="sequential">Sequential</MenuItem>
                  <MenuItem value="diverging">Diverging</MenuItem>
                  <MenuItem value="categorical">Categorical</MenuItem>
                </Select>
              </FormControl>

              {/* Quantile Toggle */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useQuantiles}
                    onChange={handleQuantileToggle}
                  />
                }
                label="Use quantile bins"
              />

              {/* Value Range Filter */}
              <Box>
                <FormLabel>
                  Value range filter
                  {selectedIndices.length === 2 && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (Disabled when comparing two indices)
                    </Typography>
                  )}
                </FormLabel>
                {selectedIndices.length === 1 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {(() => {
                      const range = getValueRangeForIndex(selectedIndices[0]);
                      console.log('Current range for slider:', range);
                      return range ? (
                        <>
                          <Slider
                            value={valueRange || range}
                            onChange={handleValueRangeChange}
                            valueLabelDisplay="auto"
                            min={range[0]}
                            max={range[1]}
                            step={(range[1] - range[0]) / 100}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">{range[0].toFixed(2)}</Typography>
                            <Typography variant="caption">{range[1].toFixed(2)}</Typography>
                          </Box>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No data available for the selected index
                        </Typography>
                      );
                    })()}
                  </Box>
                )}
                {selectedIndices.length === 2 && (
                  <Slider
                    disabled
                    value={[0, 100]}
                    valueLabelDisplay="off"
                  />
                )}
                {selectedIndices.length === 0 && (
                  <Slider
                    disabled
                    value={[0, 100]}
                    valueLabelDisplay="off"
                  />
                )}
              </Box>

              {/* Minimum Records Filter */}
              <Box>
                <FormLabel>Minimum records per cell</FormLabel>
                <Slider
                  value={minRecords}
                  onChange={handleMinRecordsChange}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Export Options */}
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportMap}
            fullWidth
          >
            Export Map
          </Button>
        </Box>
      </>
    );
  };

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
          Visualization
        </Typography>
        <IconButton onClick={onClose}>
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      <Box sx={{ p: 2, overflow: 'auto' }}>
        {renderContent()}
      </Box>
    </Drawer>
  );
};

export default VisualizationPanel; 