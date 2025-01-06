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
    if (!req.params.jobid) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    if (jobs.has(req.params.jobid)) {
      const data = jobs.get(req.params.jobid);
      return res.json(data);
    }

    try {
      await fs.readdir(`${config.OUTPUT_PATH}/${req.params.jobid}/output/`);
      const run = db.get("runs").find({ run: req.params.jobid }).value() || {};
      res.json({ ...run, completed: true });
    } catch (error) {
      res.status(404).json({ error: 'Job not found' });
    }
  } catch (error) {
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