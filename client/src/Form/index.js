import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { axiosWithAuth } from "../Auth/userApi";
import config from "../config";
import withContext from "../Components/hoc/withContext";
import { Box } from "@mui/material";
import MapComponent from "../Components/Map/Map";

const PhyloNextForm = ({ setStep, user }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Get the drawn items from Redux store
  const drawnItems = useSelector(state => state.map.drawnItems);
  const areaSelectionMode = useSelector(state => state.map.areaSelectionMode);

  const handleStartAnalysis = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Create form data
      const formData = new FormData();
      
      // Add the main data object
      const data = {
        // ... other form data
      };

      // If polygons were drawn on the map, create a GeoJSON file
      if (areaSelectionMode === 'map' && drawnItems?.features?.length > 0) {
        const geoJSONBlob = new Blob(
          [JSON.stringify(drawnItems)], 
          { type: 'application/geo+json' }
        );
        formData.append('polygon', geoJSONBlob, 'drawn_polygons.geojson');
      }

      // Add the main data as JSON
      formData.append('data', JSON.stringify(data));

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
      setStep(1);
      navigate(`/run/${jobid}`);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, [user, drawnItems, areaSelectionMode, navigate, setStep]);

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
