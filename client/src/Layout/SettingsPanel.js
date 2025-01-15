import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
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
  Checkbox,
  Tooltip,
  ListSubheader
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InfoIcon from '@mui/icons-material/Info';
import countries from '../Vocabularies/country.json';
import phylogeneticTrees from '../shared/vocabularies/phylogeneticTrees.json';
import diversityIndices from '../shared/vocabularies/diversityIndices.json';
import TaxonAutoComplete from '../Components/TaxonAutocomplete';
import logger from '../utils/logger';
import { axiosWithAuth } from "../Auth/userApi";
import config from "../config";
import { AppContext } from '../Components/hoc/ContextProvider';
import { JWT_STORAGE_NAME } from '../Auth/userApi';
import { styled } from '@mui/material/styles';
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
import { Spin } from 'antd';

const drawerWidth = 340;

const getMissingRequiredParams = (selectedPhyloTree, areaSelectionMode) => {
  const missing = [];
  if (!areaSelectionMode) missing.push('area selection mode (spatial filters)');
  if (!selectedPhyloTree) missing.push('phylogenetic tree (taxonomic filters)');
  return missing;
};

const SettingsPanel = ({ 
  isOpen, 
  onClose, 
  activePanel, 
  handlePanelOpen,
  setStep, 
  navigate 
}) => {
  const dispatch = useDispatch();
  const appContext = React.useContext(AppContext);
  
  // Debug mounting and prop updates
  useEffect(() => {
    console.log('SettingsPanel mounted');
  }, []);

  // Get initial values from Redux store
  const reduxState = useSelector(state => state.settings);
  const reduxUser = useSelector(state => state.auth?.user);
  const user = appContext.user || reduxUser;
  const drawnItems = useSelector(state => state.map.drawnItems);
  const areaSelectionMode = useSelector(state => state.map.areaSelectionMode);  // Get from Redux instead of local state
  
  // Debug auth state
  useEffect(() => {
    console.log('Auth state:', {
      user,
      hasToken: !!localStorage.getItem(JWT_STORAGE_NAME),
      reduxAuthState: store.getState().auth,
      contextUser: appContext.user
    });
  }, [user, appContext.user]);

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
    updateReduxStore('UPDATE_SELECTED_COUNTRIES', selectedA2Codes);
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

  // Memoize handleStartAnalysis to prevent unnecessary re-renders
  const handleStartAnalysis = useCallback(async () => {
    if (!user) {
      throw new Error('Please log in to start analysis');
    }

    setInternalLoading(true);
    setError(null);

    try {
      // Prepare form data
      const formData = new FormData();
      
      // Find the selected tree's filename
      const selectedTreeData = phylogeneticTrees.find(t => t.id === selectedPhyloTree);
      
      // Split diversity indices by module
      const mainIndices = [];
      const biodiverseIndices = [];
      selectedDiversityIndices.forEach(id => {
        const index = diversityIndices.groups
          .flatMap(group => group.indices)
          .find(index => index.id === id);
        if (index?.module === 'main') {
          mainIndices.push(index.commandName);
        } else if (index?.module === 'biodiverse') {
          biodiverseIndices.push(index.commandName);
        }
      });

      // Base parameters
      const params = {
        spatialResolution: parseInt(spatialResolution, 10),
        selectedPhyloTree: selectedPhyloTree,
        selectedDiversityIndices: selectedDiversityIndices,
        randomizations: parseInt(randomizations, 10),
        recordFilteringMode,
        yearRange,
        taxonomicFilters,
        areaSelectionMode
      };

      // Add spatial filters
      if (areaSelectionMode === 'map' && drawnItems?.features?.length > 0) {
        console.log('Adding map polygon to params:', drawnItems);
        // Convert coordinates to [longitude, latitude] format if needed
        const geoJSON = {
          ...drawnItems,
          features: drawnItems.features.map(feature => ({
            ...feature,
            geometry: {
              ...feature.geometry,
              coordinates: feature.geometry.coordinates.map(ring => 
                ring.map(coord => [coord[0], coord[1]])
              )
            }
          }))
        };
        params.polygon = geoJSON;
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
        dispatch(setJobId(response.data.jobid));
        dispatch(setPipelineStatus('running'));
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
      setInternalLoading(false);
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
    dispatch,
    handlePanelOpen,
    phylogeneticTrees,
    diversityIndices
  ]);

  const handleAnalysisClick = () => {
    handleStartAnalysis().catch(err => {
      logger.error('Error in handleAnalysisClick:', err);
      setError(err.message || 'Failed to start analysis');
    });
  };

  // Use either external or internal loading state
  const isLoading = internalLoading;

  const getHigherTaxonKey = (currentRank) => {
    const ranks = ['phylum', 'class', 'order', 'family', 'genus'];
    const currentIndex = ranks.indexOf(currentRank.toLowerCase());
    
    if (currentIndex <= 0) return undefined; // No higher rank for phylum
    
    const higherRank = ranks[currentIndex - 1];
    const higherTaxon = taxonomicFilters[higherRank]?.[0];
    return higherTaxon?.key;
  };

  const missingParams = getMissingRequiredParams(selectedPhyloTree, areaSelectionMode);
  const isStartButtonDisabled = missingParams.length > 0 || isLoading;

  // Get pipeline status from Redux
  const pipelineStatus = useSelector((state) => state.results.status);
  const isAnalysisRunning = pipelineStatus === 'running';

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
          {activePanel === 'settings' ? 'Settings' : 'Hypothesis Test'}
        </Typography>
        <IconButton onClick={onClose}>
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      {activePanel === 'settings' && (
        <Box sx={{ p: 2, overflow: 'auto' }}>
          {/* Spatial Filters */}
          <Accordion>
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
                          <Typography variant="body1">Select on map</Typography>
                          <Tooltip 
                            title="Draw a polygon (or multiple polygons) directly on the map. To finish drawing, click the first point again. To activate freehand drawing, hold the Shift key. Polygons can be edited by clicking on them and dragging points."
                            placement="right"
                          >
                            <IconButton size="small" sx={{ ml: 1 }}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    />

                    {/* Custom Polygon Upload */}
                    <FormControlLabel
                      value="upload"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body1">Upload polygon(s)</Typography>
                          <Tooltip 
                            title="Import GeoPackage or GeoJSON file"
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
                            title="Choose one or more countries from the list"
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
                      <Tooltip title="Select one or more countries" placement="right">
                        <IconButton size="small" sx={{ ml: 1 }}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
              <FormControl fullWidth sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <FormLabel>Phylogenetic tree</FormLabel>
                  <Tooltip title="Select a pre-configured phylogenetic tree to use in the analysis" placement="right">
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
                  {phylogeneticTrees.map((tree) => (
                    <MenuItem key={tree.id} value={tree.id}>
                      <Box>
                        <Typography variant="body1">{tree.displayName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tree.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
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
                      title="Select one or more taxa. Suggestions are filtered by higher rank selections and exclude extinct taxa." 
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
            </AccordionDetails>
          </Accordion>

          {/* Data Selection Criteria */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Data selection criteria</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Record Filtering Mode */}
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

                {/* Outlier Removal */}
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

                {/* Collection Year Range */}
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
                {/* Diversity Indices */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FormLabel>Diversity indices</FormLabel>
                    <Tooltip title="Select one or more diversity indices to calculate" placement="right">
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
                          <Typography variant="subtitle2">{group.name}</Typography>
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

                <TextField
                  label="Number of randomizations"
                  type="number"
                  value={randomizations}
                  onChange={(e) => handleRandomizationsChange(e.target.value)}
                  fullWidth
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Start Analysis Button */}
          <Box sx={{ 
            position: 'sticky', 
            bottom: 0, 
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            p: 2,
            mt: 2,
            mx: -2
          }}>
            {error && (
              <Typography color="error" sx={{ mb: 1 }}>
                {error}
              </Typography>
            )}
            <Tooltip 
              title={
                isStartButtonDisabled && !isAnalysisRunning ? 
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
                  disabled={isStartButtonDisabled || isAnalysisRunning}
                  startIcon={isAnalysisRunning && <Spin size="small" />}
                >
                  {isAnalysisRunning ? 'Analysis Running...' : 'Start Analysis'}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Drawer>
  );
};

export default SettingsPanel; 