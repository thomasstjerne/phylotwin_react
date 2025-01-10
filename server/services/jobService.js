const child_process = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const db = require('../db');
const logger = require('../utils/logger');

// Constants
const NEXTFLOW = config.NEXTFLOW;
const jobs = new Map();

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

async function startJob(options) {
  try {
    console.log('Starting job with options:', options);
    
    const { username, req_id, params } = options;
    if (!username || !req_id || !params) {
      throw new Error('Missing required job parameters');
    }

    // Verify nextflow exists
    try {
      await fs.access(config.NEXTFLOW, fs.constants.X_OK);
    } catch (error) {
      throw new Error(`Nextflow not found or not executable at ${config.NEXTFLOW}`);
    }

    const outputDir = `${config.OUTPUT_PATH}/${req_id}/output`;
    
    // Verify input file exists
    try {
      await fs.access(config.INPUT_PATH, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`Input file not found or not readable at ${config.INPUT_PATH}`);
    }

    const profile = [];
    Object.keys(params)
      .filter((p) => ALLOWED_PARAMS.includes(p))
      .forEach((key) => {
        if (Array.isArray(params[key])) {
          profile.push(`--${key}`, params[key].join(","));
        } else {
          profile.push(`--${key}`, params[key]);
        }
      });

    // Log the complete configuration
    console.log('Job configuration:', {
      outputDir,
      params,
      profile
    });

    const nextflowParams = [
      'run',
      'vmikk/phylotwin',
      '-resume',
      '-profile',
      'docker',
      '--input',
      config.INPUT_PATH,
      '--outdir',
      outputDir,
      ...profile,
    ];

    // Log the complete nextflow command
    console.log('Prepared nextflow command:', {
      command: NEXTFLOW,
      params: nextflowParams.join(' ')
    });

    return new Promise((resolve, reject) => {
      try {
        db.read();
        db.get("runs")
          .push({
            username: options?.username,
            run: options.req_id,
            started: new Date().toISOString(),
            ...options.params,
          })
          .write();

        jobs.set(options.req_id, { stdout: [], stderr: [] });

        const pcs = child_process.spawn(NEXTFLOW, nextflowParams, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        pcs.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('Nextflow output:', output);
          
          if (jobs.has(options.req_id)) {
            const prev = jobs.get(options.req_id);
            jobs.set(options.req_id, {
              ...prev,
              processRef: pcs,
              stdout: processStdout([...prev.stdout, output]),
            });
          } else {
            jobs.set(options.req_id, { 
              stdout: [output], 
              stderr: [], 
              processRef: pcs 
            });
          }
        });

        pcs.stderr.on('data', (data) => {
          const error = data.toString();
          console.error('Nextflow error:', error);
          
          if (jobs.has(options.req_id)) {
            const prev = jobs.get(options.req_id);
            jobs.set(options.req_id, {
              ...prev,
              processRef: pcs,
              stderr: [...prev.stderr, error],
            });
          } else {
            jobs.set(options.req_id, { 
              stderr: [error], 
              stdout: [], 
              processRef: pcs 
            });
          }
        });

        pcs.on('error', (error) => {
          console.error('Error running job:', error);
          reject(error);
        });

        pcs.on('close', async (code) => {
          console.log(`Job ${options.req_id} finished with code ${code}`);
          try {
            jobs.delete(options.req_id);
            await zipRun(options.req_id);
            resolve();
          } catch (error) {
            console.error('Error in job cleanup:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.error('Error in startJob:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('Fatal error in startJob:', error);
    throw error;
  }
}

module.exports = {
  jobs,
  killJob,
  removeJobData,
  startJob,
  ALLOWED_PARAMS,
}; 