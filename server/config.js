const os = require("os");
const fs = require("fs");

const userHomeDir = os.homedir();
const PhyloTwinTestDataDir = `${userHomeDir}/.nextflow/assets/vmikk/phylotwin/test_data`;
const PhyloTwinPipelineDataDir = `${userHomeDir}/.nextflow/assets/vmikk/phylotwin/pipeline_data`;
const OUTPUT_PATH = `${userHomeDir}/phylotwin_data/runs`;
const PERSISTANT_ACCESS_PATH = `${userHomeDir}/phylotwin_data/persistant`;

const env = process.env.NODE_ENV || 'development';

console.log('ENV: ' + env);

// Define configurations
const configs = {
  development: {
    INPUT_PATH: `${userHomeDir}/phylotwin_data/occurrence.parquet`,
    OUTPUT_PATH: OUTPUT_PATH,
    TEST_DATA: PhyloTwinTestDataDir,
    PIPELINE_DATA: PhyloTwinPipelineDataDir,
    EXPRESS_PORT: 9000,
    NEXTFLOW: `${userHomeDir}/nextflow`,
    GBIF_API: 'https://api.gbif-uat.org/v1/',
    GBIF_REGISTRY_API: 'https://registry-api.gbif-uat.org/',
    CONCURRENT_RUNS_ALLOWED: 3,
    PERSISTANT_ACCESS_PATH: PERSISTANT_ACCESS_PATH,
    PERSISTANT_ACCESS_URI: "http://download.gbif.org/phylotwin/",
    DB_LOCATION: `${userHomeDir}/phylotwin_data/db.json`
  },
  production: {
    INPUT_PATH: `/mnt/auto/scratch/mblissett/cloud-data/latest/occurrence.parquet`,
    OUTPUT_PATH: '/opt/phylotwin/runs',
    TEST_DATA: '/opt/phylotwin/.nextflow/assets/vmikk/phylotwin/test_data',
    PIPELINE_DATA: '/opt/phylotwin/.nextflow/assets/vmikk/phylotwin/pipeline_data',
    EXPRESS_PORT: 9000,
    NEXTFLOW: '/opt/phylotwin/nextflow',
    GBIF_API: 'https://api.gbif.org/v1/',
    GBIF_REGISTRY_API: 'https://registry-api.gbif.org/',
    CONCURRENT_RUNS_ALLOWED: 3,
    PERSISTANT_ACCESS_PATH: '/mnt/auto/misc/download.gbif.org/phylotwin',
    PERSISTANT_ACCESS_URI: "http://download.gbif.org/phylotwin/",
    DB_LOCATION: '/opt/phylotwin/db.json'
  }
};

// Validation function
const validateConfig = (cfg) => {
  const required = ['INPUT_PATH', 'OUTPUT_PATH', 'EXPRESS_PORT', 'NEXTFLOW'];
  const missing = required.filter(key => !cfg[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required config: ${missing.join(', ')}`);
  }

  // Verify paths exist
  const paths = [cfg.INPUT_PATH, cfg.OUTPUT_PATH];
  paths.forEach(path => {
    if (!fs.existsSync(path)) {
      console.warn(`Warning: Path does not exist: ${path}`);
      // Create directory if it doesn't exist
      try {
        fs.mkdirSync(path, { recursive: true });
        console.log(`Created directory: ${path}`);
      } catch (error) {
        console.error(`Failed to create directory ${path}:`, error);
      }
    }
  });

  return cfg;
};

// Get and validate configuration
const config = validateConfig(configs[env] || configs.development);

// Export the validated configuration
module.exports = config;

// Log the active configuration
console.log('Active configuration:', {
  environment: env,
  outputPath: config.OUTPUT_PATH,
  nextflowPath: config.NEXTFLOW
});
