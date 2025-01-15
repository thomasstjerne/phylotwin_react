const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs').promises;
const config = require('../config');
const auth = require('../Auth/auth');
const { jobs, killJob, removeJobData } = require('../services/jobService');

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

    // Only log status changes and final states
    if (response.status === 'completed' || response.status === 'error') {
      console.log(`\n=== JOB ${response.status.toUpperCase()} ===`);
      console.log(`Job ID: ${jobId}`);
      console.log(`Time: ${new Date().toISOString()}`);
      if (response.exitCode) console.log(`Exit code: ${response.exitCode}`);
      if (response.error) console.log(`Error: ${response.error}`);
      if (response.signal) console.log(`Signal: ${response.signal}`);
      console.log('='.repeat(response.status.length + 10), '\n');
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

module.exports = router; 