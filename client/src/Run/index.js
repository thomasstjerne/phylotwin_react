// This file is deprecated and will be removed.
// Job status polling is now handled by JobStatusPoller.js
// Visualization is handled by VisualizationPanel.js and Map.js

import React from 'react';
import { Typography } from 'antd';
import { Navigate } from 'react-router-dom';

const PhyloNextJob = () => {
  return <Navigate to="/" replace />;
};

export default PhyloNextJob;
