import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
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

const drawerWidth = 340;

const SettingsPanel = ({ isOpen, onClose, activePanel }) => {
  const dispatch = useDispatch();
  const [spatialResolution, setSpatialResolution] = useState('3');
  const [areaSelectionMode, setAreaSelectionMode] = useState(null);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedPhyloTree, setSelectedPhyloTree] = useState('');
  const [outlierSensitivity, setOutlierSensitivity] = useState('none');
  const [yearRange, setYearRange] = useState([1900, 2025]);
  const [selectedDiversityIndices, setSelectedDiversityIndices] = useState([]);
  const [randomizations, setRandomizations] = useState(1000);
  const [recordFilteringMode, setRecordFilteringMode] = useState('specimen');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Store the file for later processing
      setUploadedFile(file);
    }
  };

  const handleAreaSelectionModeChange = (mode, checked) => {
    const newMode = checked ? mode : null;
    setAreaSelectionMode(newMode);
    dispatch({ type: 'SET_AREA_SELECTION_MODE', payload: newMode });
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
                    onChange={(e) => setSpatialResolution(e.target.value)}
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

                {/* Map Selection */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={areaSelectionMode === 'map'}
                      onChange={(e) => handleAreaSelectionModeChange('map', e.target.checked)}
                    />
                  }
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
                  control={
                    <Checkbox
                      checked={areaSelectionMode === 'upload'}
                      onChange={(e) => handleAreaSelectionModeChange('upload', e.target.checked)}
                    />
                  }
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
                    sx={{ ml: 3 }}
                  >
                    Choose file
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
                  control={
                    <Checkbox
                      checked={areaSelectionMode === 'country'}
                      onChange={(e) => handleAreaSelectionModeChange('country', e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Select countries</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Choose one or more countries from the list
                      </Typography>
                    </Box>
                  }
                />
                {areaSelectionMode === 'country' && (
                  <FormControl sx={{ ml: 3 }}>
                    <Select
                      multiple
                      value={selectedCountries}
                      onChange={(e) => setSelectedCountries(e.target.value)}
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
                                setSelectedCountries(newSelected);
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
                  onChange={(e) => setSelectedPhyloTree(e.target.value)}
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

              {['Phylum', 'Class', 'Order', 'Family', 'Genus'].map((rank) => (
                <TextField
                  key={rank}
                  label={rank}
                  fullWidth
                  sx={{ mb: 2 }}
                />
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
                    onChange={(e) => setRecordFilteringMode(e.target.value)}
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
                    onChange={(e, newValue) => setYearRange(newValue)}
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
                    onChange={(e) => setSelectedDiversityIndices(e.target.value)}
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
                                setSelectedDiversityIndices(newSelected);
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
                  onChange={(e) => setRandomizations(e.target.value)}
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
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              type="submit"
            >
              Start Analysis
            </Button>
          </Box>
        </Box>
      )}
    </Drawer>
  );
};

export default SettingsPanel; 