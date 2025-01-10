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
import phylogeneticTrees from '../Vocabularies/phylogeneticTrees.json';
import diversityIndices from '../Vocabularies/diversityIndices.json';
import TaxonAutoComplete from '../Components/TaxonAutocomplete';
import logger from '../utils/logger';
import { axiosWithAuth } from "../Auth/userApi";
import config from "../config";
import { AppContext } from '../Components/hoc/ContextProvider';
import { JWT_STORAGE_NAME } from '../Auth/userApi';

const drawerWidth = 340;

const SettingsPanel = ({ isOpen, onClose, activePanel, setStep, navigate }) => {
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
  const [areaSelectionMode, setAreaSelectionMode] = useState(null);
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
  
  // Get all relevant data from Redux store
  const drawnItems = useSelector(state => state.map.drawnItems);

  // Update Redux store when settings change
  const updateReduxStore = useCallback((type, payload) => {
    dispatch({ type, payload });
  }, [dispatch]);

  // Handle settings changes
  const handleSpatialResolutionChange = (value) => {
    setSpatialResolution(value);
    updateReduxStore('UPDATE_SPATIAL_RESOLUTION', value);
  };

  const handleSelectedCountriesChange = (value) => {
    setSelectedCountries(value);
    updateReduxStore('UPDATE_SELECTED_COUNTRIES', value);
  };

  const handlePhyloTreeChange = (event) => {
    const value = event.target.value;
    setSelectedPhyloTree(value);
    dispatch({ type: 'UPDATE_SELECTED_PHYLO_TREE', payload: value });
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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      handleAreaSelectionModeChange('upload');
    }
  };

  const handleAreaSelectionModeChange = (mode) => {
    const newMode = mode === areaSelectionMode ? null : mode;
    setAreaSelectionMode(newMode);
    dispatch({ type: 'SET_AREA_SELECTION_MODE', payload: newMode });
    
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

  // Memoize handleStartAnalysis to prevent unnecessary re-renders
  const handleStartAnalysis = useCallback(async () => {
    console.log('handleStartAnalysis called', { user });
    if (!user) {
      logger.warn('No user found. Please log in.');
      throw new Error('Please log in to start analysis');
    }

    try {
      setInternalLoading(true);
      
      // Validate required parameters
      if (!selectedPhyloTree) {
        throw new Error('Please select a phylogenetic tree');
      }
      
      if (!areaSelectionMode) {
        throw new Error('Please select an area selection mode');
      }
      
      // Additional validation based on area selection mode
      if (areaSelectionMode === 'country' && (!selectedCountries || selectedCountries.length === 0)) {
        throw new Error('Please select at least one country');
      }
      
      // Create form data
      const formData = new FormData();
      
      // Prepare the main data object with all required parameters
      const data = {
        spatialResolution,
        selectedCountries,
        selectedPhyloTree,
        taxonomicFilters,
        recordFilteringMode,
        yearRange,
        selectedDiversityIndices,
        randomizations,
        areaSelectionMode
      };

      // If using map selection, add polygon data
      if (areaSelectionMode === 'map' && drawnItems?.features?.length > 0) {
        const geoJSONBlob = new Blob(
          [JSON.stringify(drawnItems, null, 2)],
          { type: 'application/geo+json' }
        );
        formData.append('polygon', geoJSONBlob, 'drawn_polygons.geojson');
      }

      // Add the main data as JSON
      formData.append('data', JSON.stringify(data));

      // Send request to server
      const apiUrl = `${config.phylonextWebservice}/api/phylonext/runs`;
      console.log('Sending request to:', apiUrl);
      console.log('Request data:', data);
      
      // Log the request details
      console.log('Starting analysis with config:', {
        url: apiUrl,
        formData: Object.fromEntries(formData.entries()),
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const res = await axiosWithAuth.post(apiUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Log successful response
      console.log('Analysis started successfully:', res.data);

      const jobid = res?.data?.jobid;
      if (!jobid) {
        throw new Error('No job ID received from server');
      }

      setStep(1);
      navigate(`/run/${jobid}`);
    } catch (error) {
      // Enhanced error logging
      console.error('Analysis start failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      throw error;
    } finally {
      setInternalLoading(false);
    }
  }, [user, drawnItems, areaSelectionMode, spatialResolution, selectedCountries, 
      selectedPhyloTree, taxonomicFilters, recordFilteringMode, yearRange, 
      selectedDiversityIndices, randomizations, navigate, setStep]);

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
                          onChange={handleFileUpload}
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
                  <FormControl sx={{ ml: 3 }}>
                    <Select
                      multiple
                      value={selectedCountries}
                      onChange={(e) => handleSelectedCountriesChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip 
                              key={value} 
                              label={value} 
                              onMouseDown={(e) => e.stopPropagation()}
                              onDelete={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const newSelected = selectedCountries.filter(country => country !== value);
                                handleSelectedCountriesChange(newSelected);
                              }} 
                            />
                          ))}
                        </Box>
                      )}
                      sx={{ minWidth: 200 }}
                    >
                      {countries.map((country) => (
                        <MenuItem key={country.id} value={country.name}>
                          {country.name}
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
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              onClick={handleAnalysisClick}
              disabled={!selectedPhyloTree || isLoading}
            >
              {isLoading ? 'Starting Analysis...' : 'Start Analysis'}
            </Button>
          </Box>
        </Box>
      )}
    </Drawer>
  );
};

export default SettingsPanel; 