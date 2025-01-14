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
  console.log('Saving GeoJSON to:', filepath);
  try {
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

    await fs.writeFile(filepath, JSON.stringify(formattedGeoJSON, null, 2));
    // Verify the file was written
    await fs.access(filepath, fs.constants.F_OK);
    const fileContent = await fs.readFile(filepath, 'utf8');
    console.log('Successfully wrote and verified GeoJSON file. Content:', fileContent);
    return filepath;
  } catch (error) {
    console.error('Error writing GeoJSON file:', error);
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
    console.log('POST /runs handler executing', {
      hasUser: !!req.user,
      userName: req.user?.userName,
      isDev: process.env.NODE_ENV === 'development'
    });

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Check if output directory is accessible
      const baseOutputDir = config.OUTPUT_PATH;
      console.log('Checking directory access:', baseOutputDir);
      
      const hasAccess = await checkDirectoryAccess(baseOutputDir);
      if (!hasAccess) {
        throw new Error(`Output directory ${baseOutputDir} is not accessible`);
      }

      if (!req.body.data) {
        console.error('No data field in request body');
        return res.status(400).json({ error: 'Missing data field in request body' });
      }

      const jobDir = `${config.OUTPUT_PATH}/${req.id}`;
      const outputDir = `${jobDir}/output`;
      
      console.log('Creating directories:', { jobDir, outputDir });
      await fs.mkdir(outputDir, { recursive: true });
      
      let body;
      try {
        body = JSON.parse(req.body.data);
        console.log('Parsed request body:', body);
      } catch (error) {
        console.error('Failed to parse request data:', error);
        return res.status(400).json({ error: 'Invalid JSON in data field' });
      }

      // Handle map-drawn polygons
      if (body.areaSelectionMode === 'map' && body.polygon?.features?.length > 0) {
        console.log('Processing map-drawn polygon:', JSON.stringify(body.polygon, null, 2));
        try {
          const polygonPath = await saveGeoJSONToFile(body.polygon, outputDir);
          console.log('Saved polygon to:', polygonPath);
          // Store just the filename, not the full path
          body.polygon = 'drawn_polygon.geojson';
        } catch (error) {
          console.error('Failed to save polygon file:', error);
          throw new Error(`Failed to save polygon file: ${error.message}`);
        }
      }
      // Handle uploaded files
      else if (req.files?.polygon?.[0]) {
        console.log('Processing uploaded polygon file');
        body.polygon = req.files.polygon[0].originalname;
      }
      
      if (req.files?.specieskeys?.[0]) {
        body.specieskeys = req.files.specieskeys[0].path;
      }

      // Process parameters
      const processedParams = processParams(body, outputDir);
      console.log('Final processed parameters:', processedParams);
      
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