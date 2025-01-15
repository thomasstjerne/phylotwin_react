const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');
const config = require('../config');
const auth = require('../Auth/auth');
const { startJob } = require('../services/jobService');
const diversityIndices = require('../../shared/vocabularies/diversityIndices.json');
const phylogeneticTrees = require('../../shared/vocabularies/phylogeneticTrees.json');

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

// Debug middleware
router.use((req, res, next) => {
  console.log('Runs Router:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers,
    files: req.files
  });
  next();
});

// Add this function at the top of the file
const checkDirectoryAccess = async (dir) => {
  try {
    await fs.access(dir, fs.constants.W_OK);
    return true;
  } catch (error) {
    console.error(`Directory ${dir} is not accessible:`, error);
    return false;
  }
};

// Helper function to save GeoJSON to file
async function saveGeoJSONToFile(geojson, outputDir) {
  const filename = 'drawn_polygon.geojson';
  const filepath = path.join(outputDir, filename);
  console.log('\n=== SAVING GEOJSON FILE ===');
  console.log('Output directory:', outputDir);
  console.log('Target filepath:', filepath);
  console.log('Number of polygons:', geojson.features.length);
  
  try {
    // Verify directory exists
    try {
      await fs.access(outputDir, fs.constants.W_OK);
      console.log('Output directory exists and is writable');
    } catch (error) {
      console.error('Output directory issue:', error);
      // Create directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });
      console.log('Created output directory');
    }

    // Ensure the GeoJSON is properly formatted
    const formattedGeoJSON = {
      type: 'FeatureCollection',
      features: geojson.features.map(feature => ({
        type: 'Feature',
        geometry: {
          type: feature.geometry.type,
          coordinates: feature.geometry.coordinates
        },
        properties: feature.properties || {}
      }))
    };

    // Write file
    await fs.writeFile(filepath, JSON.stringify(formattedGeoJSON, null, 2));
    console.log('File written successfully');

    // Verify file exists and is readable
    await fs.access(filepath, fs.constants.F_OK | fs.constants.R_OK);
    const stats = await fs.stat(filepath);
    console.log('File verified:', {
      exists: true,
      size: `${(stats.size / 1024).toFixed(2)} KB`,
      path: filepath
    });

    return filepath;
  } catch (error) {
    console.error('Error in saveGeoJSONToFile:', error);
    throw error;
  }
}

