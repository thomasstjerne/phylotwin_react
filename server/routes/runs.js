const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const config = require('../config');
const db = require('../db');
const auth = require('../Auth/auth');
const multer = require('multer');
const { startJob } = require('../services/jobService');
const diversityIndices = require('../../shared/vocabularies/diversityIndices.json');
const phylogeneticTrees = require('../../shared/vocabularies/phylogeneticTrees.json');

// Helper function to check directory access
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

// Multer storage configuration
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const jobDir = `${config.OUTPUT_PATH}/${req.id}`;
        const outputDir = `${jobDir}/output`;
        
        try {
            await fs.mkdir(jobDir, { recursive: true });
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

// Start new analysis
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
    }
);

// Process parameters helper function
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

// Get user's runs
router.get('/myruns', auth.appendUser(), async (req, res) => {
    console.log('\n=== FETCHING USER RUNS ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`User: ${req.user?.userName}`);

    if (!req.user) {
        console.error('Request rejected: Authentication required');
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Read the latest database state
        db.read();

        // Get runs for the user using lowdb syntax, handling both username and userName fields
        const runs = db.get('runs')
            .filter(run => run.username === req.user.userName || run.userName === req.user.userName)
            .sortBy('start_date')
            .reverse()
            .value();

        console.log('Found runs:', runs.length, 'for user:', req.user.userName);

        // Format runs with additional metadata
        const formattedRuns = runs.map(run => {
            return {
                ...run,
                tree: run.params?.tree,
                started: run.start_date,
                run: run.run || run.id,  // Ensure we have a run ID
                params: {
                    ...run.params,
                    country: Array.isArray(run.params?.country) ? run.params.country : run.params?.country ? [run.params.country] : [],
                    div: Array.isArray(run.params?.div) ? run.params.div : run.params?.div ? [run.params.div] : [],
                    bd_indices: Array.isArray(run.params?.bd_indices) ? run.params.bd_indices : run.params?.bd_indices ? [run.params.bd_indices] : []
                },
                status: run.status || 'unknown'
            };
        });

        console.log(`Found ${formattedRuns.length} runs`);
        res.json(formattedRuns);
    } catch (error) {
        console.error('Error fetching runs:', error);
        res.status(500).json({ error: 'Failed to fetch runs' });
    }
});

// Get run details
router.get('/job/:jobId', auth.appendUser(), async (req, res) => {
    try {
        const run = db.get('runs')
            .find({ 
                run: req.params.jobId,
                username: req.user.userName 
            })
            .value();

        if (!run) {
            return res.status(404).json({ error: 'Run not found' });
        }

        res.json(run);
    } catch (error) {
        console.error('Error fetching run:', error);
        res.status(500).json({ error: 'Failed to fetch run details' });
    }
});

// Delete a run
router.delete('/job/:jobId', auth.appendUser(), async (req, res) => {
    console.log('\n=== DELETING RUN ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Job ID: ${req.params.jobId}`);
    console.log(`User: ${req.user?.userName}`);

    if (!req.user) {
        console.error('Request rejected: Authentication required');
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const jobId = req.params.jobId;
        
        // Read latest database state
        db.read();
        
        // Check if job exists and belongs to user - check both username and userName fields
        const job = db.get('runs')
            .find(run => 
                (run.run === jobId || run.id === jobId) && 
                (run.username === req.user.userName || run.userName === req.user.userName)
            )
            .value();

        if (!job) {
            console.error('Job not found or unauthorized');
            return res.status(404).json({ error: 'Run not found' });
        }

        // Delete job files
        const jobDir = path.join(config.OUTPUT_PATH, jobId);
        try {
            await fs.rm(jobDir, { recursive: true, force: true });
            console.log('Deleted job directory:', jobDir);
        } catch (error) {
            console.error('Error deleting job directory:', error);
            // Continue with database deletion even if files cannot be deleted
        }

        // Delete job from database - handle both run and id fields
        db.get('runs')
            .remove(run => 
                (run.run === jobId || run.id === jobId) && 
                (run.username === req.user.userName || run.userName === req.user.userName)
            )
            .write();
            
        console.log('Deleted job from database');

        res.json({ message: 'Run deleted successfully' });
    } catch (error) {
        console.error('Error deleting run:', error);
        res.status(500).json({ error: 'Failed to delete run' });
    }
});

// Download run archive
router.get('/job/:jobId/archive', auth.appendUser(), async (req, res) => {
    console.log('\n=== DOWNLOADING RUN ARCHIVE ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Job ID: ${req.params.jobId}`);
    console.log(`User: ${req.user?.userName}`);

    if (!req.user) {
        console.error('Request rejected: Authentication required');
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const jobId = req.params.jobId;
        
        // Check if job exists and belongs to user
        db.read();
        const job = db.get('runs')
            .find(run => 
                (run.run === jobId || run.id === jobId) && 
                (run.username === req.user.userName || run.userName === req.user.userName)
            )
            .value();

        if (!job) {
            console.error('Job not found or unauthorized');
            return res.status(404).json({ error: 'Run not found' });
        }

        const outputDir = path.join(config.OUTPUT_PATH, jobId, 'output');
        
        try {
            await fs.access(outputDir, fs.constants.R_OK);
        } catch (error) {
            console.error('Output directory not found:', error);
            return res.status(404).json({ error: 'Run output not found' });
        }

        // Set response headers
        res.attachment(`phylotwin-run-${jobId}.zip`);
        
        // Create zip archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Pipe archive data to the response
        archive.pipe(res);

        // Add the output directory to the archive
        archive.directory(outputDir, 'output');

        // Finalize archive
        await archive.finalize();

        console.log('Archive created and streamed successfully');
    } catch (error) {
        console.error('Error creating archive:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to create archive' });
        }
    }
});

// Get run results (GeoJSON)
router.get('/job/:jobId/results', auth.appendUser(), async (req, res) => {
    console.log('\n=== FETCHING RUN RESULTS ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Job ID: ${req.params.jobId}`);
    console.log(`User: ${req.user?.userName}`);

    if (!req.user) {
        console.error('Request rejected: Authentication required');
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const jobId = req.params.jobId;
        const resultsPath = path.join(config.OUTPUT_PATH, jobId, 'output', '02.Diversity_estimates', 'diversity_estimates.geojson');
        
        console.log('Looking for results at:', resultsPath);
        
        try {
            await fs.access(resultsPath, fs.constants.R_OK);
        } catch (error) {
            console.error('Results file not found:', error);
            return res.status(404).json({ error: 'Results not found' });
        }

        const results = await fs.readFile(resultsPath, 'utf8');
        res.json(JSON.parse(results));
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

module.exports = router; 