import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import store from '../store';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Select,
  MenuItem,
  Slider,
  Button,
  Chip,
  Tooltip,
  ListSubheader
} from '@mui/material';
import { Spin } from 'antd';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InfoIcon from '@mui/icons-material/Info';
import ClearIcon from '@mui/icons-material/Clear';
import countries from '../Vocabularies/country.json';
import phylogeneticTrees from '../shared/vocabularies/phylogeneticTrees.json';
import diversityIndices from '../shared/vocabularies/diversityIndices.json';
import TaxonAutoComplete from '../Components/TaxonAutocomplete';
import logger from '../utils/logger';
import { axiosWithAuth } from "../Auth/userApi";
import config from "../config";
import { AppContext } from '../Components/hoc/ContextProvider';
import { JWT_STORAGE_NAME } from '../Auth/userApi';
import {
  setPipelineStatus,
  setJobId,
  setError as setResultsError
} from '../store/resultsSlice';
import {
  updateSpatialResolution,
  updateSelectedCountries,
  updateSelectedPhyloTree,
  updateTaxonomicFilters,
  updateRecordFilteringMode,
  updateYearRange,
  updateDiversityIndices,
  updateRandomizations
} from '../store/settingsSlice';
import {
  setAreaSelectionMode,
  clearDrawnItems
} from '../store/mapSlice';

const drawerWidth = 340;

const getMissingRequiredParams = (selectedPhyloTree, areaSelectionMode) => {
  const missing = [];
  if (!areaSelectionMode) missing.push('area selection mode (spatial filters)');
  if (!selectedPhyloTree) missing.push('phylogenetic tree (taxonomic filters)');
  return missing;
};

