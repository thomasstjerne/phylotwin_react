import React, { useState } from 'react';
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
  Chip
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InfoIcon from '@mui/icons-material/Info';
import countries from '../Vocabularies/country.json';

const drawerWidth = 340;

// Access the token from environment variables
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const SettingsPanel = ({ isOpen, onClose, activePanel }) => {
  const [spatialResolution, setSpatialResolution] = useState('3');
  const [areaSelectionMode, setAreaSelectionMode] = useState(null);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedPhyloTree, setSelectedPhyloTree] = useState('');
  const [outlierSensitivity, setOutlierSensitivity] = useState('none');
  const [yearRange, setYearRange] = useState([1900, 2025]);
  const [selectedDiversityIndices, setSelectedDiversityIndices] = useState([]);
  const [randomizations, setRandomizations] = useState(1000);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Store the file for later processing
      setUploadedFile(file);
    }
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

          {/* Spatial Filters */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Spatial filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Map Selection */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={areaSelectionMode === 'map'}
                      onChange={(e) => setAreaSelectionMode(e.target.checked ? 'map' : null)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Select on map</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Draw a polygon or box directly on the map
                      </Typography>
                    </Box>
                  }
                />

                {/* Custom Polygon Upload */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={areaSelectionMode === 'upload'}
                      onChange={(e) => setAreaSelectionMode(e.target.checked ? 'upload' : null)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Upload polygon</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Import GeoPackage or GeoJSON file
                      </Typography>
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
                      onChange={(e) => setAreaSelectionMode(e.target.checked ? 'country' : null)}
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
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} onDelete={() => {
                              setSelectedCountries(selectedCountries.filter(country => country !== value));
                            }} />
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
                <FormLabel>Phylogenetic tree</FormLabel>
                <Select
                  value={selectedPhyloTree}
                  onChange={(e) => setSelectedPhyloTree(e.target.value)}
                >
                  {/* Add phylogenetic tree options here */}
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

          {/* Outlier Removal */}
          <FormControl component="fieldset" sx={{ my: 3 }}>
            <FormLabel>Outlier removal sensitivity</FormLabel>
            <RadioGroup
              row
              value={outlierSensitivity}
              onChange={(e) => setOutlierSensitivity(e.target.value)}
            >
              {['none', 'low', 'medium', 'high'].map((value) => (
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
          <Box sx={{ mb: 3 }}>
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

          {/* Diversity Indices */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <FormLabel>Diversity indices</FormLabel>
            <Select
              multiple
              value={selectedDiversityIndices}
              onChange={(e) => setSelectedDiversityIndices(e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {/* Add diversity indices options here */}
            </Select>
          </FormControl>

          <TextField
            label="Number of randomizations"
            type="number"
            value={randomizations}
            onChange={(e) => setRandomizations(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
          />

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