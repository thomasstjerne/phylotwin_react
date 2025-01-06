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
    { name: 'randconstrain', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const jobDir = `${config.OUTPUT_PATH}/${req.id}`;
      const outputDir = `${jobDir}/output`;
      
      await fs.mkdir(outputDir, { recursive: true });
      
      let body = JSON.parse(req.body.data);
      
      if(_.get(req, 'files.polygon[0].filename')) {
        body.polygon = `${outputDir}/${req.files.polygon[0].filename}`;
      }
      
      if(_.get(req, 'files.randconstrain[0].filename')) {
        body.randconstrain = `${outputDir}/${req.files.randconstrain[0].filename}`;
      }

      if (body.phytree) {
        await fs.writeFile(
          `${outputDir}/input_tree.nwk`,
          body.phytree,
          "utf-8"
        );
        await startJob({
          username: req?.user?.userName,
          req_id: req.id,
          params: { ...body, phytree: `${outputDir}/input_tree.nwk` }
        });
      } else if (body.prepared_phytree) {
        await fs.copyFile(
          `${config.TEST_DATA}/phy_trees/${body.prepared_phytree}`,
          `${outputDir}/input_tree.nwk`
        );
        await startJob({
          username: req?.user?.userName,
          req_id: req.id,
          params: { 
            ...body, 
            phytree: `${outputDir}/input_tree.nwk`,
            phylabels: "OTT"
          }
        });
      } else {
        await startJob({
          username: req?.user?.userName,
          req_id: req.id,
          params: body
        });
      }
      
      res.status(200).json({ jobid: req.id });
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ error: error.message });
    }
});

module.exports = router; 