const SettingsPanel = ({ isOpen, onClose, isCollapsed, activePanel, handlePanelOpen }) => {
  const dispatch = useDispatch();
  const appContext = React.useContext(AppContext);
  
  // Get initial values from Redux store
  const reduxState = useSelector(state => state.settings);
  const reduxUser = useSelector(state => state.auth?.user);
  const user = appContext.user || reduxUser;
  const drawnItems = useSelector(state => state.map.drawnItems);
  const areaSelectionMode = useSelector(state => state.map.areaSelectionMode);
  const pipelineStatus = useSelector((state) => state.results.status);
  const isAnalysisRunning = pipelineStatus === 'running';
  
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [spatialResolution, setSpatialResolution] = useState(reduxState.spatialResolution || '3');
  const [selectedCountries, setSelectedCountries] = useState(reduxState.selectedCountries || []);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedPhyloTree, setSelectedPhyloTree] = useState(reduxState.selectedPhyloTree || '');
  const [outlierSensitivity, setOutlierSensitivity] = useState('none');
  const [yearRange, setYearRange] = useState(reduxState.yearRange || [1900, 2025]);
  const [selectedDiversityIndices, setSelectedDiversityIndices] = useState(reduxState.selectedDiversityIndices || []);
  const [randomizations, setRandomizations] = useState(reduxState.randomizations || 1000);
  const [recordFilteringMode, setRecordFilteringMode] = useState(reduxState.recordFilteringMode || 'specimen');
  const [taxonomicFilters, setTaxonomicFilters] = useState({
    phylum: reduxState.taxonomicFilters?.phylum || [],
    class: reduxState.taxonomicFilters?.class || [],
    order: reduxState.taxonomicFilters?.order || [],
    family: reduxState.taxonomicFilters?.family || [],
    genus: reduxState.taxonomicFilters?.genus || []
  });
  const [isLoading, setIsLoading] = useState(false);

  // Handle scroll events
  const handleScroll = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const scrollContainer = event.currentTarget;
    const delta = event.deltaY || event.detail || event.wheelDelta;
    scrollContainer.scrollTop += delta;
  }, []);

  // Update Redux store when settings change
  const updateReduxStore = useCallback((type, payload) => {
    switch(type) {
      case 'UPDATE_SPATIAL_RESOLUTION':
        dispatch(updateSpatialResolution(payload));
        break;
      case 'UPDATE_SELECTED_COUNTRIES':
        dispatch(updateSelectedCountries(payload));
        break;
      case 'UPDATE_SELECTED_PHYLO_TREE':
        dispatch(updateSelectedPhyloTree(payload));
        break;
      case 'UPDATE_TAXONOMIC_FILTERS':
        dispatch(updateTaxonomicFilters(payload));
        break;
      case 'UPDATE_RECORD_FILTERING_MODE':
        dispatch(updateRecordFilteringMode(payload));
        break;
      case 'UPDATE_YEAR_RANGE':
        dispatch(updateYearRange(payload));
        break;
      case 'UPDATE_DIVERSITY_INDICES':
        dispatch(updateDiversityIndices(payload));
        break;
      case 'UPDATE_RANDOMIZATIONS':
        dispatch(updateRandomizations(payload));
        break;
      default:
        console.warn('Unknown action type:', type);
    }
  }, [dispatch]);

  // Handle settings changes
  const handleSpatialResolutionChange = (value) => {
    setSpatialResolution(value);
    updateReduxStore('UPDATE_SPATIAL_RESOLUTION', value);
  };

  const handleSelectedCountriesChange = (value) => {
    // Convert full country names to ISO codes before updating state
    const selectedA2Codes = value.map(countryName => {
      const country = countries.find(c => c.Country === countryName);
      return country?.A2;
    }).filter(Boolean);
    
    setSelectedCountries(selectedA2Codes);
    dispatch(updateSelectedCountries(selectedA2Codes));
  };

  const handleClearCountries = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSelectedCountriesChange([]);
  };

  const handlePhyloTreeChange = (event) => {
    const value = event.target.value;
    setSelectedPhyloTree(value);
    dispatch(updateSelectedPhyloTree(value));
  };

  const handleYearRangeChange = (value) => {
    setYearRange(value);
    updateReduxStore('UPDATE_YEAR_RANGE', value);
  };

  const handleDiversityIndicesChange = (value) => {
    setSelectedDiversityIndices(value);
    updateReduxStore('UPDATE_DIVERSITY_INDICES', value);
  };

  const handleRandomizationsChange = (value) => {
    setRandomizations(value);
    updateReduxStore('UPDATE_RANDOMIZATIONS', parseInt(value));
  };

  const handleRecordFilteringModeChange = (value) => {
    setRecordFilteringMode(value);
    updateReduxStore('UPDATE_RECORD_FILTERING_MODE', value);
  };

  const handleFileUpload = (event, type = 'polygon') => {
    const file = event.target.files[0];
    if (file) {
      if (type === 'polygon') {
        setUploadedFile(file);
        dispatch(setAreaSelectionMode('upload'));
      }
      // Handle other file types if needed
    }
  };

  const handleAreaSelectionModeChange = (mode) => {
    const newMode = mode === areaSelectionMode ? null : mode;
    dispatch(setAreaSelectionMode(newMode));
    
    if (newMode !== 'map') {
      dispatch(clearDrawnItems());
    }
    
    if (newMode !== 'upload') {
      setUploadedFile(null);
    }
  };

  const handleTaxonChange = (rank, newValues) => {
    const ranks = ['phylum', 'class', 'order', 'family', 'genus'];
    const currentRankIndex = ranks.indexOf(rank.toLowerCase());
    
    // Update the current rank
    const updatedFilters = {
      ...taxonomicFilters,
      [rank.toLowerCase()]: newValues
    };

    // Clear lower ranks if we have a current rank
    if (currentRankIndex !== -1) {
      ranks.forEach((r, index) => {
        if (index > currentRankIndex) {
          updatedFilters[r] = [];
        }
      });
    }

    // Update both local state and Redux
    setTaxonomicFilters(updatedFilters);
    updateReduxStore('UPDATE_TAXONOMIC_FILTERS', updatedFilters);
  };

  // Transform taxonomic filters to use taxa names instead of keys
  const getTaxonNames = (taxonomicFilters) => {
    const transformedFilters = {};
    
    Object.entries(taxonomicFilters).forEach(([rank, taxa]) => {
      // Convert array of taxon objects to array of names
      transformedFilters[rank] = taxa.map(taxon => taxon.name || taxon.scientificName);
    });
    
    return transformedFilters;
  };

  const getHigherTaxonKey = (currentRank) => {
    const ranks = ['phylum', 'class', 'order', 'family', 'genus'];
    const currentIndex = ranks.indexOf(currentRank.toLowerCase());
    
    if (currentIndex <= 0) return undefined; // No higher rank for phylum
    
    const higherRank = ranks[currentIndex - 1];
    const higherTaxon = taxonomicFilters[higherRank]?.[0];
    return higherTaxon?.key;
  };

  // Memoize handleStartAnalysis to prevent unnecessary re-renders
  const handleStartAnalysis = useCallback(async () => {
    if (!user) {
      throw new Error('Please log in to start analysis');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Prepare form data
      const formData = new FormData();
      
      // Find the selected tree's filename
      const selectedTree = phylogeneticTrees.groups
        .flatMap(group => group.trees)
        .find(tree => tree.id === selectedPhyloTree);

      if (!selectedTree) {
        throw new Error(`Invalid phylogenetic tree selection: ${selectedPhyloTree}`);
      }

      // Split diversity indices by module
      const mainIndices = [];
      const biodiverseCommands = new Set();
      selectedDiversityIndices.forEach(id => {
        const index = diversityIndices.groups
          .flatMap(group => group.indices)
          .find(index => index.id === id);
        if (index?.module === 'main') {
          mainIndices.push(index.commandName);
        } else if (index?.module === 'biodiverse') {
          // Handle both array and string commandNames
          if (Array.isArray(index.commandName)) {
            index.commandName.forEach(cmd => biodiverseCommands.add(cmd));
          } else {
            biodiverseCommands.add(index.commandName);
          }
        }
      });

      // Base parameters
      const params = {
        spatialResolution: parseInt(spatialResolution, 10),
        selectedPhyloTree: selectedPhyloTree,
        tree: selectedTree.fileName,  // Use the fileName from the found tree
        div: mainIndices,
        bd_indices: Array.from(biodiverseCommands),
        randomizations: parseInt(randomizations, 10),
        recordFilteringMode,
        yearRange,
        taxonomicFilters,
        areaSelectionMode,
        outlierSensitivity
      };

      // Add spatial filters
      if (areaSelectionMode === 'map' && drawnItems?.features?.length > 0) {
        console.log('Adding map polygon to params:', drawnItems);
        params.polygon = drawnItems;
      } else if (areaSelectionMode === 'country' && selectedCountries.length > 0) {
        params.selectedCountries = selectedCountries;  // Already in ISO A2 format
      }

      // Add form data
      formData.append('data', JSON.stringify(params));
      console.log('Starting analysis with params:', params);

      // Start analysis
      const response = await axiosWithAuth.post(`${config.phylonextWebservice}/api/phylonext/runs`, formData);
      
      if (response?.data?.jobid) {
        console.log('Analysis started successfully:', response.data);
        // Update Redux state first
        await Promise.all([
          dispatch(setJobId(response.data.jobid)),
          dispatch(setPipelineStatus('running'))
        ]);
        // Then switch to visualization panel
        console.log('Switching to visualization panel');
        handlePanelOpen('visualization');
      } else {
        throw new Error('No job ID returned from server');
      }
    } catch (error) {
      console.error('Analysis start failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      dispatch(setPipelineStatus('failed'));
      dispatch(setResultsError(error.message || 'Failed to start analysis'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    user,
    drawnItems,
    areaSelectionMode,
    spatialResolution,
    selectedCountries,
    selectedPhyloTree,
    taxonomicFilters,
    recordFilteringMode,
    yearRange,
    selectedDiversityIndices,
    randomizations,
    outlierSensitivity,
    dispatch,
    handlePanelOpen
  ]);

  const handleAnalysisClick = () => {
    handleStartAnalysis().catch(err => {
      logger.error('Error in handleAnalysisClick:', err);
      setError(err.message || 'Failed to start analysis');
    });
  };

  const missingParams = getMissingRequiredParams(selectedPhyloTree, areaSelectionMode);
  const isStartButtonDisabled = missingParams.length > 0 || isLoading || isAnalysisRunning;

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
          onWheel={handleScroll}
          onTouchMove={handleScroll}
        >
          {isAnalysisRunning ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 4 }}>
              <Spin size="small" />
              <Typography>Analysis in progress...</Typography>
              <Typography variant="caption" color="text.secondary">
                Please wait while the pipeline completes.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 2 }}>
              {/* Spatial Filters */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Spatial filters</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Spatial Resolution */}
                    <FormControl component="fieldset" sx={{ mb: 3 }}>
                      <FormLabel>Spatial resolution</FormLabel>
                      <RadioGroup
                        row
                        value={spatialResolution}
                        onChange={(e) => handleSpatialResolutionChange(e.target.value)}
                      >
                        {[3, 4, 5, 6].map((value) => (
                          <FormControlLabel
                            key={value}
                            value={value.toString()}
                            control={<Radio />}
                            label={value}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>

                    {/* Area Selection Mode */}
                    <FormControl component="fieldset">
                      <FormLabel>Area selection mode</FormLabel>
                      <RadioGroup
                        value={areaSelectionMode || ''}
                        onChange={(e) => handleAreaSelectionModeChange(e.target.value)}
                      >
                        {/* Map Selection */}
                        <FormControlLabel
                          value="map"
                          control={<Radio />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1">Draw area on map</Typography>
                              <Tooltip 
                                title={
                                  <Box component="div" sx={{ typography: 'body2' }}>
                                    Draw a polygon (or multiple polygons) directly on the map. To finish drawing, click the first point again. To activate freehand drawing, hold the Shift key. Polygons can be edited by clicking on them and dragging points.
                                  </Box>
                                }
                                placement="right"
                              >
                                <IconButton size="small" sx={{ ml: 1 }}>
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {areaSelectionMode === 'map' && drawnItems?.features?.length > 0 && (
                                <Tooltip title={
                                  <Typography variant="body2">Reset selection</Typography>
                                }>
                                  <IconButton 
                                    size="small" 
                                    sx={{ 
                                      ml: 1,
                                      color: 'error.main',
                                      '&:hover': {
                                        backgroundColor: 'error.light',
                                        color: 'error.dark'
                                      }
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      dispatch(clearDrawnItems());
                                    }}
                                  >
                                    <ClearIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          }
                        />

                        {/* Upload */}
                        <FormControlLabel
                          value="upload"
                          control={<Radio />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1">Upload polygon(s)</Typography>
                              <Tooltip 
                                title={
                                  <Box component="div" sx={{ typography: 'body2' }}>
                                    Import GeoPackage or GeoJSON file
                                  </Box>
                                }
                                placement="right"
                              >
                                <IconButton size="small" sx={{ ml: 1 }}>
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          }
                        />
                        {areaSelectionMode === 'upload' && (
                          <Button
                            variant="outlined"
                            component="label"
                            startIcon={<UploadFileIcon />}
                            sx={{ ml: 3, mt: 1 }}
                          >
                            {uploadedFile ? uploadedFile.name : 'Choose file'}
                            <input
                              type="file"
                              hidden
                              accept=".gpkg,.geojson"
                              onChange={(e) => handleFileUpload(e, 'polygon')}
                            />
                          </Button>
                        )}

                        {/* Country Selection */}
                        <FormControlLabel
                          value="country"
                          control={<Radio />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1">Select countries</Typography>
                              <Tooltip 
                                title={
                                  <Box component="div" sx={{ typography: 'body2' }}>
                                    Select one or more countries from the list
                                  </Box>
                                }
                                placement="right"
                              >
                                <IconButton size="small" sx={{ ml: 1 }}>
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          }
                        />
                      </RadioGroup>
                    </FormControl>

                    {/* Country Selection Dropdown */}
                    {areaSelectionMode === 'country' && (
                      <FormControl fullWidth>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <FormLabel>Countries</FormLabel>
                          <Tooltip 
                            title={
                              <Box component="div" sx={{ typography: 'body2' }}>
                                Select one or more countries
                              </Box>
                            } 
                            placement="right"
                          >
                            <IconButton size="small" sx={{ ml: 1 }}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {selectedCountries.length > 0 && (
                            <Tooltip title={
                              <Typography variant="body2">Reset selection</Typography>
                            }>
                              <IconButton 
                                size="small" 
                                sx={{ 
                                  ml: 1,
                                  color: 'error.main',
                                  '&:hover': {
                                    backgroundColor: 'error.light',
                                    color: 'error.dark'
                                  }
                                }}
                                onClick={handleClearCountries}
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                        <Select
                          multiple
                          value={selectedCountries.map(a2code => {
                            const country = countries.find(c => c.A2 === a2code);
                            return country?.Country || a2code;
                          })}
                          onChange={(e) => handleSelectedCountriesChange(e.target.value)}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((countryName) => (
                                <Chip 
                                  key={countryName} 
                                  label={countryName}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onDelete={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const newSelected = selected.filter(name => name !== countryName);
                                    handleSelectedCountriesChange(newSelected);
                                  }}
                                />
                              ))}
                            </Box>
                          )}
                        >
                          {countries.map((country) => (
                            <MenuItem key={country.A2} value={country.Country}>
                              {country.Country}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Taxonomic Filters */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Taxonomic filters</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FormLabel>Phylogenetic tree</FormLabel>
                        <Tooltip 
                          title={
                            <Box component="div" sx={{ typography: 'body2' }}>
                              Select a pre-configured phylogenetic tree to use in the analysis
                            </Box>
                          } 
                          placement="right"
                        >
                          <IconButton size="small" sx={{ ml: 1 }}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Select
                        value={selectedPhyloTree}
                        onChange={handlePhyloTreeChange}
                        displayEmpty
                      >
                        <MenuItem value="" disabled>
                          <em>Select a phylogenetic tree</em>
                        </MenuItem>
                        {phylogeneticTrees.groups.map((group) => [
                          <ListSubheader key={group.id}>
                            <Box sx={{ pt: 1 }}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 700,
                                  fontSize: '1.1rem',   // Slightly larger than tree names
                                  color: 'text.primary' // Ensure full opacity
                                }}
                              >
                                {group.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {group.description}
                              </Typography>
                            </Box>
                          </ListSubheader>,
                          ...group.trees.map((tree) => (
                            <MenuItem key={tree.id} value={tree.id} sx={{ pl: 4 }}>
                              <Box>
                                <Typography variant="body1">{tree.displayName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {tree.description}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))
                        ])}
                      </Select>
                    </FormControl>

                    {[
                      { rank: 'PHYLUM', label: 'Phylum' },
                      { rank: 'CLASS', label: 'Class' },
                      { rank: 'ORDER', label: 'Order' },
                      { rank: 'FAMILY', label: 'Family' },
                      { rank: 'GENUS', label: 'Genus' }
                    ].map(({ rank, label }) => (
                      <Box key={rank} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: -0.3 }}>
                          <FormLabel>{label}</FormLabel>
                          <Tooltip 
                            title={
                              <Box component="div" sx={{ typography: 'body2' }}>
                                Select one or more taxa. Suggestions are filtered by higher rank selections and exclude extinct taxa.
                              </Box>
                            } 
                            placement="right"
                          >
                            <IconButton size="small" sx={{ ml: 1 }}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <TaxonAutoComplete
                          value={taxonomicFilters[label.toLowerCase()] || []}
                          onChange={(newValues) => handleTaxonChange(label, newValues || [])}
                          rank={rank}
                          higherTaxonKey={getHigherTaxonKey(label)}
                        />
                      </Box>
                    ))}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Optional: Upload species keys</Typography>
                        <Tooltip 
                          title={
                            <Box component="div" sx={{ typography: 'body2' }}>
                              <p style={{ margin: '0 0 8px 0' }}>
                                Upload a text file with species keys, one per row. Can be used in addition to or separately from the taxonomic rank selection above.
                              </p>
                              <p style={{ margin: '0' }}>
                                Species keys can be retrieved using the{' '}
                                <a 
                                  href="https://www.gbif.org/tools/species-lookup" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ color: '#90caf9' }}
                                >
                                  GBIF species lookup tool
                                </a>
                              </p>
                            </Box>
                          } 
                          placement="right"
                        >
                          <IconButton size="small" sx={{ ml: 1 }}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Button
                        variant="outlined"
                        component="label"
                        fullWidth
                        sx={{ mb: 2 }}
                      >
                        Upload species keys
                        <input
                          type="file"
                          hidden
                          accept=".txt"
                          onChange={(e) => handleFileUpload(e, 'species')}
                        />
                      </Button>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Data Selection Criteria */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Data selection criteria</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl component="fieldset">
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FormLabel>Record filtering mode</FormLabel>
                        <Tooltip 
                          title={
                            <Box component="div" sx={{ typography: 'body2' }}>
                              <p style={{ margin: '0 0 8px 0' }}>
                                Select the filtering approach based on the Basis of Record types:
                              </p>
                              <p style={{ margin: '0 0 4px 0' }}>
                                • Specimen-focused: Includes preserved specimens, material citations, and machine observations for higher reliability
                              </p>
                              <p style={{ margin: '0' }}>
                                • Observation-enhanced: Adds human observations to provide broader coverage but potentially lower reliability
                              </p>
                            </Box>
                          } 
                          placement="right"
                        >
                          <IconButton size="small" sx={{ ml: 1 }}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <RadioGroup
                        row
                        value={recordFilteringMode}
                        onChange={(e) => handleRecordFilteringModeChange(e.target.value)}
                      >
                        <FormControlLabel
                          value="specimen"
                          control={<Radio />}
                          label="Specimen-focused"
                        />
                        <FormControlLabel
                          value="observation"
                          control={<Radio />}
                          label="Observation-enhanced"
                        />
                      </RadioGroup>
                    </FormControl>

                    <FormControl component="fieldset">
                      <FormLabel>Outlier removal sensitivity</FormLabel>
                      <RadioGroup
                        row
                        value={outlierSensitivity}
                        onChange={(e) => setOutlierSensitivity(e.target.value)}
                      >
                        {['none', 'low', 'high'].map((value) => (
                          <FormControlLabel
                            key={value}
                            value={value}
                            control={<Radio />}
                            label={value}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>

                    <Box>
                      <FormLabel>Collection year</FormLabel>
                      <Slider
                        value={yearRange}
                        onChange={(e, newValue) => handleYearRangeChange(newValue)}
                        valueLabelDisplay="auto"
                        min={1900}
                        max={2025}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">{yearRange[0]}</Typography>
                        <Typography variant="caption">{yearRange[1]}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Diversity Estimation */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Diversity estimation</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FormLabel>Diversity indices</FormLabel>
                        <Tooltip 
                          title={
                            <Box component="div" sx={{ typography: 'body2' }}>
                              Select one or more diversity indices to calculate
                            </Box>
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
                        value={selectedDiversityIndices}
                        onChange={(e) => handleDiversityIndicesChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((indexId) => {
                              const index = diversityIndices.groups
                                .flatMap(group => group.indices)
                                .find(index => index.id === indexId);
                              return (
                                <Chip 
                                  key={indexId} 
                                  label={index?.displayName}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onDelete={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const newSelected = selectedDiversityIndices.filter(id => id !== indexId);
                                    handleDiversityIndicesChange(newSelected);
                                  }}
                                />
                              );
                            })}
                          </Box>
                        )}
                        sx={{ minWidth: 200 }}
                      >
                        {diversityIndices.groups.map((group) => [
                          <ListSubheader key={group.id}>
                            <Box sx={{ pt: 1 }}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 700,
                                  fontSize: '1.1rem',  // Slightly larger than tree names
                                  color: 'text.primary' // Ensure full opacity
                                }}
                              >
                                {group.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {group.description}
                              </Typography>
                            </Box>
                          </ListSubheader>,
                          ...group.indices.map((index) => (
                            <MenuItem 
                              key={index.id} 
                              value={index.id}
                              sx={{ pl: 4 }}
                            >
                              <Box>
                                <Typography variant="body2">{index.displayName}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {index.description}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))
                        ])}
                      </Select>
                    </FormControl>

                    {/* Show randomizations field only when Biodiverse indices are selected */}
                    {selectedDiversityIndices.some(indexId => {
                      const biodiverseGroup = diversityIndices.groups.find(group => group.id === 'biodiverse');
                      return biodiverseGroup?.indices.some(index => index.id === indexId);
                    }) && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <FormLabel>Number of randomizations</FormLabel>
                          <Tooltip 
                            title={
                              <Box component="div" sx={{ typography: 'body2' }}>
                                Number of randomizations for estimating standardized effect sizes (SES) for Biodiverse-based metrics
                              </Box>
                            } 
                            placement="right"
                          >
                            <IconButton size="small" sx={{ ml: 1 }}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <TextField
                          type="number"
                          value={randomizations}
                          onChange={(e) => handleRandomizationsChange(e.target.value)}
                          fullWidth
                          inputProps={{ min: 1 }}
                        />
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </Box>

        {/* Start Analysis Button - Fixed at bottom */}
        {!isAnalysisRunning && (
          <Box sx={{ 
            p: 2,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1,
          }}>
            {error && (
              <Typography color="error" sx={{ mb: 1 }}>
                {error}
              </Typography>
            )}
            <Tooltip 
              title={
                isStartButtonDisabled ? 
                `Please specify: ${missingParams.join(' and ')}` : 
                ''
              }
              placement="top"
            >
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  onClick={handleAnalysisClick}
                  disabled={isStartButtonDisabled}
                >
                  Start Analysis
                </Button>
              </span>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default SettingsPanel; 