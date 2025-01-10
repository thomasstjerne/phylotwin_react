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
    
    // Generate session ID based on core parameters
    const sessionId = getSessionId(username, params);
    
    // Create run-specific directories
    const runDir = path.join(config.OUTPUT_PATH, req_id);
    const outputDir = path.join(runDir, 'output');
    const workDir = path.join(WORK_DIR_BASE, sessionId);
    
    // Process diversity indices based on their module
    const mainIndices = [];
    const biodiverseIndices = [];
    
    // Load diversity indices vocabulary
    const diversityIndices = require('../../shared/vocabularies/diversityIndices.json');
    const allIndices = diversityIndices.groups.flatMap(group => group.indices);
    
    // Sort selected indices into their respective modules
    params.selectedDiversityIndices?.forEach(selectedId => {
      const index = allIndices.find(i => i.id === selectedId);
      if (index) {
        if (index.module === 'main') {
          mainIndices.push(index.commandName);
        } else if (index.module === 'biodiverse') {
          biodiverseIndices.push(index.commandName);
        }
      }
    });
    
    // Create modified params object with correctly formatted diversity indices
    const modifiedParams = {
      ...params,
      div: mainIndices.length > 0 ? mainIndices : undefined,
      bd_indices: biodiverseIndices.length > 0 ? biodiverseIndices : undefined
    };
    
    // Delete the original selectedDiversityIndices to avoid confusion
    delete modifiedParams.selectedDiversityIndices;
    
    // Build profile array from modified params
    const profile = [];
    Object.keys(modifiedParams)
      .filter((p) => ALLOWED_PARAMS.includes(p))
      .forEach((key) => {
        if (Array.isArray(modifiedParams[key])) {
          profile.push(`--${key}`, modifiedParams[key].join(","));
        } else if (modifiedParams[key] !== undefined) {
          profile.push(`--${key}`, modifiedParams[key]);
        }
      });
    
    // Construct nextflow parameters
    const nextflowParams = [
      'run',
      'vmikk/phylotwin',
      '-resume',
      '-profile', 'docker',
      '-work-dir', workDir,
      '--input', config.INPUT_PATH,
      '--outdir', outputDir,
      ...profile,
    ];

    const fullCommand = `${NEXTFLOW} ${nextflowParams.join(' ')}`;
    
    // Update database with session info
    db.get("runs")
      .push({
        username: options?.username,
        run: options.req_id,
        session_id: sessionId,
        started: new Date().toISOString(),
        ...options.params,
        nextflow_command: fullCommand
      })
      .write();

    // Spawn process with working directory set to run directory
    const pcs = child_process.spawn(NEXTFLOW, nextflowParams, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: runDir // Set working directory for the process
    });

    // ... rest of the existing process handling code ...
  } catch (error) {
    console.error('Fatal error in startJob:', error);
    throw error;
  }
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