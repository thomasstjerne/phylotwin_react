const child_process = require('child_process');
const fs = require('fs');                   // for streams
const fsPromises = require('fs').promises;  // for async operations
const path = require('path');
const config = require('../config');
const db = require('../db');
const logger = require('../utils/logger');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { glob } = require('glob');
const util = require('util');

// Constants
const NEXTFLOW = config.NEXTFLOW;
const jobs = new Map();

// Constants for work directories
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
  "specieslist",    // path to species list file
  "basis_of_record", // record filtering mode
  "minyear",        // collection year range
  "maxyear",        // collection year range
  "div",            // diversity indices (main module)
  "bd_indices",     // diversity indices (biodiverse module)
  "rnd",            // number of randomizations
  "recordFilteringMode",  // specimen/observation mode for data path
  "outlierSensitivity",   // outlier removal sensitivity for data path
  "spatialResolution"     // H3 resolution for data path
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
    const content = await fsPromises.readFile(filePath, 'utf8');
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
  await fsPromises.rm(jobDir, { recursive: true, force: true });
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

// Function to collect and organize log files after Nextflow execution
async function collectLogFiles(jobId, workDir) {
  try {
    console.log('\n=== COLLECTING LOG FILES ===');
    console.log(`Job ID: ${jobId}`);
    console.log(`Work Directory: ${workDir}`);
    
    // Check if work directory exists
    try {
      await fsPromises.access(workDir, fs.constants.F_OK);
    } catch (error) {
      console.error(`Work directory does not exist: ${workDir}`);
      console.error(`Error: ${error.message}`);
      // Continue with the function to at least try to copy the logs from the run directory
    }
    
    const runDir = path.join(config.OUTPUT_PATH, jobId);
    const outputDir = path.join(runDir, 'output');
    const logsDir = path.join(outputDir, 'logs');
    
    // Create logs directory
    await fsPromises.mkdir(logsDir, { recursive: true });
    
    // Copy .nextflow.log and nf_execution.log to logs directory
    const nextflowLogSrc = path.join(runDir, '.nextflow.log');
    const executionLogSrc = path.join(runDir, 'nf_execution.log');
    const nextflowLogDest = path.join(logsDir, 'nextflow.log');
    const executionLogDest = path.join(logsDir, 'nf_execution.log');
    
    // Copy files if they exist
    try {
      await fsPromises.access(nextflowLogSrc, fs.constants.F_OK);
      await fsPromises.copyFile(nextflowLogSrc, nextflowLogDest);
      console.log(`Copied ${nextflowLogSrc} to ${nextflowLogDest}`);
    } catch (error) {
      console.error(`Error copying .nextflow.log: ${error.message}`);
    }
    
    try {
      await fsPromises.access(executionLogSrc, fs.constants.F_OK);
      await fsPromises.copyFile(executionLogSrc, executionLogDest);
      console.log(`Copied ${executionLogSrc} to ${executionLogDest}`);
    } catch (error) {
      console.error(`Error copying nf_execution.log: ${error.message}`);
    }
    
    // Parse nf_execution.log to find process IDs
    let executionLogContent;
    try {
      await fsPromises.access(executionLogSrc, fs.constants.F_OK);
      executionLogContent = await fsPromises.readFile(executionLogSrc, 'utf8');
    } catch (error) {
      console.error(`Error reading nf_execution.log: ${error.message}`);
      console.log('=== LOG COLLECTION COMPLETE (PARTIAL) ===\n');
      return;
    }
    
    // Extract process IDs from log
    const processRegex = /\[([a-z0-9]{2}\/[a-z0-9]{6})\] Submitted process > (.+?)( \(\d+\))?$/gm;
    const processes = [];
    let match;
    
    while ((match = processRegex.exec(executionLogContent)) !== null) {
      processes.push({
        id: match[1],
        name: match[2].replace(/\s+\(\d+\)$/, ''), // Remove trailing (N) if present
        shortId: match[1].replace('/', '_')
      });
    }
    
    console.log(`Found ${processes.length} processes in execution log`);
    
    // Check if work directory exists before trying to find log files
    let workDirExists = true;
    try {
      await fsPromises.access(workDir, fs.constants.F_OK);
    } catch (error) {
      console.error(`Work directory does not exist: ${workDir}`);
      workDirExists = false;
    }
    
    if (!workDirExists) {
      console.log('Skipping process log collection as work directory does not exist');
      console.log('=== LOG COLLECTION COMPLETE (PARTIAL) ===\n');
      return;
    }
    
    // Find all process directories in the work directory
    // This is more reliable than using glob with partial IDs
    const findProcessDirs = async () => {
      try {
        // Get all first-level directories (hash prefixes)
        const firstLevelDirs = await fsPromises.readdir(workDir);
        
        // Process directories structure
        const processDirs = [];
        
        // For each first-level directory, find matching process directories
        for (const firstDir of firstLevelDirs) {
          const firstDirPath = path.join(workDir, firstDir);
          
          // Skip if not a directory
          try {
            const stats = await fsPromises.stat(firstDirPath);
            if (!stats.isDirectory()) continue;
          } catch (error) {
            continue;
          }
          
          // Get second-level directories
          try {
            const secondLevelDirs = await fsPromises.readdir(firstDirPath);
            
            for (const secondDir of secondLevelDirs) {
              const fullPath = path.join(firstDirPath, secondDir);
              
              // Skip if not a directory
              try {
                const stats = await fsPromises.stat(fullPath);
                if (!stats.isDirectory()) continue;
              } catch (error) {
                continue;
              }
              
              // Check if .command.out exists in this directory
              const commandOutPath = path.join(fullPath, '.command.out');
              try {
                await fsPromises.access(commandOutPath, fs.constants.F_OK);
                processDirs.push({
                  path: fullPath,
                  id: `${firstDir}/${secondDir}`,
                  logFile: commandOutPath
                });
              } catch (error) {
                // .command.out doesn't exist, skip
              }
            }
          } catch (error) {
            console.error(`Error reading directory ${firstDirPath}:`, error.message);
          }
        }
        
        return processDirs;
      } catch (error) {
        console.error('Error finding process directories:', error.message);
        return [];
      }
    };
    
    // Find all process directories
    const processDirs = await findProcessDirs();
    console.log(`Found ${processDirs.length} process directories with log files`);
    
    // Match process directories to processes from the execution log
    let matchedCount = 0;
    for (const process of processes) {
      const [prefix, hash] = process.id.split('/');
      
      // Find matching process directory
      const matchingDirs = processDirs.filter(dir => {
        const dirId = dir.id;
        return dirId.startsWith(`${prefix}/`) && dirId.includes(hash);
      });
      
      if (matchingDirs.length > 0) {
        // Use the first matching directory
        const matchingDir = matchingDirs[0];
        const sourcePath = matchingDir.logFile;
        const destPath = path.join(logsDir, `${process.shortId}_${process.name}.log`);
        
        try {
          await fsPromises.copyFile(sourcePath, destPath);
          console.log(`Copied ${sourcePath} to ${destPath}`);
          matchedCount++;
        } catch (error) {
          console.error(`Error copying log for process ${process.id}: ${error.message}`);
        }
      } else {
        console.warn(`No matching directory found for process ${process.id} (${process.name})`);
        
        // Try using glob as a fallback
        try {
          const pattern = path.join(workDir, `${prefix}*/${hash}*/.command.out`);
          const files = await glob(pattern);
          
          if (files.length > 0) {
            const sourcePath = files[0];
            const destPath = path.join(logsDir, `${process.shortId}_${process.name}.log`);
            
            try {
              await fsPromises.copyFile(sourcePath, destPath);
              console.log(`Copied ${sourcePath} to ${destPath} (using glob fallback)`);
              matchedCount++;
            } catch (error) {
              console.error(`Error copying log for process ${process.id}: ${error.message}`);
            }
          } else {
            console.warn(`No log file found for process ${process.id} using glob fallback`);
          }
        } catch (error) {
          console.error(`Error finding log for process ${process.id} using glob: ${error.message}`);
        }
      }
    }
    
    console.log(`Successfully copied logs for ${matchedCount} out of ${processes.length} processes`);
    console.log('=== LOG COLLECTION COMPLETE ===\n');
  } catch (error) {
    console.error('Error collecting log files:', error);
  }
}

