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
  logger.group(`\nStarting job: ${options.req_id}`);
  logger.debug('Job options:', JSON.stringify(options, null, 2));
  
  jobs.set(options.req_id, { stdout: [], stderr: [] });
  
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

    const params = options.params;
    const jobDir = `${config.OUTPUT_PATH}/${options.req_id}`;
    const workingDir = `${jobDir}/work`;
    const outputDir = `${jobDir}/output`;

    logger.debug('\nJob directories:');
    logger.debug('Job directory:', jobDir);
    logger.debug('Working directory:', workingDir);
    logger.debug('Output directory:', outputDir);

    // Log input parameters
    logger.debug('\nInput parameters:', JSON.stringify(params, null, 2));

    // If there's a polygon file, log its contents
    if (params.polygon) {
      await logger.logFileContents(fs, params.polygon, 'Polygon file contents');
    }

    let profile = [];
    Object.keys(params)
      .filter((p) => ALLOWED_PARAMS.includes(p))
      .forEach((key) => {
        if (Array.isArray(params[key])) {
          profile = [...profile, `--${key}`, params[key].join(",")];
        } else {
          profile = [...profile, `--${key}`, params[key]];
        }
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
    logger.debug('\nPrepared nextflow command:');
    logger.debug(NEXTFLOW, nextflowParams.join(' '));
    logger.groupEnd();

    return new Promise((resolve, reject) => {
      try {
        const pcs = child_process.spawn(NEXTFLOW, nextflowParams, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        pcs.stdout.on('data', (data) => {
          const output = data.toString();
          logger.debug('Nextflow output:', output);
          
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
          logger.error('Nextflow error:', error);
          
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
          logger.error('Error running job:', error);
          reject(error);
        });

        pcs.on('close', async (code) => {
          logger.debug(`Job ${options.req_id} finished with code ${code}`);
          try {
            jobs.delete(options.req_id);
            await zipRun(options.req_id);
            resolve();
          } catch (error) {
            logger.error('Error in job cleanup:', error);
            reject(error);
          }
        });
      } catch (error) {
        logger.error('Error spawning process:', error);
        reject(error);
      }
    });
  } catch (error) {
    logger.error('Error in startJob:', error);
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