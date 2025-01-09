const os = require("os");

const userHomeDir = os.homedir();
const PhyloTwinTestDataDir = `${userHomeDir}/.nextflow/assets/vmikk/phylotwin/test_data`
const PhyloTwinPipelineDataDir = `${userHomeDir}/.nextflow/assets/vmikk/phylotwin/pipeline_data`
const OUTPUT_PATH = `${userHomeDir}/phylotwin_data/runs`;
const PERSISTANT_ACCESS_PATH = `${userHomeDir}/phylotwin_data/persistant`

const env = process.env.NODE_ENV || 'local';

console.log('ENV: ' + env);

const config = {
  local: {
    INPUT_PATH:  `${userHomeDir}/phylotwin_data/occurrence.parquet`,
    OUTPUT_PATH: OUTPUT_PATH,
    TEST_DATA:    PhyloTwinTestDataDir, 
    PIPELINE_DATA: PhyloTwinPipelineDataDir,
    EXPRESS_PORT: 9000,
    NEXTFLOW: `${userHomeDir}/nextflow`,
    GBIF_API: 'https://api.gbif-uat.org/v1/',
    GBIF_REGISTRY_API: 'https://registry-api.gbif-uat.org/',
    CONCURRENT_RUNS_ALLOWED: 3,
    PERSISTANT_ACCESS_PATH: PERSISTANT_ACCESS_PATH,
    PERSISTANT_ACCESS_URI: "http://download.gbif.org/phylotwin/",
    DB_LOCATION : `${userHomeDir}/phylotwin_data/db.json`
  },
  production: {
    INPUT_PATH: `/mnt/auto/scratch/mblissett/cloud-data/latest/occurrence.parquet`,
    OUTPUT_PATH: '/opt/phylotwin/runs',
    TEST_DATA:    '/opt/phylotwin/.nextflow/assets/vmikk/phylotwin/test_data', 
    PIPELINE_DATA: '/opt/phylotwin/.nextflow/assets/vmikk/phylotwin/pipeline_data', 
    EXPRESS_PORT: 9000,
    NEXTFLOW: '/opt/phylotwin/nextflow',
    GBIF_API: 'https://api.gbif.org/v1/',
    GBIF_REGISTRY_API: 'https://registry-api.gbif.org/',
    CONCURRENT_RUNS_ALLOWED: 3,
    PERSISTANT_ACCESS_PATH: '/mnt/auto/misc/download.gbif.org/phylotwin',
    PERSISTANT_ACCESS_URI: "http://download.gbif.org/phylotwin/",
    DB_LOCATION : '/opt/phylotwin/db.json'
  },
};

module.exports = config[env];