// Function to save pipeline parameters to a JSON file
async function saveParametersToFile(jobId, params) {
  try {
    console.log('\n=== SAVING PIPELINE PARAMETERS ===');
    console.log(`Job ID: ${jobId}`);
    
    const runDir = path.join(config.OUTPUT_PATH, jobId);
    const outputDir = path.join(runDir, 'output');
    const logsDir = path.join(outputDir, 'logs');
    
    // Create logs directory if it doesn't exist
    await fsPromises.mkdir(logsDir, { recursive: true });
    
    // Filter parameters to include only those in ALLOWED_PARAMS
    const filteredParams = {};
    Object.keys(params).forEach(key => {
      if (ALLOWED_PARAMS.includes(key)) {
        filteredParams[key] = params[key];
      }
    });
    
    // Add timestamp and nextflow command
    const paramsWithMetadata = {
      timestamp: new Date().toISOString(),
      parameters: filteredParams
    };
    
    // Get the full nextflow command if available
    const jobRecord = db.get("runs").find({ run: jobId }).value();
    if (jobRecord && jobRecord.nextflow_command) {
      paramsWithMetadata.nextflow_command = jobRecord.nextflow_command;
    }
    
    // Save to JSON file
    const paramsFilePath = path.join(logsDir, 'pipeline_parameters.json');
    await fsPromises.writeFile(
      paramsFilePath, 
      JSON.stringify(paramsWithMetadata, null, 2)
    );
    
    console.log(`Parameters saved to ${paramsFilePath}`);
    console.log('=== PARAMETERS SAVED ===\n');
    
    return paramsFilePath;
  } catch (error) {
    console.error('Error saving pipeline parameters:', error);
  }
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
    
    // Create directories using fsPromises
    await fsPromises.mkdir(runDir, { recursive: true });
    await fsPromises.mkdir(outputDir, { recursive: true });
    await fsPromises.mkdir(workDir, { recursive: true });
    
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

    // Create write stream for logging stdout
    const logFile = path.join(runDir, 'nf_execution.log');
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    // Capture stdout
    pcs.stdout.on('data', (data) => {
      // Write to log file
      logStream.write(data);
      
      // Keep existing stdout processing if needed
      const job = jobs.get(options.req_id);
      if (job) {
        job.stdout.push(data.toString());
        jobs.set(options.req_id, job);
      }
    });

    // Capture stderr as well
    pcs.stderr.on('data', (data) => {
      // Write to log file
      logStream.write(`[ERROR] ${data}`);
      
      // Keep existing stderr processing if needed
      const job = jobs.get(options.req_id);
      if (job) {
        job.stderr.push(data.toString());
        jobs.set(options.req_id, job);
      }
    });

    // Clean up the write stream when the process exits
    pcs.on('exit', async (code, signal) => {
      logStream.end();
      const status = code === 0 ? 'completed' : 'error';
      console.log(`\n=== PIPELINE ${status.toUpperCase()} ===`);
      console.log(`Job ID: ${options.req_id}`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`Exit code: ${code}`);
      if (signal) console.log(`Signal: ${signal}`);
      console.log('='.repeat(status.length + 16), '\n');

      // Update job status
      const job = jobs.get(options.req_id);
      if (job) {
        job.status = status;
        jobs.set(options.req_id, job);
      }

      // Update database
      db.get("runs")
        .find({ run: options.req_id })
        .assign({ 
          status,
          completed: new Date().toISOString(),
          exitCode: code,
          signal
        })
        .write();
        
      // Save parameters to file
      try {
        await saveParametersToFile(options.req_id, options.params);
      } catch (error) {
        console.error('Error saving parameters to file:', error);
      }
        
      // Collect log files
      try {
        const sessionId = getSessionId(options.username, options.params);
        const workDir = path.join(WORK_DIR_BASE, sessionId);
        await collectLogFiles(options.req_id, workDir);
      } catch (error) {
        console.error('Error collecting log files:', error);
      }
    });

    pcs.on('error', async (err) => {
      console.error('\n=== PIPELINE ERROR ===');
      console.error(`Job ID: ${options.req_id}`);
      console.error(`Time: ${new Date().toISOString()}`);
      console.error('Error:', err.message);
      console.error('===================\n');

      // Update job status
      const job = jobs.get(options.req_id);
      if (job) {
        job.status = 'error';
        job.error = err.message;
        jobs.set(options.req_id, job);
      }

      // Update database
      db.get("runs")
        .find({ run: options.req_id })
        .assign({ 
          status: 'error',
          completed: new Date().toISOString(),
          error: err.message
        })
        .write();
        
      // Save parameters to file
      try {
        await saveParametersToFile(options.req_id, options.params);
      } catch (error) {
        console.error('Error saving parameters to file:', error);
      }
        
      // Collect log files
      try {
        const sessionId = getSessionId(options.username, options.params);
        const workDir = path.join(WORK_DIR_BASE, sessionId);
        await collectLogFiles(options.req_id, workDir);
      } catch (error) {
        console.error('Error collecting log files:', error);
      }
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
    console.error(`Job ID: ${options.req_id}`);
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


  // Input data under `config.INPUT_PATH` are organized in a hierarchical manner:
  // ├── h3_res_3
  // │   ├── human_obs_enhanced
  // │   │   ├── outlier_high
  // │   │   ├── outlier_low
  // │   │   └── outlier_none
  // │   └── specimens_only
  // │       ├── outlier_high
  // │       ├── outlier_low
  // │       └── outlier_none
  // ├── h3_res_4/
  // │   ├── ...
  // ├── h3_res_5/
  // │   ├── ...
  // └── h3_res_6/
  //     ├── ...

  // Construct the data path based on parameters
  const resolution = params.spatialResolution || params.resolution || 3;
  const recordMode = params.recordFilteringMode === 'specimen' ? 'specimens_only' : 'human_obs_enhanced';
  const outlierMode = params.outlierSensitivity || 'none';
  
  // Construct the hierarchical path
  const dataPath = path.join(
    config.INPUT_PATH,
    `h3_res_${resolution}`,
    recordMode,
    `outlier_${outlierMode}`
  );

  // Log the constructed data path
  console.log('\n=== DATA PATH CONSTRUCTION ===');
  console.log('Resolution:', resolution);
  console.log('Record Mode:', recordMode);
  console.log('Outlier Mode:', outlierMode);
  console.log('Final Data Path:', dataPath);
  console.log('============================\n');

  // Core command
  return [
    'run',
    'vmikk/phylotwin', '-r', 'main',
    '-resume',
    '-ansi-log', 'false',
    '--occ', dataPath,
    '--outdir', outputDir,
    '-work-dir', workDir,
    '-profile', 'docker',
    '--noviz', 'true',
    ...profile,
  ];
}

// Add cleanup function for old work directories
async function cleanupOldWorkDirs() {
  try {
    const now = Date.now();
    const dirs = await fsPromises.readdir(WORK_DIR_BASE);
    
    for (const dir of dirs) {
      const dirPath = path.join(WORK_DIR_BASE, dir);
      const stats = await fsPromises.stat(dirPath);
      
      // Remove directories older than SESSION_TIMEOUT
      if (now - stats.mtime.getTime() > SESSION_TIMEOUT) {
        await fsPromises.rm(dirPath, { recursive: true, force: true });
        console.log(`Cleaned up old work directory: ${dirPath}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up work directories:', error);
  }
}

// Run cleanup periodically, in milliseconds
setInterval(cleanupOldWorkDirs, 7 * 24 * 60 * 60 * 1000);  // once a week

/**
 * Run hypothesis test for a job
 * @param {string} jobId - The job ID
 * @param {string} referencePolygonPath - Path to the reference polygon GeoJSON file
 * @param {string} testPolygonPath - Path to the test polygon GeoJSON file
 * @returns {Promise<object>} - Promise resolving to the test results
 */
async function runHypothesisTest(jobId, referencePolygonPath, testPolygonPath) {
  try {
    console.log('\n=== INITIALIZING HYPOTHESIS TEST ===');
    console.log(`Job ID: ${jobId}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Reference polygon: ${referencePolygonPath}`);
    console.log(`Test polygon: ${testPolygonPath}`);
    console.log('==================================\n');

    // Get job record from database
    const jobRecord = db.get("runs")
      .find({ run: jobId })
      .value();

    if (!jobRecord) {
      throw new Error('Job not found');
    }

    // Create hypothesis test directory
    const jobDir = path.join(config.OUTPUT_PATH, jobId);
    const outputDir = path.join(jobDir, 'output');
    const hypothesisDir = path.join(outputDir, '03.Hypothesis_tests');
    
    // Clean up old hypothesis test files if they exist
    try {
      console.log('\n=== CLEANING UP OLD FILES ===');
      const filesToClean = [
        path.join(hypothesisDir, 'poly_reference.geojson'),
        path.join(hypothesisDir, 'poly_test.geojson'),
        path.join(hypothesisDir, 'HypTest_diversity.txt'),
        path.join(hypothesisDir, 'HypTest_diversity.json'),
        path.join(hypothesisDir, 'HypTest_species_originalities.txt'),
        path.join(hypothesisDir, 'hypothesis_test.log')
      ];
      
      for (const file of filesToClean) {
        try {
          await fsPromises.unlink(file);
          console.log(`Removed old file: ${file}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            // Log error only if it's not a "file not found" error
            console.error(`Error removing file ${file}:`, error.message);
          }
        }
      }
      console.log('============================\n');
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      // Continue with the test even if cleanup fails
    }
    
    // Create hypothesis directory (or recreate if it was deleted)
    await fsPromises.mkdir(hypothesisDir, { recursive: true });
    
    // Copy polygon files to hypothesis directory
    const referenceDestPath = path.join(hypothesisDir, 'poly_reference.geojson');
    const testDestPath = path.join(hypothesisDir, 'poly_test.geojson');
    
    await fsPromises.copyFile(referencePolygonPath, referenceDestPath);
    await fsPromises.copyFile(testPolygonPath, testDestPath);
    
    console.log('\n=== COPIED POLYGON FILES ===');
    console.log(`Reference: ${referencePolygonPath} -> ${referenceDestPath}`);
    console.log(`Test: ${testPolygonPath} -> ${testDestPath}`);
    console.log('============================\n');
    
    // Get resolution from job parameters
    const resolution = jobRecord.params?.resolution || 4;
    
    // Construct Docker command
    const dockerCommand = `docker run --rm \
-v ${hypothesisDir}:${hypothesisDir} \
-v ${outputDir}:${outputDir} \
-v ${config.PIPELINE_DIR}:${config.PIPELINE_DIR} \
vmikk/phylotwin:0.6.0 \
sh -c 'export PATH=${config.PIPELINE_DIR}/bin:\$PATH && \
${config.PIPELINE_DIR}/bin/hypothesis_test.R \
 --polygons_reference ${hypothesisDir}/poly_reference.geojson \
 --polygons_test ${hypothesisDir}/poly_test.geojson \
 --occurrences ${outputDir}/01.Occurrence_subset/aggregated_counts.parquet \
 --tree ${outputDir}/01.Occurrence_subset/phylogenetic_tree.nex \
 --resolution ${resolution} \
 --results ${hypothesisDir}/HypTest \
 --duckdb_extdir /usr/local/bin/duckdb_ext'`;
    
    console.log('\n=== RUNNING HYPOTHESIS TEST ===');
    console.log(`Command: ${dockerCommand}`);
    console.log('===============================\n');
    
    // Create log file
    const logFile = path.join(hypothesisDir, 'hypothesis_test.log');
    const logStream = fs.createWriteStream(logFile, { flags: 'w' }); // Use 'w' to overwrite
    
    // Execute command
    return new Promise((resolve, reject) => {
      const process = child_process.exec(dockerCommand, {
        cwd: hypothesisDir,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      // Capture stdout
      process.stdout.on('data', (data) => {
        logStream.write(data);
      });
      
      // Capture stderr
      process.stderr.on('data', (data) => {
        logStream.write(`[ERROR] ${data}`);
      });
      
      // Handle process completion
      process.on('close', async (code) => {
        logStream.end();
        
        if (code === 0) {
          console.log('\n=== HYPOTHESIS TEST COMPLETED ===');
          console.log(`Job ID: ${jobId}`);
          console.log(`Time: ${new Date().toISOString()}`);
          console.log('=================================\n');
          
          // Check if result files exist
          const diversityResultsPath = path.join(hypothesisDir, 'HypTest_diversity.txt');
          const diversityJsonResultsPath = path.join(hypothesisDir, 'HypTest_diversity.json');
          const originalityResultsPath = path.join(hypothesisDir, 'HypTest_species_originalities.txt');
          
          try {
            await fsPromises.access(diversityResultsPath, fs.constants.F_OK);
            await fsPromises.access(diversityJsonResultsPath, fs.constants.F_OK);
            await fsPromises.access(originalityResultsPath, fs.constants.F_OK);
            
            // Read diversity results
            const diversityResults = await fsPromises.readFile(diversityJsonResultsPath, 'utf8');
            
            // Parse JSON results
            const results = {
              diversity: diversityResults,
              originalityPath: originalityResultsPath
            };
            
            resolve(results);
          } catch (error) {
            reject(new Error(`Hypothesis test completed but result files not found: ${error.message}`));
          }
        } else {
          console.error('\n=== HYPOTHESIS TEST FAILED ===');
          console.error(`Job ID: ${jobId}`);
          console.error(`Time: ${new Date().toISOString()}`);
          console.error(`Exit code: ${code}`);
          console.error('==============================\n');
          
          reject(new Error(`Hypothesis test failed with exit code ${code}`));
        }
      });
      
      // Handle process error
      process.on('error', (error) => {
        logStream.end();
        console.error('\n=== HYPOTHESIS TEST ERROR ===');
        console.error(`Job ID: ${jobId}`);
        console.error(`Time: ${new Date().toISOString()}`);
        console.error(`Error: ${error.message}`);
        console.error('============================\n');
        
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error running hypothesis test:', error);
    throw error;
  }
}

module.exports = {
  jobs,
  killJob,
  removeJobData,
  startJob,
  ALLOWED_PARAMS,
  getSessionId,
  cleanupOldWorkDirs,
  collectLogFiles,
  saveParametersToFile,
  runHypothesisTest,
}; 