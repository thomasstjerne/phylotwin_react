const child_process = require('child_process');
const fs = require('fs').promises;
const config = require('../config');
const db = require('../db');

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

async function startJob(options) {
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

    console.log('Starting job with params:', nextflowParams);

    return new Promise((resolve, reject) => {
      try {
        const pcs = child_process.spawn(NEXTFLOW, nextflowParams, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        pcs.stdout.on('data', (data) => {
          if (jobs.has(options.req_id)) {
            const prev = jobs.get(options.req_id);
            jobs.set(options.req_id, {
              ...prev,
              processRef: pcs,
              stdout: processStdout([...prev.stdout, data.toString()]),
            });
          } else {
            jobs.set(options.req_id, { 
              stdout: [data.toString()], 
              stderr: [], 
              processRef: pcs 
            });
          }
        });

        pcs.stderr.on('data', (data) => {
          if (jobs.has(options.req_id)) {
            const prev = jobs.get(options.req_id);
            jobs.set(options.req_id, {
              ...prev,
              processRef: pcs,
              stderr: [...prev.stderr, data.toString()],
            });
          } else {
            jobs.set(options.req_id, { 
              stderr: [data.toString()], 
              stdout: [], 
              processRef: pcs 
            });
          }
        });

        pcs.on('error', (error) => {
          console.error('Error running job:', error);
          reject(error);
        });

        pcs.on('close', async () => {
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
        console.error('Error spawning process:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('Error in startJob:', error);
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