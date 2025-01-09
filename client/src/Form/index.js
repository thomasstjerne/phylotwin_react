import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { axiosWithAuth } from "../Auth/userApi";
import config from "../config";
import withContext from "../Components/hoc/withContext";
import { Box } from "@mui/material";
import MapComponent from "../Components/Map/Map";
import logger from "../utils/logger";

const PhyloNextForm = ({ setStep, user }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Get all relevant data from Redux store
  const drawnItems = useSelector(state => state.map.drawnItems);
  const areaSelectionMode = useSelector(state => state.map.areaSelectionMode);
  const spatialResolution = useSelector(state => state.settings.spatialResolution);
  const selectedCountries = useSelector(state => state.settings.selectedCountries);
  const selectedPhyloTree = useSelector(state => state.settings.selectedPhyloTree);
  const taxonomicFilters = useSelector(state => state.settings.taxonomicFilters);
  const recordFilteringMode = useSelector(state => state.settings.recordFilteringMode);
  const yearRange = useSelector(state => state.settings.yearRange);
  const selectedDiversityIndices = useSelector(state => state.settings.selectedDiversityIndices);
  const randomizations = useSelector(state => state.settings.randomizations);

  const handleStartAnalysis = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Create form data
      const formData = new FormData();
      
      // Prepare the main data object
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

      // Log the form data
      logger.group('Form Submission Data');
      logger.debug('Area Selection Mode:', areaSelectionMode);
      logger.debug('Form Data:', data);
      
      // If polygons were drawn on the map, create a GeoJSON file
      if (areaSelectionMode === 'map' && drawnItems?.features?.length > 0) {
        logger.debug('Map Polygons:', drawnItems);
        const geoJSONBlob = new Blob(
          [JSON.stringify(drawnItems, null, 2)], 
          { type: 'application/geo+json' }
        );
        formData.append('polygon', geoJSONBlob, 'drawn_polygons.geojson');
        
        // Log the GeoJSON content
        logger.debug('GeoJSON being sent:', JSON.stringify(drawnItems, null, 2));
      }

      // Add the main data as JSON
      formData.append('data', JSON.stringify(data));

      // Log the FormData contents
      logger.logFormData(formData);
      logger.groupEnd();

      const res = await axiosWithAuth.post(
        `${config.phylonextWebservice}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const jobid = res?.data?.jobid;
      logger.debug('Job started with ID:', jobid);
      setStep(1);
      navigate(`/run/${jobid}`);
    } catch (error) {
      logger.error('Error submitting form:', error);
      setLoading(false);
    }
  }, [user, drawnItems, areaSelectionMode, spatialResolution, selectedCountries, 
      selectedPhyloTree, taxonomicFilters, recordFilteringMode, yearRange, 
      selectedDiversityIndices, randomizations, navigate, setStep]);

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      bgcolor: '#f5f5f5',
      position: 'absolute',
      top: 0,
      left: 0
    }}>
      <MapComponent />
    </Box>
  );
};

const mapContextToProps = ({ step, setStep, user }) => ({
  step, setStep, user
});

export default withContext(mapContextToProps)(PhyloNextForm);