// Start a new pipeline run
router.post('/', 
  auth.appendUser(),
  upload.fields([
    { name: 'polygon', maxCount: 1 },
    { name: 'specieskeys', maxCount: 1 }
  ]),
  async (req, res) => {
    const jobId = req.id;
    console.log('\n=== RECEIVED ANALYSIS REQUEST ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Job ID: ${jobId}`);
    console.log(`User: ${req.user?.userName}`);
    console.log('Request body data:', req.body.data);
    console.log('===============================\n');

    if (!req.user) {
      console.error('Request rejected: Authentication required');
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Check if output directory is accessible
      const baseOutputDir = config.OUTPUT_PATH;
      const hasAccess = await checkDirectoryAccess(baseOutputDir);
      if (!hasAccess) {
        throw new Error(`Output directory ${baseOutputDir} is not accessible`);
      }

      if (!req.body.data) {
        throw new Error('Missing data field in request body');
      }

      const jobDir = `${config.OUTPUT_PATH}/${jobId}`;
      const outputDir = `${jobDir}/output`;
      
      // Create job directories
      console.log('\n=== CREATING DIRECTORIES ===');
      console.log('Job directory:', jobDir);
      console.log('Output directory:', outputDir);
      
      try {
        await fs.mkdir(jobDir, { recursive: true });
        await fs.mkdir(outputDir, { recursive: true });
        console.log('Directories created successfully');
      } catch (error) {
        console.error('Error creating directories:', error);
        throw error;
      }
      
      // Parse request parameters
      let body;
      try {
        body = JSON.parse(req.body.data);
        console.log('\n=== PARSED REQUEST BODY ===');
        console.log('Area selection mode:', body.areaSelectionMode);
        console.log('Has polygon data:', !!body.polygon);
        if (body.polygon) {
          console.log('Polygon features:', body.polygon.features?.length);
        }
      } catch (error) {
        console.error('Error parsing request body:', error);
        throw new Error('Invalid JSON in data field');
      }

      let polygonPath = null;

      // Handle map-drawn polygons
      if (body.areaSelectionMode === 'map' && body.polygon?.features?.length > 0) {
        console.log('\n=== HANDLING MAP POLYGON ===');
        try {
          polygonPath = await saveGeoJSONToFile(body.polygon, outputDir);
          console.log('Polygon saved successfully to:', polygonPath);
          body.polygon = path.basename(polygonPath);
        } catch (error) {
          console.error('Error saving polygon:', error);
          throw error;
        }
      }
      // Handle uploaded files
      else if (req.files?.polygon?.[0]) {
        polygonPath = path.join(outputDir, req.files.polygon[0].originalname);
        body.polygon = path.basename(polygonPath);
        console.log('Using uploaded polygon file:', polygonPath);
      }
      
      if (req.files?.specieskeys?.[0]) {
        body.specieskeys = req.files.specieskeys[0].path;
      }

      // Process parameters and start job
      console.log('\n=== PROCESSING PARAMETERS ===');
      console.log('Input body:', body);
      const processedParams = processParams(body, outputDir);
      
      // Log the final parameters
      console.log('\n=== PROCESSED PARAMETERS ===');
      console.log('Polygon path:', processedParams.polygon || 'None');
      console.log('Full processed parameters:', processedParams);
      console.log('===========================\n');

      await startJob({
        username: req?.user?.userName,
        req_id: jobId,
        params: processedParams
      });
      
      res.status(200).json({ jobid: jobId });
    } catch (error) {
      console.error('\n=== REQUEST PROCESSING ERROR ===');
      console.error(`Job ID: ${jobId}`);
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('================================\n');
      res.status(500).json({ error: error.message });
    }
});

const processParams = (body, outputDir) => {
  try {
    console.log('Processing parameters:', body);
    const params = {};
    
    // Process spatial resolution
    if (body.spatialResolution) {
      params.resolution = parseInt(body.spatialResolution, 10);
    }
    
    // Handle area selection based on mode
    if (body.areaSelectionMode === 'country' && body.selectedCountries?.length > 0) {
      params.country = body.selectedCountries;
    } else if (body.areaSelectionMode === 'map' && body.polygon) {
      // Construct the full path to the polygon file
      params.polygon = path.join(outputDir, body.polygon);
      console.log('Setting polygon path:', params.polygon);
    }

    // Process phylogenetic tree selection
    if (body.selectedPhyloTree) {
      const selectedTree = phylogeneticTrees.find(tree => tree.id === body.selectedPhyloTree);
      if (selectedTree) {
        params.tree = selectedTree.fileName;
      } else {
        throw new Error(`Invalid phylogenetic tree selection: ${body.selectedPhyloTree}`);
      }
    }

    // Process taxonomic filters
    if (body.taxonomicFilters) {
      ['phylum', 'class', 'order', 'family', 'genus'].forEach(rank => {
        if (body.taxonomicFilters[rank]?.length > 0) {
          const paramName = rank === 'class' ? 'classs' : rank;
          params[paramName] = body.taxonomicFilters[rank].map(t => t.name || t.scientificName || t);
        }
      });
    }

    // Process record filtering mode
    if (body.recordFilteringMode) {
      params.basis_of_record = body.recordFilteringMode === 'specimen' 
        ? "PRESERVED_SPECIMEN,MATERIAL_SAMPLE,MATERIAL_CITATION,MACHINE_OBSERVATION"
        : "PRESERVED_SPECIMEN,MATERIAL_SAMPLE,MATERIAL_CITATION,MACHINE_OBSERVATION,HUMAN_OBSERVATION";
    }

    // Process year range
    if (body.yearRange && Array.isArray(body.yearRange) && body.yearRange.length === 2) {
      params.minyear = body.yearRange[0];
      params.maxyear = body.yearRange[1];
    }

    // Process diversity indices
    if (body.selectedDiversityIndices?.length > 0) {
      const mainIndices = [];
      const biodiverseIndices = [];
      
      // Get all indices from the vocabulary
      const allIndices = diversityIndices.groups.flatMap(group => group.indices);
      
      body.selectedDiversityIndices.forEach(selectedId => {
        const index = allIndices.find(i => i.id === selectedId);
        if (index) {
          if (index.module === 'main') {
            mainIndices.push(index.commandName);
          } else if (index.module === 'biodiverse') {
            biodiverseIndices.push(index.commandName);
          }
        }
      });

      if (mainIndices.length > 0) {
        params.div = mainIndices;
      }
      if (biodiverseIndices.length > 0) {
        params.bd_indices = biodiverseIndices;
      }
    }

    // Process randomizations
    if (body.randomizations) {
      params.rnd = parseInt(body.randomizations, 10);
    }

    console.log('Processed parameters:', params);
    return params;
  } catch (error) {
    console.error('Error processing parameters:', error);
    throw new Error(`Failed to process parameters: ${error.message}`);
  }
};

module.exports = router; 