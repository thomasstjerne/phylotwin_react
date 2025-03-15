import React, { useState, useEffect, useRef } from 'react';
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
  setMinRecords,
  selectQuantileBins,
  selectColorSchemeType
} from '../store/visualizationSlice';
import { PALETTES, getPalettesForType, getColorScale } from '../utils/colorScales';

const drawerWidth = 340;

const VisualizationPanel = ({ isOpen, onClose, isCollapsed, handlePanelOpen }) => {
  const dispatch = useDispatch();
  
  // Get state from Redux
  const {
    selectedIndices,
    colorPalette,
    useQuantiles,
    valueRange,
    minRecords
  } = useSelector(state => state.visualization);
  
  const quantileBins = useSelector(selectQuantileBins);
  const colorSchemeType = useSelector(selectColorSchemeType);
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
      colorSchemeType,
      geoJSON: geoJSON ? {
        type: geoJSON.type,
        featureCount: geoJSON.features?.length
      } : null
    });
  }, [isOpen, status, computedIndices, selectedIndices, hasResults, isLoading, hasFailed, colorSchemeType, geoJSON]);

  // Don't automatically close the panel, let the Layout component handle it
  useEffect(() => {
    if (isOpen && hasResults) {
      // Only set default index if this is the first time results are available
      // and no indices are currently selected
      if (selectedIndices.length === 0 && computedIndices.includes('Richness') && !hasUserInteracted.current) {
        console.log('Setting default index to Richness in VisualizationPanel');
        dispatch(setSelectedIndices(['Richness']));
        hasUserInteracted.current = true;  // Mark that we've done the initial selection
      }
    }

    // Reset user interaction flag when panel is closed
    if (!isOpen) {
      hasUserInteracted.current = false;
    }
  }, [isOpen, hasResults, selectedIndices, computedIndices, dispatch]);

  // Reset user interaction when jobId changes
  useEffect(() => {
    const jobId = geoJSON?.jobId;
    if (jobId) {
      console.log('Job ID changed, resetting user interaction state');
      hasUserInteracted.current = false;
    }
  }, [geoJSON?.jobId]);

  // Add ref to track if user has interacted with index selection
  const hasUserInteracted = useRef(false);

  // Handle index selection
  const handleIndicesChange = (event) => {
    const value = event.target.value;
    // Allow empty selection and limit to max 2 indices
    if (value.length <= 2) {
      hasUserInteracted.current = true;  // Mark that user has made a selection
      dispatch(setSelectedIndices(value));
    }
  };

  // Get index metadata from diversityIndices vocabulary
  const getIndexMetadata = (indexId) => {
    return diversityIndices.groups
      .flatMap(group => group.indices)
      .find(index => {
        // Check if indexId matches resultName (string) or is included in resultName (array)
        if (Array.isArray(index.resultName)) {
          return index.resultName.includes(indexId);
        }
        return index.resultName === indexId || index.commandName === indexId;
      });
  };

  // Handle color palette change
  const handleColorPaletteChange = (event) => {
    dispatch(setColorPalette(event.target.value));
  };

  // Get available palettes for current data type
  const getAvailablePalettes = () => {
    if (!colorSchemeType) return [];
    return getPalettesForType(colorSchemeType);
  };

  // Render color palette selection
  const renderColorPaletteSelection = () => {
    const availablePalettes = getAvailablePalettes();
    const isDivergingType = colorSchemeType === 'diverging';
    const isCanapeType = colorSchemeType === 'CANAPE';

    if (selectedIndices.length !== 1) {
      return (
        <Typography variant="caption" color="text.secondary">
          Select one index to customize the color palette
        </Typography>
      );
    }

    if (isCanapeType) {
      return (
        <Typography variant="caption" color="text.secondary">
          Color palette is fixed for CANAPE categories to ensure consistent interpretation
        </Typography>
      );
    }

    return (
      <Select
        value={colorPalette}
        onChange={handleColorPaletteChange}
        fullWidth
      >
        {availablePalettes.map(palette => (
          <MenuItem key={palette.id} value={palette.id}>
            {palette.name}
          </MenuItem>
        ))}
      </Select>
    );
  };

  // Calculate min/max values for the selected index
  const getValueRangeForIndex = (indexName) => {
    if (!geoJSON?.features?.length || !indexName) {
      console.log('No GeoJSON data or index name:', { 
        hasFeatures: geoJSON?.features?.length > 0, 
        indexName 
      });
      return null;
    }

    // Get index metadata to check if it's CANAPE
    const metadata = getIndexMetadata(indexName);
    if (metadata?.colorSchemeType === 'CANAPE') {
      console.log('CANAPE index detected, skipping value range calculation');
      return null; // CANAPE doesn't use value ranges as it's categorical
    }
    
    console.log('Getting value range for index:', indexName);
    console.log('GeoJSON features count:', geoJSON.features.length);
    
    const values = geoJSON.features
      .map(f => f.properties[indexName])
      .filter(v => typeof v === 'number' && !isNaN(v) && v !== null);
    
    if (values.length === 0) {
      console.log('No valid numeric values found for index:', indexName);
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
        .filter(index => {
          // Special case for CANAPE
          if (index.id === 'canape') {
            return computedIndices.includes('CANAPE');
          }
          
          // Check if the index's resultName (or any of its resultNames if it's an array) is in computedIndices
          if (Array.isArray(index.resultName)) {
            return index.resultName.some(name => computedIndices.includes(name));
          }
          
          // Normal case for other indices
          return computedIndices.includes(index.resultName);
        })
        .map((index) => {
          // Determine the value to use for the MenuItem
          // For CANAPE, use 'CANAPE', otherwise use the resultName
          const indexValue = index.id === 'canape' ? 'CANAPE' : index.resultName;
          
          return (
            <MenuItem 
              key={index.id} 
              value={indexValue}
              disabled={selectedIndices.length >= 2 && !selectedIndices.includes(indexValue)}
            >
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={selectedIndices.includes(indexValue)}
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
          );
        })
    ]);
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
      const canvas = document.createElement('canvas');
      canvas.width = map.width;
      canvas.height = map.height;

      const context = canvas.getContext('2d');

      context.drawImage(map, 0, 0);

      const LEGEND_WIDTH = 360;
      const LEGEND_HEIGHT = 120;
      const LEGEND_PADDING_VERTICAL = 12;
      const LEGEND_PADDING_HORIZONTAL = 15;
      const LEGEND_MARGIN = 48;

      const LEGEND_LINE_HEIGHT = 20;
      const LEGEND_SCALE_HEIGHT = 36;

      context.save()

      context.translate(
        canvas.width - LEGEND_WIDTH - LEGEND_MARGIN,
        canvas.height - selectedIndices.length * (LEGEND_HEIGHT + LEGEND_MARGIN),
      );

      for (const indexId of selectedIndices) {
        // XXX TODO: DRY with exactly the same code in Map component
        // This duplication exists because we need to recreate the legend on a canvas for export, 
        // separate from the DOM-based legend used for display
        const values = geoJSON.features
          .map(f => f.properties[indexId])
          .filter(v => typeof v === 'number' && !isNaN(v));
        
        let min = Math.min(...values);
        let max = Math.max(...values);

        if (valueRange && selectedIndices.length < 2) {
          min = Math.max(min, valueRange[0]);
          max = Math.min(max, valueRange[1]);
        }

        const appliedPalette = colorPalette;

        let appliedColorSchemeType = colorSchemeType;

        if (indexId === 'CANAPE') {
          appliedColorSchemeType = 'canape';
        } else if (indexId === 'SES.PD') {
          appliedColorSchemeType = 'diverging';
        }

        const scale = getColorScale(
          appliedColorSchemeType,
          [min, max],
          appliedPalette
        );

        context.save();

        context.fillStyle = 'white';
        context.fillRect(0, 0, LEGEND_WIDTH, LEGEND_HEIGHT);

        context.translate(LEGEND_PADDING_HORIZONTAL, LEGEND_PADDING_VERTICAL);

        context.translate(0, LEGEND_LINE_HEIGHT);

        // Get font family (NB! don't use computedStyleMap() as it's not supported in Firefox)
        const fontFamily = window.getComputedStyle(map).fontFamily || 'sans-serif';
        context.font = `20px ${fontFamily}`;
        context.fillStyle = 'black';
        context.fillText(indexId, 0, 0, LEGEND_WIDTH - 2 * LEGEND_PADDING_HORIZONTAL);

        context.translate(0, LEGEND_LINE_HEIGHT);

        // XXX TODO: DRY with <ColorLegend />
        if (useQuantiles) {
          // Draw discrete bins for binned data
          let bins;
          if (appliedColorSchemeType === 'diverging') {
            bins = [
              { label: '≤ -2.58 (p ≤ 0.01)', value: -3, color: scale(-3) },
              { label: '-2.58 to -1.96 (p ≤ 0.05)', value: -2.27, color: scale(-2.27) },
              { label: 'Not significant', value: 0, color: scale(0) },
              { label: '1.96 to 2.58 (p ≤ 0.05)', value: 2.27, color: scale(2.27) },
              { label: '≥ 2.58 (p ≤ 0.01)', value: 3, color: scale(3) }
            ];
          } else {
            const positions = [0, 0.25, 0.5, 0.75, 1];
            bins = [
              { label: '0-20%', value: min + positions[0] * (max - min), color: scale(min) },
              { label: '20-40%', value: min + positions[1] * (max - min), color: scale(min + 0.25 * (max - min)) },
              { label: '40-60%', value: min + positions[2] * (max - min), color: scale(min + 0.5 * (max - min)) },
              { label: '60-80%', value: min + positions[3] * (max - min), color: scale(min + 0.75 * (max - min)) },
              { label: '80-100%', value: min + positions[4] * (max - min), color: scale(max) }
            ];
          }

          const BOX_SIZE = 16;
          const BOX_MARGIN = 8;
          const LINE_HEIGHT = 20;

          bins.forEach((bin, i) => {
            // Draw color box
            context.fillStyle = bin.color;
            context.fillRect(0, i * LINE_HEIGHT, BOX_SIZE, BOX_SIZE);
            
            // Add subtle border to color box
            context.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            context.strokeRect(0, i * LINE_HEIGHT, BOX_SIZE, BOX_SIZE);

            // Draw label
            context.fillStyle = '#333';
            context.font = `12px ${fontFamily}`;
            context.textAlign = 'left';
            context.fillText(
              bin.label,
              BOX_SIZE + BOX_MARGIN,
              i * LINE_HEIGHT + BOX_SIZE * 0.8
            );
          });
        } else {
          // Original continuous gradient code
          const gradient = context.createLinearGradient(0, 0, LEGEND_WIDTH - 2 * LEGEND_PADDING_HORIZONTAL, 0);

          for (let i = 0; i < 100; i++) {
            const t = i / 99;
            let color;
            
            if (appliedColorSchemeType === 'diverging') {
              // Map t from [0, 1] to [-1, 1] for diverging scales
              const mappedT = t * 2 - 1;
              const absMax = Math.max(Math.abs(min), Math.abs(max));
              color = scale(mappedT * absMax);
            } else {
              // For sequential scales, map t directly to domain
              color = scale(min + t * (max - min));
            }

            gradient.addColorStop(t, color);
          }

          context.fillStyle = gradient;
          context.fillRect(0, 0, LEGEND_WIDTH - 2 * LEGEND_PADDING_HORIZONTAL, LEGEND_SCALE_HEIGHT);

          context.translate(0, LEGEND_SCALE_HEIGHT + LEGEND_LINE_HEIGHT);

          // Domain labels
          context.font = `16px ${fontFamily}`;
          context.fillStyle = '#666';
          context.fillText(min.toFixed(2), 0, 0, LEGEND_WIDTH - 2 * LEGEND_PADDING_HORIZONTAL);

          context.textAlign = 'right';
          context.fillText(max.toFixed(2), LEGEND_WIDTH - 2 * LEGEND_PADDING_HORIZONTAL, 0);
        }

        // Done with this block
        context.restore();

        // Translate to the next block position
        context.translate(0, LEGEND_HEIGHT + LEGEND_MARGIN);
      }

      context.restore();


      const link = document.createElement('a');
      link.download = 'map_export.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const renderQuantileBins = () => {
    if (!quantileBins) {
      return null;
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {quantileBins.map((bin, index) => (
          <Typography key={index} variant="caption" color="text.secondary">
            {bin.label}: {bin.range[0].toFixed(2)} to {bin.range[1] === Number.POSITIVE_INFINITY ? '∞' : bin.range[1].toFixed(2)}
          </Typography>
        ))}
      </Box>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 4 }}>
          <CircularProgress />
          <Typography variant="h6">Analysis in progress...</Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Please wait while we process your data. This may take a few minutes.
            The visualization will automatically update when results are ready.
          </Typography>
          <Box sx={{ mt: 2, width: '100%', maxWidth: 300 }}>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              While we crunch the numbers, let the magic of biodiversity unfold - your results will be ready shortly.
            </Typography>
          </Box>
        </Box>
      );
    }

    if (hasFailed) {
      return (
        <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
          <Typography variant="h6">Analysis failed</Typography>
          {error && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
          <Button
            variant="outlined"
            color="primary"
            sx={{ mt: 2 }}
            onClick={() => handlePanelOpen('settings')}
          >
            Return to Settings
          </Button>
        </Box>
      );
    }

    if (!hasResults) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No analysis results available. Run an analysis first.
          </Typography>
        </Box>
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
                        .find(index => {
                          if (indexId === 'CANAPE' && index.id === 'canape') {
                            return true;
                          }
                          if (Array.isArray(index.resultName)) {
                            return index.resultName.includes(indexId);
                          }
                          return index.resultName === indexId;
                        });
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

        {/* Binning Toggle */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={useQuantiles}
                onChange={handleQuantileToggle}
                disabled={selectedIndices.length !== 1 || selectedIndices[0] === 'CANAPE'}
              />
            }
            label={
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>
                    {selectedIndices.includes('SES.PD') ? 'Use significance thresholds' : 'Use percentile bins'}
                  </Typography>
                  <Tooltip 
                    title={
                      selectedIndices.includes('SES.PD')
                        ? "Group values into significance levels using Z-score thresholds (±1.96 for p≤0.05, ±2.58 for p≤0.01)"
                        : "Group values into five equal-sized groups (quintiles: 0-20%, 20-40%, 40-60%, 60-80%, 80-100%)"
                    }
                    placement="right"
                  >
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {selectedIndices.length !== 1 && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Available only when one index is selected
                  </Typography>
                )}
                {selectedIndices.length === 1 && selectedIndices[0] === 'CANAPE' && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Not available for CANAPE as it uses fixed categorical colors
                  </Typography>
                )}
              </Box>
            }
          />
          {useQuantiles && selectedIndices.length === 1 && selectedIndices[0] !== 'CANAPE' && (
            <Box sx={{ mt: 1, ml: 4 }}>
              {renderQuantileBins()}
            </Box>
          )}
        </Box>

        {/* Value Range Filter */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <FormLabel>
            Value range filter
            {selectedIndices.length === 2 && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                (Disabled when comparing two indices)
              </Typography>
            )}
          </FormLabel>
          {selectedIndices.length === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
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
        <Box sx={{ px: 2, py: 1.5 }}>
          <FormLabel>Minimum records per cell</FormLabel>
          <Box sx={{ mt: 1 }}>
            <Slider
              value={minRecords}
              onChange={handleMinRecordsChange}
              min={0}
              max={100}
              valueLabelDisplay="auto"
            />
          </Box>
        </Box>

        {/* Visualization Options */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Display Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Color Palette Selection */}
              <FormControl fullWidth>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <FormLabel>Color palette</FormLabel>
                  <Tooltip 
                    title={
                      colorSchemeType === 'diverging' 
                        ? "Select a diverging color scheme for SES values centered at zero"
                        : "Select a color scheme for visualizing the data"
                    }
                    placement="right"
                  >
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {renderColorPaletteSelection()}
              </FormControl>
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
          width: isCollapsed ? 0 : drawerWidth,
          boxSizing: 'border-box',
          position: 'fixed',
          height: '100%',
          border: 'none',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          top: 0,
          transition: 'width 0.2s ease-in-out',
          overflow: 'hidden',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '64px'
        },
      }}
    >
      <Box 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'background.paper',
        }}
      >
        <Box
          sx={{
            p: 2,
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: '#888 #f1f1f1',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
            '& .MuiAccordion-root': {
              '&:not(:last-child)': {
                marginBottom: 2,
              },
              '&:before': {
                display: 'none',
              },
            },
            '& .MuiAccordionSummary-root': {
              minHeight: 48,
              '&.Mui-expanded': {
                minHeight: 48,
              },
            },
            '& .MuiAccordionSummary-content': {
              margin: '12px 0',
              '&.Mui-expanded': {
                margin: '12px 0',
              },
            },
            '& .MuiAccordionDetails-root': {
              padding: '8px 16px 16px',
            },
          }}
        >
          {renderContent()}
        </Box>
      </Box>
    </Drawer>
  );
};

export default VisualizationPanel; 