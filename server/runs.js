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

// Constants
const NEXTFLOW = config.NEXTFLOW;
const jobs = new Map();

const ALLOWED_PARAMS = [
  "phytree", "phylabels", "taxgroup", "phylum", "classis", "order",
  "family", "genus", "country", "latmin", "latmax", "lonmin", "lonmax",
  "minyear", "maxyear", "noextinct", "roundcoords", "h3resolution",
  "dbscan", "dbscannoccurrences", "dbscanepsilon", "dbscanminpts",
  "wgsrpd", "regions", "indices", "randname", "iterations", "terrestrial",
  "rmcountrycentroids", "rmcountrycapitals", "rmurban", "basisofrecordinclude",
  "basisofrecordexclude", "leaflet_var", "randconstrain", "polygon"
];

const FILE_MAPPINGS = {
  terrestrial: "Land_Buffered_025_dgr.RData",
  rmcountrycentroids: "CC_CountryCentroids_buf_1000m.RData",
  rmcountrycapitals: "CC_Capitals_buf_10000m.RData",
  rmurban: "CC_Urban.RData",
  wgsrpd: "WGSRPD.RData"
};

// Helper functions
async function zipRun(runid) {
  try {
    await new Promise((resolve, reject) => {
      child_process.exec(
        `zip -r ${config.OUTPUT_PATH}/${runid}/${runid}.zip output/*`,
        { cwd: `${config.OUTPUT_PATH}/${runid}` },
        (err) => err ? reject(err) : resolve()
      );
    });
  } catch (error) {
    console.error('Error zipping run:', error);
    throw error;
  }
}

function processStdout(data) {
  const lines = data.reduce((acc, e) => [...acc, ...e.split("\n")], []);
  const idx = lines.findIndex(e => e.startsWith("executor >"));
  if (idx > -1) {
    const index = idx - 1;
    let first = lines.slice(0, idx);
    let rest = lines.slice(index);
    let executor = "";
    const process = new Map();
    let resultLine = "\n";
    
    rest.forEach((p) => {
      if (p.startsWith("executor >")) {
        executor = p;
      } else if (p.indexOf("process > ") > -1 && !p.startsWith('Error')) {
        let splitted = p.split(" process > ");
        process.set(splitted[1].split(" ")[0], p);
      } else if (p) {
        resultLine += `${p}\n`;
      }
    });

    return [...first.filter((l) => !!l && l !== "\n").map(l => `${l}\n`), executor, ...process.values(), resultLine];
  }
  return data;
}

function killJob(jobId) {
  if (jobs.has(jobId)) {
    console.log("Job found");
    const job = jobs.get(jobId);
    if (typeof job?.processRef?.kill === 'function') {
      console.log("Sending SIGINT to process");
      job?.processRef?.kill('SIGINT');
      return "Job killed";
    }
  }
  return "Job not found";
}

async function removeJobData(jobId) {
  const jobDir = `${config.OUTPUT_PATH}/${jobId}`;
  await fs.rm(jobDir, { recursive: true, force: true });
}

// Routes
router.get("/running", (req, res) => {
  try {
    const running = [...jobs.keys()];
    res.json(running);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", 
  auth.appendUser(),
  upload.fields([
    { name: 'polygon', maxCount: 1 },
    { name: 'randconstrain', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const jobDir = `${config.OUTPUT_PATH}/${req.id}`;
      const workingDir = `${jobDir}/work`;
      const outputDir = `${jobDir}/output`;
      
      await fs.mkdir(outputDir, { recursive: true });
      
      let body = JSON.parse(req.body.data);
      
      if(_.get(req, 'files.polygon[0].filename')) {
        body.polygon = `${outputDir}/${req.files.polygon[0].filename}`;
      }
      
      if(_.get(req, 'files.randconstrain[0].filename')) {
        body.randconstrain = `${outputDir}/${req.files.randconstrain[0].filename}`;
      }
      
      const fileParams = Object.keys(FILE_MAPPINGS).reduce((acc, curr) => {
        acc[curr] = _.get(body, curr) === true ? `${config.PIPELINE_DATA}/${FILE_MAPPINGS[curr]}` : false;
        return acc;
      }, {});

      if (body.phytree) {
        await fs.writeFile(
          `${outputDir}/input_tree.nwk`,
          body.phytree,
          "utf-8"
        );
        await pushJob({
          username: req?.user?.userName,
          req_id: req.id,
          params: { ...body, phytree: `${outputDir}/input_tree.nwk`, ...fileParams },
          res,
        });
      } else if (body.prepared_phytree) {
        await fs.copyFile(
          `${config.TEST_DATA}/phy_trees/${body.prepared_phytree}`,
          `${outputDir}/input_tree.nwk`
        );
        await pushJob({
          username: req?.user?.userName,
          req_id: req.id,
          params: { ...body, phytree: `${outputDir}/input_tree.nwk`, ...fileParams },
          phylabels: "OTT",
          res,
        });
      } else {
        await pushJob({
          username: req?.user?.userName,
          req_id: req.id,
          params: { ...body, ...fileParams },
          res,
        });
      }
      
      res.status(200).json({ jobid: req.id });
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ error: error.message });
    }
});

// Job queue processing
const jobQueue = async.queue(async function(task, callback) {
  try {
    const { username, req_id, params } = task;
    
    // Process job...
    // Add your job processing logic here
    
    callback();
  } catch (error) {
    callback(error);
  }
}, config.CONCURRENT_RUNS_ALLOWED || 3);

module.exports = router;
