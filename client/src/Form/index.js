import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosWithAuth } from "../Auth/userApi";
import config from "../config";
import withContext from "../Components/hoc/withContext";
import { Box } from "@mui/material";

const PhyloNextForm = ({ setStep, user }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStartAnalysis = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const res = await axiosWithAuth.post(
        `${config.phylonextWebservice}`,
        {} // Add form data here when implementing form functionality
      );
      const jobid = res?.data?.jobid;
      setStep(1);
      navigate(`/run/${jobid}`);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      bgcolor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'text.secondary',
      position: 'absolute',
      top: 0,
      left: 0
    }}>
      {/* This area will be replaced by the map */}
      Map component will be added here
    </Box>
  );
};

const mapContextToProps = ({ step, setStep, user }) => ({
  step, setStep, user
});

export default withContext(mapContextToProps)(PhyloNextForm);
