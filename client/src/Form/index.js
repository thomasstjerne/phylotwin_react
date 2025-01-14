import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { axiosWithAuth } from "../Auth/userApi";
import config from "../config";
import withContext from "../Components/hoc/withContext";
import { Box } from "@mui/material";
import MapComponent from "../Components/Map/Map";
import logger from "../utils/logger";

const PhyloNextForm = ({ setStep, user }) => {
  const navigate = useNavigate();

  // Debug mounting
  useEffect(() => {
    console.log('PhyloNextForm mounted');
  }, []);

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

// Wrap the component with context
export default withContext(({ step, setStep, user }) => {
  console.log('withContext props:', { hasUser: !!user, step });
  return {
    step,
    setStep,
    user
  };
})(PhyloNextForm);
