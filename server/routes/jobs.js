const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const fsPromises = require('fs').promises;
const config = require('../config');
const auth = require('../Auth/auth');
const { jobs, killJob, removeJobData, collectLogFiles, getSessionId, saveParametersToFile } = require('../services/jobService');
const path = require('path');

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

module.exports = router; 