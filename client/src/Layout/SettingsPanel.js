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

const drawerWidth = 340;

const SettingsPanel = ({ isOpen, onClose, activePanel }) => {
  const [spatialResolution, setSpatialResolution] = useState('3');
  const [areaSelectionMode, setAreaSelectionMode] = useState('polygon');
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedPhyloTree, setSelectedPhyloTree] = useState('');
  const [outlierSensitivity, setOutlierSensitivity] = useState('none');
  const [yearRange, setYearRange] = useState([1900, 2025]);
  const [selectedDiversityIndices, setSelectedDiversityIndices] = useState([]);
  const [randomizations, setRandomizations] = useState(1000);

  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    // Handle file upload logic here
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
            <FormLabel>Spatial Resolution</FormLabel>
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
              <Typography>Spatial Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Area Selection Mode</FormLabel>
                <RadioGroup
                  value={areaSelectionMode}
                  onChange={(e) => setAreaSelectionMode(e.target.value)}
                >
                  <FormControlLabel value="polygon" control={<Radio />} label="Hand-drawn polygon" />
                  <FormControlLabel value="box" control={<Radio />} label="Coordinate box" />
                </RadioGroup>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Country Selection</FormLabel>
                <Select
                  multiple
                  value={selectedCountries}
                  onChange={(e) => setSelectedCountries(e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </Box>
                  )}
                >
                  {/* Add country options here */}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ mb: 2 }}
              >
                Upload Custom Polygon
                <input
                  type="file"
                  hidden
                  accept=".gpkg,.geojson"
                  onChange={(e) => handleFileUpload(e, 'polygon')}
                />
              </Button>
            </AccordionDetails>
          </Accordion>

          {/* Taxonomic Filters */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Taxonomic Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Phylogenetic Tree</FormLabel>
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
                Upload Species Keys
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
            <FormLabel>Outlier Removal Sensitivity</FormLabel>
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
            <FormLabel>Collection Year Range</FormLabel>
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
            <FormLabel>Diversity Indices</FormLabel>
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
            label="Number of Randomizations"
            type="number"
            value={randomizations}
            onChange={(e) => setRandomizations(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
          />
        </Box>
      )}
    </Drawer>
  );
};

export default SettingsPanel; 