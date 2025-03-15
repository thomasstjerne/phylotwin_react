import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    
    // Check if we're trying to add a second index when Hurlbert's ES is already selected
    const hasHurlbertES = selectedIndices.some(idx => idx.startsWith('ES_'));
    const isAddingSecondIndex = value.length > selectedIndices.length && value.length > 1;
    
    // If Hurlbert's ES is already selected and we're trying to add another index, prevent it
    if (hasHurlbertES && isAddingSecondIndex) {
      console.log('Preventing selection of second index when Hurlbert\'s ES is selected');
      return;
    }
    
    // Check if we're trying to add Hurlbert's ES as a second index
    const isAddingHurlbertES = value.some(idx => idx.startsWith('ES_')) && 
                              !selectedIndices.some(idx => idx.startsWith('ES_'));
    
    // If we already have an index and we're trying to add Hurlbert's ES, prevent it
    if (selectedIndices.length === 1 && isAddingHurlbertES) {
      console.log('Preventing adding Hurlbert\'s ES as a second index');
      return;
    }
    
    // Special case for deselecting Hurlbert's ES
    // If we had an ES_X selected but it's no longer in the value array, that means we're deselecting it
    const hadHurlbertES = selectedIndices.some(idx => idx.startsWith('ES_'));
    const stillHasHurlbertES = value.some(idx => idx.startsWith('ES_'));
    
    if (hadHurlbertES && !stillHasHurlbertES) {
      console.log('Deselecting Hurlbert\'s ES');
      hasUserInteracted.current = true;
      dispatch(setSelectedIndices(value.filter(idx => !idx.startsWith('ES_'))));
      return;
    }
    
    // Allow empty selection and limit to max 2 indices
    if (value.length <= 2) {
      hasUserInteracted.current = true;  // Mark that user has made a selection
      dispatch(setSelectedIndices(value));
    }
  };

  // Get available ES values from GeoJSON data
  const getAvailableESValues = useCallback(() => {
    if (!geoJSON?.features?.length) return [];
    
    const properties = geoJSON.features[0].properties || {};
    
    // Get the Hurlbert's ES metadata to find the exact resultName values
    const hurlbertMetadata = diversityIndices.groups
      .flatMap(group => group.indices)
      .find(index => index.id === 'hurlbert');
    
    // Get the exact ES_X values from resultName
    const validESKeys = hurlbertMetadata?.resultName || [];
    
    // Filter properties to only include the exact ES_X values from resultName
    const esKeys = Object.keys(properties).filter(key => 
      validESKeys.includes(key) && key.startsWith('ES_')
    );
    
    // Extract numeric values from ES_X keys and sort them numerically
    return esKeys
      .map(key => {
        const match = key.match(/ES_(\d+)$/); // Match only ES_X without any suffix
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(Boolean)
      .sort((a, b) => a - b);
  }, [geoJSON]);

  // State for selected ES value
  const [selectedESValue, setSelectedESValue] = useState(null);

  // Update selected ES value when available values change or when indices change
  useEffect(() => {
    const availableValues = getAvailableESValues();
    
    // If Hurlbert's ES is selected
    if (selectedIndices.length === 1 && selectedIndices[0].startsWith('ES_')) {
      // Extract current value from selected index
      const match = selectedIndices[0].match(/ES_(\d+)/);
      const currentValue = match ? parseInt(match[1], 10) : null;
      
      // If current value is valid and available, keep it
      if (currentValue && availableValues.includes(currentValue)) {
        setSelectedESValue(currentValue);
      } 
      // Otherwise select the lowest available value
      else if (availableValues.length > 0) {
        setSelectedESValue(availableValues[0]);
        dispatch(setSelectedIndices([`ES_${availableValues[0]}`]));
      }
    } else {
      // Reset when Hurlbert's ES is not selected
      setSelectedESValue(null);
    }
  }, [selectedIndices, getAvailableESValues, dispatch]);

  // Handle ES value change
  const handleESValueChange = (event) => {
    const value = parseInt(event.target.value, 10);
    setSelectedESValue(value);
    
    // Update selected indices with the new ES value
    dispatch(setSelectedIndices([`ES_${value}`]));
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
    // Get the hurlbert index metadata from the vocabulary
    const hurlbertMetadata = diversityIndices.groups
      .flatMap(group => group.indices)
      .find(index => index.id === 'hurlbert');
    
    // Get the exact ES_X values from resultName
    const validESKeys = hurlbertMetadata?.resultName || [];
    
    // Check if any of the exact ES_X values are present in the computed indices
    const hasHurlbertES = validESKeys.some(key => computedIndices.includes(key));
    
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
          
          // Special case for Hurlbert's ES
          if (index.id === 'hurlbert') {
            return hasHurlbertES;
          }
          
          // Skip individual ES_X indices as we'll handle them specially
          if (Array.isArray(index.resultName) && index.resultName.some(name => name.startsWith('ES_'))) {
            return false;
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
          let indexValue;
          
          // Special case for CANAPE
          if (index.id === 'canape') {
            indexValue = 'CANAPE';
          } 
          // Special case for Hurlbert's ES
          else if (index.id === 'hurlbert') {
            // Use the first available ES_X value
            const availableESValues = getAvailableESValues();
            
            // If no ES values are available, skip this item
            if (availableESValues.length === 0) return null;
            
            // Use the currently selected ES value if one is selected, otherwise use the first available
            const selectedESIndex = selectedIndices.find(idx => idx.startsWith('ES_'));
            indexValue = selectedESIndex || `ES_${availableESValues[0]}`;
          } 
          // Normal case
          else {
            indexValue = index.resultName;
          }
          
          return (
            <MenuItem 
              key={index.id} 
              value={indexValue}
              disabled={
                // Disable if we already have 2 indices and this one isn't selected
                (selectedIndices.length >= 2 && !selectedIndices.includes(indexValue)) ||
                // Disable other indices if Hurlbert's ES is selected
                (selectedIndices.some(idx => idx.startsWith('ES_')) && !indexValue.startsWith('ES_')) ||
                // Disable Hurlbert's ES if another index is already selected
                (index.id === 'hurlbert' && selectedIndices.length === 1 && !selectedIndices.some(idx => idx.startsWith('ES_')))
              }
            >
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={
                      // For Hurlbert's ES, check if any ES_X is selected
                      index.id === 'hurlbert' 
                        ? selectedIndices.some(idx => idx.startsWith('ES_'))
                        : selectedIndices.includes(indexValue)
                    }
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
        .filter(Boolean) // Remove null items
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
        
        // Get display title for the index
        let displayTitle = indexId;
        
        // Special case for Hurlbert's ES
        if (indexId.startsWith('ES_')) {
          const match = indexId.match(/ES_(\d+)/);
          const sampleSize = match ? match[1] : '';
          const hurlbertMetadata = diversityIndices.groups
            .flatMap(group => group.indices)
            .find(index => index.id === 'hurlbert');
          
          if (hurlbertMetadata) {
            displayTitle = `${hurlbertMetadata.displayName} (n=${sampleSize})`;
          }
        } else {
          // Normal case for other indices
          const metadata = diversityIndices.groups
            .flatMap(group => group.indices)
            .find(index => {
              if (indexId === 'CANAPE' && index.id === 'canape') {
                return true;
              }
              if (Array.isArray(index.resultName)) {
                return index.resultName.includes(indexId);
              }
              return index.resultName === indexId || index.commandName === indexId;
            });
          
          if (metadata) {
            displayTitle = metadata.displayName;
          }
        }
        
        context.fillText(displayTitle, 0, 0, LEGEND_WIDTH - 2 * LEGEND_PADDING_HORIZONTAL);

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
                  title={
                    selectedIndices.some(idx => idx.startsWith('ES_'))
                      ? "Hurlbert's ES cannot be used in swipe comparison due to its sample size dependency. Click on the checkbox to deselect it."
                      : "Select up to two indices to visualize. If two are selected, a swipe comparison will be enabled. Note: Hurlbert's ES cannot be used in swipe comparison."
                  }
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
                      // Special case for Hurlbert's ES
                      if (indexId.startsWith('ES_')) {
                        const match = indexId.match(/ES_(\d+)/);
                        const sampleSize = match ? match[1] : '';
                        const hurlbertMetadata = diversityIndices.groups
                          .flatMap(group => group.indices)
                          .find(index => index.id === 'hurlbert');
                        
                        return hurlbertMetadata 
                          ? `${hurlbertMetadata.displayName} (n=${sampleSize})` 
                          : indexId;
                      }
                      
                      // Normal case for other indices
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

        {/* Hurlbert's ES Sample Size Selection */}
        {selectedIndices.length === 1 && 
         selectedIndices[0].startsWith('ES_') && 
         getAvailableESValues().length > 0 && (
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Hurlbert's ES
              </Typography>
              <Tooltip 
                title="Hurlbert's ES estimates the expected number of species in a random sample of n occurrence records"
                placement="right"
              >
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Sample size (n):
              </Typography>
            </Box>
            
            {/* Custom equally-spaced slider */}
            <Box sx={{ px: 1, mt: 0, mb: 1, position: 'relative' }}>
              {/* Track line */}
              <Box sx={{ 
                height: 4, 
                bgcolor: 'grey.300', 
                borderRadius: 2,
                position: 'relative',
                mt: 2,
                mb: 4
              }}>
                {/* Colored track portion */}
                <Box sx={{ 
                  height: '100%', 
                  width: `${(getAvailableESValues().indexOf(selectedESValue) / Math.max(1, getAvailableESValues().length - 1)) * 100}%`, 
                  bgcolor: 'primary.main',
                  borderRadius: 2
                }} />
              </Box>
              
              {/* Dots and labels */}
              <Box sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 40,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                {getAvailableESValues().map((value) => (
                  <Box 
                    key={value} 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      cursor: 'pointer',
                      mt: -1
                    }}
                    onClick={() => handleESValueChange({ target: { value } })}
                  >
                    <Box sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '50%', 
                      bgcolor: selectedESValue === value ? 'primary.main' : 'grey.300',
                      border: '2px solid white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.2)',
                        bgcolor: selectedESValue === value ? 'primary.main' : 'grey.400',
                      },
                      zIndex: 2
                    }} />
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        mt: 1,
                        fontSize: '0.75rem'
                      }}
                    >
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              Selected: {selectedESValue} occurrence records
            </Typography>
          </Box>
        )}

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