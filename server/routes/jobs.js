const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const fsPromises = require('fs').promises;
const config = require('../config');
const auth = require('../Auth/auth');
const { jobs, killJob, removeJobData, collectLogFiles, getSessionId, saveParametersToFile, runHypothesisTest } = require('../services/jobService');
const path = require('path');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const jobDir = path.join(config.OUTPUT_PATH, req.params.jobid, 'temp');
    try {
      await fsPromises.mkdir(jobDir, { recursive: true });
      cb(null, jobDir);
    } catch (error) {
      console.error('Error creating temp directory:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Use original filename for uploaded files
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// Track last logged status for each job to prevent duplicate logs
const lastLoggedStatus = new Map();

// Get job status
router.get("/:jobid", async (req, res) => {
  try {
    const jobId = req.params.jobid;

    // Get status from database
    const jobRecord = db.get("runs")
      .find({ run: jobId })
      .value();

    if (!jobRecord) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get current job tracking info
    const jobTracking = jobs.get(jobId);

    // Combine information from both sources
    const response = {
      jobid: jobId,
      status: jobRecord.status || jobTracking?.status || 'unknown',
      started: jobRecord.started,
      completed: jobRecord.completed,
      exitCode: jobRecord.exitCode,
      error: jobRecord.error,
      signal: jobRecord.signal
    };

    // Only log status changes and final states, avoiding duplicates
    const lastStatus = lastLoggedStatus.get(jobId);
    const currentStatus = response.status;
    
    if ((currentStatus === 'completed' || currentStatus === 'error') && 
        lastStatus !== currentStatus) {
      console.log(`\n=== JOB ${currentStatus.toUpperCase()} ===`);
      console.log(`Job ID: ${jobId}`);
      console.log(`Time: ${new Date().toISOString()}`);
      if (response.exitCode) console.log(`Exit code: ${response.exitCode}`);
      if (response.error) console.log(`Error: ${response.error}`);
      if (response.signal) console.log(`Signal: ${response.signal}`);
      console.log('='.repeat(currentStatus.length + 10), '\n');
      
      // Update last logged status
      lastLoggedStatus.set(jobId, currentStatus);
      
      // Clean up status tracking after some time
      setTimeout(() => {
        lastLoggedStatus.delete(jobId);
      }, 5000); // Clean up after 5 seconds
    }

    res.json(response);
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Abort job
router.put("/:jobid/abort", auth.appendUser(), async (req, res) => {
  try {
    if (!req.params.jobid) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    if (!jobs.has(req.params.jobid)) {
      return res.status(404).json({ error: 'Job not found' });
    }

    db.read();
    const run = db.get("runs").find({ 
      username: req?.user?.userName, 
      run: req.params.jobid 
    }).value();

    if (!run) {
      return res.status(404).json({ error: 'Job not found' });
    }

    killJob(req.params.jobid);
    jobs.delete(req.params.jobid);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete job
router.delete("/:jobid", auth.appendUser(), async (req, res) => {
  try {
    if (!req.params.jobid) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    db.read();
    const run = db.get("runs").find({ 
      username: req?.user?.userName, 
      run: req.params.jobid 
    }).value();

    if (!run) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobs.has(req.params.jobid)) {
      killJob(req.params.jobid);
      jobs.delete(req.params.jobid);
    }

    await removeJobData(req.params.jobid);
    
    db.get("runs")
      .remove({ username: req?.user?.userName, run: req.params.jobid })
      .write();

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to manually collect logs for a job
router.post('/:jobid/logs', auth.appendUser(), async (req, res) => {
  try {
    const jobId = req.params.jobid;
    
    // Check if job exists in database
    const jobRecord = db.get('runs').find({ run: jobId }).value();
    
    if (!jobRecord) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Save parameters to file
    try {
      await saveParametersToFile(jobId, jobRecord.params);
    } catch (error) {
      console.error('Error saving parameters to file:', error);
    }
    
    // Get session ID and work directory
    const sessionId = jobRecord.session_id || getSessionId(jobRecord.userName, jobRecord.params);
    const workDir = path.join(config.PERSISTANT_ACCESS_PATH, 'work_dirs', sessionId);
    
    // Collect logs
    await collectLogFiles(jobId, workDir);
    
    res.status(200).json({ message: 'Logs collected successfully' });
  } catch (error) {
    console.error('Error collecting logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to list available logs for a job
router.get('/:jobid/logs', auth.appendUser(), async (req, res) => {
  try {
    const jobId = req.params.jobid;
    const logsDir = path.join(config.OUTPUT_PATH, jobId, 'output', 'logs');
    
    try {
      // Check if logs directory exists
      await fsPromises.access(logsDir, fs.constants.F_OK);
    } catch (error) {
      return res.status(404).json({ error: 'Logs directory not found', message: 'No logs available for this job' });
    }
    
    // Get list of log files
    const files = await fsPromises.readdir(logsDir);
    
    // Get file stats for each log
    const logFiles = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(logsDir, file);
        const stats = await fsPromises.stat(filePath);
        
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          path: `/api/phylonext/jobs/${jobId}/logs/${file}`
        };
      })
    );
    
    res.status(200).json({ logs: logFiles });
  } catch (error) {
    console.error('Error listing logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get a specific log file
router.get('/:jobid/logs/:filename', auth.appendUser(), async (req, res) => {
  try {
    const jobId = req.params.jobid;
    const filename = req.params.filename;
    const logPath = path.join(config.OUTPUT_PATH, jobId, 'output', 'logs', filename);
    
    try {
      // Check if log file exists
      await fsPromises.access(logPath, fs.constants.F_OK);
    } catch (error) {
      return res.status(404).json({ error: 'Log file not found' });
    }
    
    // Set content type based on file extension
    res.setHeader('Content-Type', 'text/plain');
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(logPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error retrieving log file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Hypothesis test endpoint
router.post("/:jobid/hypothesis-test", 
  auth.appendUser(),
  upload.fields([
    { name: 'referenceFile', maxCount: 1 },
    { name: 'testFile', maxCount: 1 },
    { name: 'referenceGeoJSON', maxCount: 1 },
    { name: 'testGeoJSON', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const jobId = req.params.jobid;
      console.log('\n=== HYPOTHESIS TEST REQUEST ===');
      console.log(`Job ID: ${jobId}`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`User: ${req.user?.userName}`);
      console.log('Files:', req.files);
      console.log('================================\n');

      // Check if job exists and belongs to user
      const jobRecord = db.get("runs")
        .find(run => 
          run.run === jobId && 
          (run.username === req?.user?.userName || run.userName === req?.user?.userName)
        )
        .value();

      if (!jobRecord) {
        console.error('Job not found or unauthorized:', {
          jobId,
          user: req?.user?.userName,
          foundJob: !!jobRecord
        });
        return res.status(404).json({ error: 'Job not found or unauthorized' });
      }

      // Create temp directory for processing files
      const tempDir = path.join(config.OUTPUT_PATH, jobId, 'temp');
      await fsPromises.mkdir(tempDir, { recursive: true });

      // Process reference area
      let referencePolygonPath;
      if (req.files.referenceFile && req.files.referenceFile[0]) {
        // Use uploaded file
        referencePolygonPath = req.files.referenceFile[0].path;
        console.log('Using uploaded reference file:', referencePolygonPath);
      } else if (req.files.referenceGeoJSON && req.files.referenceGeoJSON[0]) {
        // Use GeoJSON from form data
        referencePolygonPath = req.files.referenceGeoJSON[0].path;
        console.log('Using reference GeoJSON from form data:', referencePolygonPath);
      } else {
        return res.status(400).json({ error: 'Reference area not provided' });
      }

      // Process test area
      let testPolygonPath;
      if (req.files.testFile && req.files.testFile[0]) {
        // Use uploaded file
        testPolygonPath = req.files.testFile[0].path;
        console.log('Using uploaded test file:', testPolygonPath);
      } else if (req.files.testGeoJSON && req.files.testGeoJSON[0]) {
        // Use GeoJSON from form data
        testPolygonPath = req.files.testGeoJSON[0].path;
        console.log('Using test GeoJSON from form data:', testPolygonPath);
      } else {
        return res.status(400).json({ error: 'Test area not provided' });
      }

      // Run hypothesis test
      console.log('Running hypothesis test with:');
      console.log(`Reference polygon: ${referencePolygonPath}`);
      console.log(`Test polygon: ${testPolygonPath}`);

      // Update job status in database
      db.get("runs")
        .find({ run: jobId })
        .assign({ hypothesisTestStatus: 'running' })
        .write();

      // Run the hypothesis test asynchronously
      runHypothesisTest(jobId, referencePolygonPath, testPolygonPath)
        .then(results => {
          console.log('\n=== HYPOTHESIS TEST RESULTS ===');
          console.log(`Job ID: ${jobId}`);
          console.log('Results available');
          console.log('==============================\n');
          
          // Update job status in database
          db.get("runs")
            .find({ run: jobId })
            .assign({ 
              hypothesisTestStatus: 'completed',
              hypothesisTestCompleted: new Date().toISOString()
            })
            .write();
        })
        .catch(error => {
          console.error('\n=== HYPOTHESIS TEST ERROR ===');
          console.error(`Job ID: ${jobId}`);
          console.error(`Error: ${error.message}`);
          console.error('============================\n');
          
          // Update job status in database
          db.get("runs")
            .find({ run: jobId })
            .assign({ 
              hypothesisTestStatus: 'error',
              hypothesisTestError: error.message
            })
            .write();
        })
        .finally(() => {
          // Clean up temp files
          try {
            fsPromises.rm(tempDir, { recursive: true, force: true });
          } catch (error) {
            console.error('Error cleaning up temp files:', error);
          }
        });

      // Respond immediately with success
      res.status(200).json({ 
        message: 'Hypothesis test started successfully',
        jobId
      });
    } catch (error) {
      console.error('Error processing hypothesis test request:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get hypothesis test results
router.get("/:jobid/hypothesis-test/results", auth.appendUser(), async (req, res) => {
  try {
    const jobId = req.params.jobid;
    
    // Check if job exists and belongs to user
    const jobRecord = db.get("runs")
      .find(run => 
        run.run === jobId && 
        (run.username === req?.user?.userName || run.userName === req?.user?.userName)
      )
      .value();

    if (!jobRecord) {
      console.error('Job not found or unauthorized:', {
        jobId,
        user: req?.user?.userName,
        foundJob: !!jobRecord
      });
      return res.status(404).json({ error: 'Job not found or unauthorized' });
    }
    
    // Check if hypothesis test has been run
    if (!jobRecord.hypothesisTestStatus || jobRecord.hypothesisTestStatus !== 'completed') {
      return res.status(404).json({ 
        error: 'Hypothesis test results not available',
        status: jobRecord.hypothesisTestStatus || 'not_started'
      });
    }
    
    // Get results file paths
    const hypothesisDir = path.join(config.OUTPUT_PATH, jobId, 'output', '03.Hypothesis_tests');
    const diversityResultsPath = path.join(hypothesisDir, 'HypTest_diversity.txt');
    const originalityResultsPath = path.join(hypothesisDir, 'HypTest_species_originalities.txt');
    
    try {
      // Check if results files exist
      await fsPromises.access(diversityResultsPath, fs.constants.F_OK);
      await fsPromises.access(originalityResultsPath, fs.constants.F_OK);
      
      // Read diversity results
      const diversityResults = await fsPromises.readFile(diversityResultsPath, 'utf8');
      
      // Parse tab-delimited file
      const lines = diversityResults.trim().split('\n');
      const headers = lines[0].split('\t');
      const values = lines[1].split('\t');
      
      const parsedResults = {};
      headers.forEach((header, index) => {
        parsedResults[header] = values[index];
      });
      
      res.json({
        status: 'completed',
        results: parsedResults,
        rawData: diversityResults
      });
    } catch (error) {
      console.error('Error reading hypothesis test results:', error);
      res.status(404).json({ 
        error: 'Hypothesis test results files not found',
        message: error.message
      });
    }
  } catch (error) {
    console.error('Error getting hypothesis test results:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get hypothesis test status
router.get("/:jobid/hypothesis-test/status", auth.appendUser(), async (req, res) => {
  try {
    const jobId = req.params.jobid;
    
    // Check if job exists and belongs to user
    const jobRecord = db.get("runs")
      .find(run => 
        run.run === jobId && 
        (run.username === req?.user?.userName || run.userName === req?.user?.userName)
      )
      .value();

    if (!jobRecord) {
      console.error('Job not found or unauthorized:', {
        jobId,
        user: req?.user?.userName,
        foundJob: !!jobRecord
      });
      return res.status(404).json({ error: 'Job not found or unauthorized' });
    }
    
    res.json({
      status: jobRecord.hypothesisTestStatus || 'not_started',
      completed: jobRecord.hypothesisTestCompleted,
      error: jobRecord.hypothesisTestError
    });
  } catch (error) {
    console.error('Error getting hypothesis test status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 