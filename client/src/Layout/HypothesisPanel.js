import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Drawer,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Tooltip,
  IconButton,
  Divider,
  Alert,
  Slider,
} from '@mui/material';
import {
  InfoOutlined as InfoIcon,
  UploadFile as UploadFileIcon,
  Clear as ClearIcon,
  CompareArrows as CompareArrowsIcon,
  Opacity as OpacityIcon,
} from '@mui/icons-material';
import { axiosWithAuth } from '../Auth/userApi';
import config from '../config';
import { 
  setDrawingMode, 
  clearReferenceArea, 
  clearTestArea,
  setTestStatus,
  setResultsOpacity,
  setError as setHypothesisError,
  setHypothesisTestResults
} from '../store/hypothesisSlice';

// Add imports for the results dialog
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CloseIcon from '@mui/icons-material/Close';

const drawerWidth = 340;

// Results dialog component
const HypothesisResultsDialog = ({ open, onClose, results }) => {
  if (!results) return null;
  
  // Parse the results
  let parsedData = [];
  let metadata = {};
  
  try {
    if (typeof results === 'object') {
      if (results.data && results.metadata) {
        // New format with data and metadata
        parsedData = results.data;
        metadata = results.metadata;
      }
    } else if (typeof results === 'string') {
      try {
        const jsonResults = JSON.parse(results);
        if (jsonResults.data && jsonResults.metadata) {
          parsedData = jsonResults.data;
          metadata = jsonResults.metadata;
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
      }
    }
  } catch (error) {
    console.error('Error processing results:', error);
    return null;
  }

  // Validate data structure
  if (!Array.isArray(parsedData) || parsedData.length === 0) {
    console.error('Invalid data structure:', parsedData);
    return null;
  }

  console.log('Parsed data:', parsedData); // Debug log
  
  // Format numeric values
  const formatValue = (value) => {
    if (value === undefined || value === null) return null;
    
    // If it's already a string and not a numeric string, return as is
    if (typeof value === 'string' && isNaN(parseFloat(value))) return value;
    
    // Try to parse as number
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    
    // Format based on magnitude
    if (Math.abs(num) < 0.01 && num !== 0) {
      return num.toExponential(2);
    } else if (Number.isInteger(num)) {
      return num.toString();
    } else {
      return num.toFixed(2);
    }
  };
  
  // Extract metrics (excluding Area) and areas
  const metrics = Object.keys(parsedData[0] || {}).filter(key => key !== 'Area');
  
  // Explicitly define the order of areas we want to display
  const areaOrder = ['Entire area', 'Reference', 'Test'];
  const areas = areaOrder.filter(area => 
    parsedData.some(item => item.Area === area)
  );

  console.log('Areas:', areas); // Debug log
  
  // Create table data structure with rows for each metric and columns for areas
  const tableRows = metrics.map(metric => {
    const row = {
      metric,
      description: metadata[metric]?.description || '',
    };
    
    // Add values for each area
    areas.forEach(area => {
      const areaData = parsedData.find(item => item.Area === area);
      const value = formatValue(areaData?.[metric]);
      row[area] = value;
    });
    
    return row;
  });

  console.log('Table rows:', tableRows); // Debug log
  
  // Function to determine if a value should be highlighted
  const shouldHighlight = (metric, value, area) => {
    if (area === 'Entire area' || !value || value === null) return false;
    
    const referenceValue = parseFloat(tableRows.find(row => row.metric === metric)?.['Reference']);
    const testValue = parseFloat(tableRows.find(row => row.metric === metric)?.['Test']);
    
    if (isNaN(referenceValue) || isNaN(testValue)) return false;
    
    const currentValue = parseFloat(value);
    if (isNaN(currentValue)) return false;
    
    return Math.abs(currentValue) === Math.max(Math.abs(referenceValue), Math.abs(testValue));
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        pb: 1
      }}>
        Hypothesis Test Results
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          Comparison of biodiversity metrics between reference and test areas.
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, overflow: 'auto' }}>
          <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Metric</TableCell>
                {areas.map((area, index) => (
                  <TableCell 
                    key={`header-${area}`}
                    sx={{ 
                      fontWeight: 'bold',
                      backgroundColor: index === 0 ? 'rgba(0, 0, 0, 0.03)' : 
                                     index === 1 ? 'rgba(66, 133, 244, 0.05)' : 
                                     'rgba(52, 168, 83, 0.05)'
                    }}
                  >
                    {area}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row, rowIndex) => (
                <TableRow key={`row-${rowIndex}-${row.metric}`} hover>
                  <TableCell 
                    component="th" 
                    scope="row"
                    sx={{ 
                      paddingLeft: 2,
                      borderLeft: '4px solid transparent'
                    }}
                  >
                    <Tooltip 
                      title={
                        <Box sx={{ p: 1 }}>
                          <Typography variant="body2">
                            {row.description || 'No description available'}
                          </Typography>
                        </Box>
                      }
                      placement="right"
                      arrow
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {row.metric}
                        <InfoIcon 
                          fontSize="small" 
                          sx={{ ml: 1, opacity: 0.6, width: 16, height: 16 }} 
                        />
                      </Box>
                    </Tooltip>
                  </TableCell>
                  {areas.map((area, columnIndex) => (
                    <TableCell 
                      key={`cell-${rowIndex}-${area}`}
                      sx={{
                        backgroundColor: columnIndex === 0 ? 'rgba(0, 0, 0, 0.01)' : 
                                       columnIndex === 1 ? 'rgba(66, 133, 244, 0.03)' : 
                                       'rgba(52, 168, 83, 0.03)',
                        fontFamily: 'monospace',
                        fontWeight: shouldHighlight(row.metric, row[area], area) ? 'bold' : 'normal',
                        color: shouldHighlight(row.metric, row[area], area) ? 'primary.main' : 'inherit'
                      }}
                      align="right"
                    >
                      {row[area] === null ? '—' : row[area]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Create a new slice of state for hypothesis testing
const HypothesisPanel = ({ isOpen, onClose, isCollapsed }) => {
  const dispatch = useDispatch();
  const { jobId, status } = useSelector((state) => state.results);
  
  // Local state for area selection
  const [referenceAreaMode, setReferenceAreaMode] = useState(null);
  const [testAreaMode, setTestAreaMode] = useState(null);
  const [referenceFile, setReferenceFile] = useState(null);
  const [testFile, setTestFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Get state from Redux
  const drawnItems = useSelector(state => state.map.drawnItems);
  const referenceArea = useSelector(state => state.hypothesis.referenceArea);
  const testArea = useSelector(state => state.hypothesis.testArea);
  const drawingMode = useSelector(state => state.hypothesis.drawingMode);
  const visualizationGeoJSON = useSelector(state => state.visualization.geoJSON);
  const resultsGeoJSON = useSelector(state => state.results.geoJSON);
  const indices = useSelector(state => state.results.indices);
  const resultsOpacity = useSelector(state => state.hypothesis.resultsOpacity);
  
  // Check if required files exist
  const [filesExist, setFilesExist] = useState(false);
  
  // Check if required files exist when the panel is opened
  useEffect(() => {
    if (isOpen && jobId) {
      console.log('Checking required files for hypothesis testing, jobId:', jobId, 'status:', status);
      console.log('GeoJSON data:', { 
        visualization: visualizationGeoJSON ? `${visualizationGeoJSON.features?.length} features` : 'none',
        results: resultsGeoJSON ? `${resultsGeoJSON.features?.length} features` : 'none',
        indices: indices?.length > 0 ? indices : 'none'
      });
      
      // If the status is 'completed', we can enable hypothesis testing
      if (status === 'completed') {
        console.log('Analysis is completed, enabling hypothesis testing');
        setFilesExist(true);
        return;
      }
      
      // If indices are loaded, we can enable hypothesis testing
      if (indices && indices.length > 0) {
        console.log('Indices are loaded, enabling hypothesis testing');
        setFilesExist(true);
        return;
      }
      
      // If GeoJSON data is loaded in either store, we can enable hypothesis testing
      const geoJSON = visualizationGeoJSON || resultsGeoJSON;
      if (geoJSON && geoJSON.features && geoJSON.features.length > 0) {
        console.log('GeoJSON data is loaded, enabling hypothesis testing');
        setFilesExist(true);
        return;
      }
      
      const checkFiles = async () => {
        try {
          // Check multiple possible file locations
          const filesToCheck = [
            // Original paths
            `${config.phylonextWebservice}/api/phylonext/jobs/${jobId}/output/01.Occurrence_subset/phylogenetic_tree.nex`,
            `${config.phylonextWebservice}/api/phylonext/jobs/${jobId}/output/01.Occurrence_subset/aggregated_counts.parquet`,
            // Known results file that should exist
            `${config.phylonextWebservice}/api/phylonext/jobs/${jobId}/output/02.Diversity_estimates/diversity_estimates.geojson`
          ];
          
          console.log('Checking files at:', filesToCheck);
          
          const responses = await Promise.all(
            filesToCheck.map(url => 
              axiosWithAuth.head(url)
                .then(response => ({ url, status: response.status, success: true }))
                .catch(error => ({ url, status: error.response?.status, success: false, error: error.message }))
            )
          );
          
          console.log('File check responses:', responses);
          
          // If the diversity_estimates.geojson file exists, we can enable hypothesis testing
          // This is the file we know exists since results are showing on the map
          const resultsFileExists = responses.some(
            response => response.url.includes('diversity_estimates.geojson') && response.success
          );
          
          if (resultsFileExists) {
            console.log('Results file exists, enabling hypothesis testing');
            setFilesExist(true);
          } else {
            // Check if the original required files exist
            const requiredFilesExist = responses.filter(
              response => !response.url.includes('diversity_estimates.geojson')
            ).every(response => response.success);
            
            if (requiredFilesExist) {
              console.log('Required files exist, enabling hypothesis testing');
              setFilesExist(true);
            } else {
              console.log('Required files do not exist, disabling hypothesis testing');
              setFilesExist(false);
            }
          }
        } catch (error) {
          console.error('Error checking required files:', error);
          console.log('Error details:', {
            message: error.message,
            response: error.response?.status,
            config: error.config?.url
          });
          setFilesExist(false);
        }
      };
      
      checkFiles();
    }
  }, [isOpen, jobId, status, visualizationGeoJSON, resultsGeoJSON, indices]);
  
  // Handle reference area mode change
  const handleReferenceAreaModeChange = (mode) => {
    // If selecting the same mode, toggle it off
    const newMode = mode === referenceAreaMode ? null : mode;
    setReferenceAreaMode(newMode);
    
    // Clear file if not in upload mode
    if (newMode !== 'upload') {
      setReferenceFile(null);
    }
    
    // Update map drawing mode for reference area
    if (newMode === 'map') {
      // Set map to draw mode for reference area
      dispatch(setDrawingMode('reference'));
    } else if (newMode === null) {
      // Clear drawing mode
      dispatch(setDrawingMode(null));
    }
  };
  
  // Handle test area mode change
  const handleTestAreaModeChange = (mode) => {
    // If selecting the same mode, toggle it off
    const newMode = mode === testAreaMode ? null : mode;
    setTestAreaMode(newMode);
    
    // Clear file if not in upload mode
    if (newMode !== 'upload') {
      setTestFile(null);
    }
    
    // Update map drawing mode for test area
    if (newMode === 'map') {
      // Set map to draw mode for test area
      dispatch(setDrawingMode('test'));
    } else if (newMode === null) {
      // Clear drawing mode
      dispatch(setDrawingMode(null));
    }
  };
  
  // Handle file upload for reference area
  const handleReferenceFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setReferenceFile(file);
    }
  };
  
  // Handle file upload for test area
  const handleTestFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setTestFile(file);
    }
  };
  
  // Clear reference area
  const handleClearReferenceArea = () => {
    // Clear reference area drawn items
    dispatch(clearReferenceArea());
  };
  
  // Clear test area
  const handleClearTestArea = () => {
    // Clear test area drawn items
    dispatch(clearTestArea());
  };
  
  // Add state for results dialog
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  
  // Poll for test results
  useEffect(() => {
    let pollTimer;
    
    const pollTestStatus = async () => {
      if (!jobId || !isPolling) return;
      
      try {
        const response = await axiosWithAuth.get(
          `${config.phylonextWebservice}/api/phylonext/jobs/${jobId}/hypothesis-test/status`
        );
        
        console.log('Hypothesis test status:', response.data);
        
        if (response.data.status === 'completed') {
          // Test completed, fetch results
          const resultsResponse = await axiosWithAuth.get(
            `${config.phylonextWebservice}/api/phylonext/jobs/${jobId}/hypothesis-test/results`
          );
          
          console.log('Hypothesis test results:', resultsResponse.data);
          
          // Update state
          setTestResults(resultsResponse.data.results);
          setIsPolling(false);
          setSuccess('Hypothesis test completed successfully.');
          dispatch(setTestStatus('success'));
          
          // Store results in Redux
          dispatch(setHypothesisTestResults(resultsResponse.data.results));
          
          // Open results dialog
          setResultsDialogOpen(true);
        } else if (response.data.status === 'error') {
          // Test failed
          setError(response.data.error || 'Hypothesis test failed');
          setIsPolling(false);
          dispatch(setTestStatus('error'));
        } else if (response.data.status === 'running') {
          // Test still running, continue polling
          console.log('Hypothesis test still running, continuing to poll...');
        } else {
          // Unknown status
          console.log('Unknown hypothesis test status:', response.data.status);
        }
      } catch (error) {
        console.error('Error polling hypothesis test status:', error);
        
        // Don't stop polling on network errors
        if (error.code === 'ERR_NETWORK') {
          console.log('Network error, continuing to poll...');
          return;
        }
        
        setError(error.message || 'Failed to check hypothesis test status');
        setIsPolling(false);
      }
    };
    
    if (isPolling) {
      // Initial poll
      pollTestStatus();
      
      // Set up polling interval
      pollTimer = setInterval(pollTestStatus, 3000);
    }
    
    return () => {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [jobId, isPolling, dispatch]);
  
  // Handle hypothesis test submission
  const handleTestHypothesis = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    dispatch(setTestStatus('loading'));
    
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add reference area data
      if (referenceAreaMode === 'upload' && referenceFile) {
        formData.append('referenceFile', referenceFile);
      } else if (referenceAreaMode === 'map') {
        // Get reference area GeoJSON from drawn items
        const referenceGeoJSON = JSON.stringify({
          type: 'FeatureCollection',
          features: referenceArea.features
        });
        
        // Create a blob and append it to the form data
        const referenceBlob = new Blob([referenceGeoJSON], { type: 'application/json' });
        formData.append('referenceGeoJSON', referenceBlob, 'poly_reference.geojson');
      } else {
        throw new Error('Reference area not defined');
      }
      
      // Add test area data
      if (testAreaMode === 'upload' && testFile) {
        formData.append('testFile', testFile);
      } else if (testAreaMode === 'map') {
        // Get test area GeoJSON from drawn items
        const testGeoJSON = JSON.stringify({
          type: 'FeatureCollection',
          features: testArea.features
        });
        
        // Create a blob and append it to the form data
        const testBlob = new Blob([testGeoJSON], { type: 'application/json' });
        formData.append('testGeoJSON', testBlob, 'poly_test.geojson');
      } else {
        throw new Error('Test area not defined');
      }
      
      // Submit the hypothesis test
      const response = await axiosWithAuth.post(
        `${config.phylonextWebservice}/api/phylonext/jobs/${jobId}/hypothesis-test`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (response.status === 200 || response.status === 201) {
        setSuccess('Hypothesis test submitted successfully. Results will be available soon.');
        
        // Start polling for results
        setIsPolling(true);
      } else {
        throw new Error('Failed to submit hypothesis test');
      }
    } catch (error) {
      console.error('Error submitting hypothesis test:', error);
      setError(error.message || 'Failed to submit hypothesis test');
      dispatch(setTestStatus('error'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Debounced opacity change handler
  const debouncedOpacityChange = useCallback((newValue) => {
    dispatch(setResultsOpacity(newValue));
  }, [dispatch]);
  
  // Handle opacity change
  const handleOpacityChange = (event, newValue) => {
    // Update local state immediately for responsive UI
    // The actual dispatch is debounced to avoid excessive re-renders
    debouncedOpacityChange(newValue);
  };
  
  // Check if both areas are defined
  const areBothAreasDefined = (
    (referenceAreaMode === 'upload' && referenceFile) || 
    (referenceAreaMode === 'map' && referenceArea.features.length > 0)
  ) && (
    (testAreaMode === 'upload' && testFile) || 
    (testAreaMode === 'map' && testArea.features.length > 0)
  );
  
  return (
    <>
      <Drawer
        variant="persistent"
        anchor="left"
        open={isOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          position: 'relative',
          height: '100%',
          '& .MuiDrawer-paper': {
            width: isCollapsed ? 0 : drawerWidth,
            boxSizing: 'border-box',
            position: 'absolute',
            height: '100%',
            border: 'none',
            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
            top: 0,
            transition: 'width 0.2s ease-in-out',
            overflow: 'hidden',
            zIndex: 1001, // Below header but above map
          },
        }}
      >
        <Box sx={{ 
          p: 3, 
          overflow: 'auto', 
          height: '100%',
          width: drawerWidth, // Keep content width fixed
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          <Typography variant="h6" gutterBottom>
            Hypothesis Testing
          </Typography>
          
          {!filesExist ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Required files are not available. Please complete an analysis first.
              {process.env.NODE_ENV === 'development' && (
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => {
                      console.log('Manually enabling hypothesis testing');
                      setFilesExist(true);
                    }}
                  >
                    Debug: Enable Testing
                  </Button>
                </Box>
              )}
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" paragraph>
                Compare biodiversity metrics between two areas within your analyzed region.
              </Typography>
              
              {/* Results Opacity Control */}
              <Box sx={{ mt: 1, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <OpacityIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                  Results Layer Opacity
                  <Tooltip 
                    title={
                      <Box component="div" sx={{ typography: 'body2' }}>
                        Adjust the opacity of the H3 cells to better see your test and reference areas. Lower values make the results more transparent.
                      </Box>
                    }
                    placement="right"
                  >
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <Box sx={{ px: 1, mt: 1 }}>
                  <Slider
                    value={resultsOpacity}
                    onChange={handleOpacityChange}
                    aria-labelledby="results-opacity-slider"
                    step={0.05}
                    marks={[
                      { value: 0.1, label: '10%' },
                      { value: 0.5, label: '50%' },
                      { value: 1, label: '100%' }
                    ]}
                    min={0.1}
                    max={1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={value => `${Math.round(value * 100)}%`}
                    sx={{ 
                      color: 'primary.main',
                      '& .MuiSlider-thumb': {
                        height: 20,
                        width: 20,
                      },
                    }}
                  />
                </Box>
              </Box>
              
              <Divider />
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {success}
                </Alert>
              )}
              
              {/* Reference Area Section */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Reference Area
              </Typography>
                
                <FormControl component="fieldset">
                  <FormLabel>Selection method</FormLabel>
                  <RadioGroup
                    value={referenceAreaMode || ''}
                    onChange={(e) => handleReferenceAreaModeChange(e.target.value)}
                  >
                    {/* Map Selection */}
                    <FormControlLabel
                      value="map"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">Draw on map</Typography>
                          <Tooltip 
                            title={
                              <Box component="div" sx={{ typography: 'body2' }}>
                                Draw a polygon directly on the map. The area will be highlighted in blue.
                              </Box>
                            }
                            placement="right"
                          >
                            <IconButton size="small" sx={{ ml: 1 }}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {referenceAreaMode === 'map' && referenceArea.features.length > 0 && (
                            <Tooltip title="Clear reference area">
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
                                onClick={handleClearReferenceArea}
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
                          <Typography variant="body2">Upload polygon</Typography>
                          <Tooltip 
                            title={
                              <Box component="div" sx={{ typography: 'body2' }}>
                                Import GeoPackage or GeoJSON file for reference area
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
                
                {referenceAreaMode === 'upload' && (
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                    sx={{ ml: 3, mt: 1, mb: 2 }}
                    size="small"
                  >
                    {referenceFile ? referenceFile.name : 'Choose file'}
                    <input
                      type="file"
                      hidden
                      accept=".gpkg,.geojson"
                      onChange={handleReferenceFileUpload}
                    />
                  </Button>
                )}
              </Box>
              
              <Divider />
              
              {/* Test Area Section */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Test Area
              </Typography>
                
                <FormControl component="fieldset">
                  <FormLabel>Selection method</FormLabel>
                  <RadioGroup
                    value={testAreaMode || ''}
                    onChange={(e) => handleTestAreaModeChange(e.target.value)}
                  >
                    {/* Map Selection */}
                    <FormControlLabel
                      value="map"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">Draw on map</Typography>
                          <Tooltip 
                            title={
                              <Box component="div" sx={{ typography: 'body2' }}>
                                Draw a polygon directly on the map. The area will be highlighted in green.
                              </Box>
                            }
                            placement="right"
                          >
                            <IconButton size="small" sx={{ ml: 1 }}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {testAreaMode === 'map' && testArea.features.length > 0 && (
                            <Tooltip title="Clear test area">
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
                                onClick={handleClearTestArea}
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
                          <Typography variant="body2">Upload polygon</Typography>
                          <Tooltip 
                            title={
                              <Box component="div" sx={{ typography: 'body2' }}>
                                Import GeoPackage or GeoJSON file for test area
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
                
                {testAreaMode === 'upload' && (
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                    sx={{ ml: 3, mt: 1, mb: 2 }}
                    size="small"
                  >
                    {testFile ? testFile.name : 'Choose file'}
                    <input
                      type="file"
                      hidden
                      accept=".gpkg,.geojson"
                      onChange={handleTestFileUpload}
                    />
                  </Button>
                )}
              </Box>
              
              <Box sx={{ mt: 'auto', pt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<CompareArrowsIcon />}
                  disabled={!areBothAreasDefined || isSubmitting}
                  onClick={handleTestHypothesis}
                >
                  {isSubmitting ? 'Submitting...' : 'Test Hypothesis'}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>
      
      {/* Results Dialog */}
      <HypothesisResultsDialog
        open={resultsDialogOpen}
        onClose={() => setResultsDialogOpen(false)}
        results={testResults}
      />
    </>
  );
};

export default HypothesisPanel; 