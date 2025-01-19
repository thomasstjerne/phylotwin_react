const child_process = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const db = require('../db');
const logger = require('../utils/logger');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Constants
const NEXTFLOW = config.NEXTFLOW;
const jobs = new Map();

// Add new constants for work directories
const WORK_DIR_BASE = path.join(config.PERSISTANT_ACCESS_PATH, 'work_dirs');
const SESSION_TIMEOUT = 1000 * 60 * 60 * 24; // 24 hours in milliseconds

const ALLOWED_PARAMS = [
  "tree",           // phylogenetic tree file
  "resolution",     // spatial resolution (H3)
  "country",        // country codes
  "polygon",        // custom polygon file or drawn polygon
  "phylum",         // taxonomic filters
  "classs",         // taxonomic filters (note the three 's')
  "order",          // taxonomic filters
  "family",         // taxonomic filters
  "genus",          // taxonomic filters
  "specieskeys",    // species keys file
  "basis_of_record", // record filtering mode
  "minyear",        // collection year range
  "maxyear",        // collection year range
  "div",            // diversity indices (main module)
  "bd_indices",     // diversity indices (biodiverse module)
  "rnd"             // number of randomizations
];

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
    logger.error('Error zipping run:', error);
    throw error;
  }
}

// Function to log file contents for debugging
async function logFileContents(filePath, description) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    console.log(`\n${description} (${filePath}):`);
    console.log(content);
  } catch (error) {
    console.error(`Error reading ${description}:`, error);
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

// Add helper to generate/get session ID
function getSessionId(username, params) {
  // Create a stable hash from the core parameters that define a "session"
  // We only include parameters that would affect the core workflow
  const coreParams = {
    tree: params.tree,
    resolution: params.resolution,
    country: params.country,
    polygon: params.polygon,
    // ?? add some other core parameters that would affect the whole pipeline ??
  };
  
  const hash = crypto
    .createHash('md5')
    .update(`${username}-${JSON.stringify(coreParams)}`)
    .digest('hex')
    .slice(0, 12);
    
  return hash;
}

async function startJob(options) {
  try {
    const { username, req_id, params } = options;
    
    console.log('\n=== INITIALIZING ANALYSIS ===');
    console.log(`Job ID: ${req_id}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('Parameters:', JSON.stringify(params, null, 2));
    console.log('============================\n');
    
    // Generate session ID and create directories
    const sessionId = getSessionId(username, params);
    const runDir = path.join(config.OUTPUT_PATH, req_id);
    const outputDir = path.join(runDir, 'output');
    const workDir = path.join(WORK_DIR_BASE, sessionId);
    
    // Process parameters and construct command
    const nextflowParams = constructNextflowParams(params, outputDir, workDir);
    const fullCommand = `${NEXTFLOW} ${nextflowParams.join(' ')}`;
    
    // Update database with initial job info
    db.get("runs")
      .push({
        userName: username,
        run: req_id,
        session_id: sessionId,
        status: 'running',
        started: new Date().toISOString(),
        params,
        nextflow_command: fullCommand
      })
      .write();

    console.log('\n=== STARTING PIPELINE ===');
    console.log(`Job ID: ${req_id}`);
    console.log(`Command: ${fullCommand}`);
    console.log('=======================\n');

    // Spawn process
    const pcs = child_process.spawn(NEXTFLOW, nextflowParams, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: runDir
    });

    // Handle process events
    pcs.on('exit', (code, signal) => {
      const status = code === 0 ? 'completed' : 'error';
      console.log(`\n=== PIPELINE ${status.toUpperCase()} ===`);
      console.log(`Job ID: ${req_id}`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`Exit code: ${code}`);
      if (signal) console.log(`Signal: ${signal}`);
      console.log('='.repeat(status.length + 16), '\n');

      // Update job status
      const job = jobs.get(req_id);
      if (job) {
        job.status = status;
        jobs.set(req_id, job);
      }

      // Update database
      db.get("runs")
        .find({ run: req_id })
        .assign({ 
          status,
          completed: new Date().toISOString(),
          exitCode: code,
          signal
        })
        .write();
    });

    pcs.on('error', (err) => {
      console.error('\n=== PIPELINE ERROR ===');
      console.error(`Job ID: ${req_id}`);
      console.error(`Time: ${new Date().toISOString()}`);
      console.error('Error:', err.message);
      console.error('===================\n');

      // Update job status
      const job = jobs.get(req_id);
      if (job) {
        job.status = 'error';
        job.error = err.message;
        jobs.set(req_id, job);
      }

      // Update database
      db.get("runs")
        .find({ run: req_id })
        .assign({ 
          status: 'error',
          completed: new Date().toISOString(),
          error: err.message
        })
        .write();
    });

    // Store process reference
    jobs.set(req_id, {
      processRef: pcs,
      status: 'running',
      stdout: [],
      stderr: [],
      started: new Date().toISOString()
    });

  } catch (error) {
    console.error('\n=== INITIALIZATION ERROR ===');
    console.error(`Job ID: ${req_id}`);
    console.error(`Time: ${new Date().toISOString()}`);
    console.error('Error:', error.message);
    console.error('=========================\n');
    throw error;
  }
}

// Helper function to construct nextflow parameters
function constructNextflowParams(params, outputDir, workDir) {
  const profile = [];
  Object.keys(params)
    .filter((p) => ALLOWED_PARAMS.includes(p))
    .forEach((key) => {
      if (key === 'div' || key === 'bd_indices') {
        if (params[key] && params[key].length > 0) {
          profile.push(`--${key}`, params[key].join(','));
        }
      } else if (Array.isArray(params[key])) {
        profile.push(`--${key}`, params[key].join(','));
      } else if (params[key] !== undefined && params[key] !== '') {
        profile.push(`--${key}`, params[key]);
      }
    });

  // TODO: update the command for production, add Docker profile
  return [
    'run',
    '/mnt/Data/Dropbox/Proj/BioDT/phylotwin/main.nf',
    '-resume',
    '--occ', config.INPUT_PATH,
    '--outdir', outputDir,
    '-work-dir', workDir,
    '-profile', 'singularity',
    '--noviz', 'true',
    ...profile,
  ];
}

// Add cleanup function for old work directories
async function cleanupOldWorkDirs() {
  try {
    const now = Date.now();
    const dirs = await fs.readdir(WORK_DIR_BASE);
    
    for (const dir of dirs) {
      const dirPath = path.join(WORK_DIR_BASE, dir);
      const stats = await fs.stat(dirPath);
      
      // Remove directories older than SESSION_TIMEOUT
      if (now - stats.mtime.getTime() > SESSION_TIMEOUT) {
        await fs.rm(dirPath, { recursive: true, force: true });
        console.log(`Cleaned up old work directory: ${dirPath}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up work directories:', error);
  }
}

// Run cleanup periodically, in milliseconds
setInterval(cleanupOldWorkDirs, 7 * 24 * 60 * 60 * 1000);  // once a week

module.exports = {
  jobs,
  killJob,
  removeJobData,
  startJob,
  ALLOWED_PARAMS,
  getSessionId,
  cleanupOldWorkDirs,
}; 