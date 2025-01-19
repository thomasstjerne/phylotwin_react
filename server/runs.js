"use strict";
const express = require('express');
const _ = require("lodash");
const child_process = require("child_process");
const config = require("./config");
const async = require("async");
const db = require("./db");
const fs = require("fs").promises;
const auth = require("./Auth/auth");
const multer = require("multer");
const router = express.Router();

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

// Process parameters from frontend
const processParams = (body) => {
  const params = {};

  // 1. Spatial filters
  if (body.spatialResolution) {
    params.resolution = body.spatialResolution;
  }
  
  if (body.selectedCountries?.length > 0) {
    params.country = body.selectedCountries;
  }

  // 2. Taxonomic filters
  if (body.selectedPhyloTree) {
    params.tree = body.selectedPhyloTree;
  }

  // Add taxonomic rank filters if present
  ['phylum', 'class', 'order', 'family', 'genus'].forEach(rank => {
    if (body.taxonomicFilters?.[rank]?.length > 0) {
      // Note: class parameter needs three 's'
      const paramName = rank === 'class' ? 'classs' : rank;
      params[paramName] = body.taxonomicFilters[rank];
    }
  });

  // 3. Data selection criteria
  if (body.recordFilteringMode) {
    params.basis_of_record = body.recordFilteringMode === 'specimen' 
      ? "PRESERVED_SPECIMEN,MATERIAL_SAMPLE,MATERIAL_CITATION,MACHINE_OBSERVATION"
      : "PRESERVED_SPECIMEN,MATERIAL_SAMPLE,MATERIAL_CITATION,MACHINE_OBSERVATION,HUMAN_OBSERVATION";
  }

  if (body.yearRange) {
    params.minyear = body.yearRange[0];
    params.maxyear = body.yearRange[1];
  }

  // 4. Diversity indices
  if (body.div?.length > 0) {
    params.div = body.div;
  }
  if (body.bd_indices?.length > 0) {
    params.bd_indices = body.bd_indices;
  }

  if (body.randomizations) {
    params.rnd = body.randomizations;
  }

  return params;
};

// Routes
router.post("/", 
  auth.appendUser(),
  upload.fields([
    { name: 'polygon', maxCount: 1 },
    { name: 'specieskeys', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const jobDir = `${config.OUTPUT_PATH}/${req.id}`;
      const outputDir = `${jobDir}/output`;
      
      await fs.mkdir(outputDir, { recursive: true });
      
      let body = JSON.parse(req.body.data);
      
      // Handle uploaded files
      if(_.get(req, 'files.polygon[0].filename')) {
        body.polygon = `${outputDir}/${req.files.polygon[0].filename}`;
      }
      
      if(_.get(req, 'files.specieskeys[0].filename')) {
        body.specieskeys = `${outputDir}/${req.files.specieskeys[0].filename}`;
      }

      // Process parameters
      const processedParams = processParams(body);
      
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

module.exports = router;
