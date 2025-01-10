const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs').promises;
const _ = require('lodash');
const config = require('../config');
const auth = require('../Auth/auth');
const { startJob } = require('../services/jobService');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const jobDir = `${config.OUTPUT_PATH}/${req.id}`;
    const workingDir = `${jobDir}/work`;
    const outputDir = `${jobDir}/output`;

    try {
      await fs.mkdir(jobDir, { recursive: true });
      await fs.mkdir(workingDir, { recursive: true });
      await fs.mkdir(outputDir, { recursive: true });
      cb(null, outputDir);
    } catch (error) {
      console.error("Failed to create output directory:", error);
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// Start a new pipeline run
router.post('/', 
  auth.appendUser(),
  upload.fields([
    { name: 'polygon', maxCount: 1 },
    { name: 'specieskeys', maxCount: 1 }
  ]),
  async (req, res) => {
    console.log('POST /runs received:', {
      hasUser: !!req.user,
      hasFiles: !!req.files,
      bodyKeys: Object.keys(req.body)
    });
    
    try {
      const jobDir = `${config.OUTPUT_PATH}/${req.id}`;
      const outputDir = `${jobDir}/output`;
      
      await fs.mkdir(outputDir, { recursive: true });
      
      let body = JSON.parse(req.body.data);
      console.log('Parsed request body:', body);
      
      // Handle uploaded files
      if(_.get(req, 'files.polygon[0].filename')) {
        body.polygon = `${outputDir}/${req.files.polygon[0].filename}`;
      }
      
      if(_.get(req, 'files.specieskeys[0].filename')) {
        body.specieskeys = `${outputDir}/${req.files.specieskeys[0].filename}`;
      }

      // Process parameters
      const processedParams = processParams(body);
      console.log('Processed parameters:', processedParams);

      await startJob({
        username: req?.user?.userName,
        req_id: req.id,
        params: processedParams
      });
      
      res.status(200).json({ jobid: req.id });
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ error: error.message });
    }
});

const processParams = (body) => {
  const params = {};

  // Process spatial filters
  if (body.spatialResolution) {
    params.resolution = body.spatialResolution;
  }
  
  if (body.areaSelectionMode === 'country' && body.selectedCountries?.length > 0) {
    params.country = body.selectedCountries;
  }

  // Process taxonomic filters
  if (body.selectedPhyloTree) {
    params.tree = body.selectedPhyloTree;
  }

  if (body.taxonomicFilters) {
    ['phylum', 'class', 'order', 'family', 'genus'].forEach(rank => {
      if (body.taxonomicFilters[rank]?.length > 0) {
        const paramName = rank === 'class' ? 'classs' : rank;
        params[paramName] = body.taxonomicFilters[rank].map(t => t.key || t);
      }
    });
  }

  // Process data selection criteria
  if (body.recordFilteringMode) {
    params.basis_of_record = body.recordFilteringMode === 'specimen' 
      ? "PRESERVED_SPECIMEN,MATERIAL_SAMPLE,MATERIAL_CITATION,MACHINE_OBSERVATION"
      : "PRESERVED_SPECIMEN,MATERIAL_SAMPLE,MATERIAL_CITATION,MACHINE_OBSERVATION,HUMAN_OBSERVATION";
  }

  if (body.yearRange) {
    params.minyear = body.yearRange[0];
    params.maxyear = body.yearRange[1];
  }

  // Process diversity indices
  if (body.selectedDiversityIndices?.length > 0) {
    const mainIndices = [];
    const biodiverseIndices = [];

    body.selectedDiversityIndices.forEach(index => {
      if (index.module === 'main') {
        mainIndices.push(index.commandName);
      } else if (index.module === 'biodiverse') {
        biodiverseIndices.push(index.commandName);
      }
    });

    if (mainIndices.length > 0) params.div = mainIndices;
    if (biodiverseIndices.length > 0) params.bd_indices = biodiverseIndices;
  }

  return params;
};

module.exports = router; 