
# Application Flow

## 1. Frontend Configuration (Client)

User interacts with the form in `client/src/Form/index.js` and `client/src/Layout/SettingsPanel.js`

Parameters include:

- Spatial filters
- Taxonomic filters
- Various data selection criteria
- Diversity estimation settings

Mandatory parameters:

- One of the spatial filters
- Plylogenetic tree

## 2. Job Submission

When user clicks "Start Analysis":

```javascript
// client/src/Layout/SettingsPanel.js
const apiUrl = `${config.phylonextWebservice}/api/phylonext/runs`;
// Development: http://localhost:9000/api/phylonext/runs
// Production: https://phylonext.gbif.org/service/api/phylonext/runs
```

The request includes:

- Form data with parameters
- Authentication token
- Optional uploaded files (polygons, species keys)

## 3. Server Processing

1. Request handling (`server/routes/runs.js`):

- Validates authentication
- Creates job directory
- Processes parameters
- Generates unique job ID

2. Job execution (`server/services/jobService.js`):

- Verifies nextflow availability
- Constructs nextflow command
- Spawns child process
- Monitors execution
- Handles stdout/stderr

## 4. Job Monitoring

Frontend polls job status:

```javascript
// client/src/Run/index.js
`${config.phylonextWebservice}/job/${jobId}`
```

## 5. Results Processing

When job completes:

- Results are zipped
- Stored in output directory
- Made available through various endpoints:

- `/job/:jobid/cloropleth.html` - Map visualization
- `/job/:jobid/execution_report.html` - Execution report
- `/job/:jobid/archive.zip` - Complete results
- `/job/:jobid/pdf` - Generated PDFs

## 6. Development vs Production

### Development Mode

```javascript
// client/src/config.js
const dev = {
    phylonextWebservice: 'http://localhost:9000',
    authWebservice: 'http://localhost:9000/auth'
};
```

- Started with: `npm run dev`
- Authentication bypass available
- CORS allows localhost:3000
- More detailed error messages
- Local file paths in config

### Production Mode

```javascript
const prod = {
    phylonextWebservice: 'https://phylonext.gbif.org/service',
    authWebservice: 'https://phylonext.gbif.org/service/auth'
};
```

- Started with: `npm run start`
- Strict authentication
- Limited CORS
- Sanitized error messages
- Production paths in config


## Required Setup

### Core Pipeline Requirements

Configured in `server/config.js`:

1. Nextflow Installation:

```javascript
const nextflowPath = findExecutable('nextflow');
// Fallbacks:
// Development: 'nextflow' (in PATH)
// Production: '/opt/phylotwin/nextflow'
```

2. Data Directories:

```javascript
// Development
INPUT_PATH: `${userHomeDir}/phylotwin_data/preprocessed_occurrences_parquet`
OUTPUT_PATH: `${userHomeDir}/phylotwin_data/runs`
TEST_DATA: `${userHomeDir}/.nextflow/assets/vmikk/phylotwin/test_data`

// Production
INPUT_PATH: '/mnt/auto/scratch/mblissett/cloud-data/latest/preprocessed_occurrences_parquet'
OUTPUT_PATH: '/opt/phylotwin/runs'
TEST_DATA: '/opt/phylotwin/.nextflow/assets/vmikk/phylotwin/test_data'
```

### External Dependencies

1. Database:

```javascript
// server/db.js
// Development
DB_LOCATION: `${userHomeDir}/phylotwin_data/db.json`

// Production
DB_LOCATION: '/opt/phylotwin/db.json'
```

- Uses lowdb (file-based JSON database)
    - Directory must be writable
    - Created automatically if missing

2. Persistent Storage:

```javascript
// Development
PERSISTANT_ACCESS_PATH: `${userHomeDir}/phylotwin_data/persistant`
PERSISTANT_ACCESS_URI: "http://download.gbif.org/phylotwin/"

// Production
PERSISTANT_ACCESS_PATH: '/mnt/auto/misc/download.gbif.org/phylotwin'
```

3. Required Directories:

```javascript
// server/server.js
const dirs = [
    config.OUTPUT_PATH,
    config.PERSISTANT_ACCESS_PATH,
    path.dirname(config.DB_LOCATION)
];
```

All these directories are created automatically if missing.


## Debugging Tips

1. Server Logs:

- Job status: `GET /api/phylonext/jobs/:jobid`
- Run details: `GET /api/phylonext/myruns`
- Process output in `jobService.js`

2. Frontend Debug Info:

- Workflow state: `client/src/Workflow/index.js`
- Run status polling: `client/src/Run/index.js`
- Form submission: `client/src/Layout/SettingsPanel.js`


3. Configuration:

- Check `server/config.js` for paths
- Verify nextflow installation
- Ensure directory permissions
- Monitor database access

