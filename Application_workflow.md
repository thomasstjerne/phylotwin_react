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


## Frontend Routes

### Core Routes
- `/` - Home page with application overview and getting started information
- `/run` - Main workflow page for new analysis
- `/run/:id` - Specific workflow run with results and visualization
- `/myruns` - List of user's previous and current runs


## API Endpoints

### Job Management
- GET `/api/phylonext/jobs/:jobid`
  * Returns job status and details
  * Response: `{ jobid, status, started, completed, exitCode, error, signal }`
  * Status codes: 200, 404, 500

- PUT `/api/phylonext/jobs/:jobid/abort`
  * Aborts a running job
  * Status codes: 204, 404, 500

- DELETE `/api/phylonext/jobs/:jobid`
  * Deletes a job and its data
  * Status codes: 204, 404, 500

### Run Management
- POST `/api/phylonext/runs`
  * Creates new analysis run
  * Accepts form data with parameters and files
  * Returns: `{ jobId, runId }`

- GET `/api/phylonext/runs/job/:jobId`
  * Returns run status and details
  * Response: `{ status, ... }`

- GET `/api/phylonext/myruns`
  * Lists user's runs
  * Response: Array of run objects

### Results Access
- GET `/job/:jobid/cloropleth.html` - Map visualization (legacy, will be deprecated)
- GET `/job/:jobid/execution_report.html` - Execution report
- GET `/job/:jobid/archive.zip` - Complete results package
- GET `/job/:jobid/pdf` - Generated PDF reports (legacy, will be deprecated)
- GET `/api/phylonext/jobs/:jobid/output/02.Diversity_estimates/diversity_estimates.geojson` - GeoJSON results

### Authentication
- POST `/auth/login` - User login
- POST `/auth/logout` - User logout
- GET `/auth/status` - Check authentication status




## Developer guide

### Diversity metrics

The application uses a vocabulary of diversity indices defined in `shared/vocabularies/diversityIndices.json`.  
This file organizes metrics into groups like "Basic diversity metrics", "Phylogenetic diversity metrics", "Endemism metrics", etc.

Each metric has several key properties:

```json
{
  "id":              "metric_id",
  "displayName":     "Human-readable name for the GUI",
  "description":     "Description text to be displayed in the GUI",
  "commandName":     "Command to estimate metric in the core pipeline",
  "resultName":      "Name of the variable in the GeoJSON/tabular results",
  "module":          "Module name responsible for estimating the metric ('main' or 'biodiverse')",
  "colorSchemeType": "Type of color scheme to use for the metric",
  "resultProcessor": "optional special handler for the metric"
}
```


Each metric has several key properties:
- `id`: Internal identifier used within the application
- `displayName`: Human-readable name shown in the UI
- `description`: Explanation of the metric shown in tooltips
- `commandName`: Serves different purposes depending on the module:
  - For `module: "main"`: Parameter sent to the core pipeline in order to estimate the metric
  - For `module: "biodiverse"`: Can be a string or array of Biodiverse modules to activate
- `resultName`: Identifies the name of the variable in the GeoJSON/tabular results:
  - Can be a single string: `"resultName": "Richness"`
  - Or an array for metrics with multiple result columns: `"resultName": ["ES_5", "ES_10", "ES_20"]`
- `module`: Whether it's calculated in the main pipeline or biodiverse module
- `colorSchemeType`: The type of color scheme to use (sequential, diverging, etc.)


#### Adding a new metric

To add a new diversity metric:

1. **Update the vocabulary file** (`shared/vocabularies/diversityIndices.json`):
   - Add a new entry to the appropriate group's `indices` array
   - Include all required fields: `id`, `displayName`, `description`, `commandName`, `resultName`, `module`, and `colorSchemeType`

2. **Ensure the metric support from the core pipeline**:
   - The pipeline must be capable of calculating this metric
   - The metric's results must be included in the GeoJSON output with the property name matching the `resultName`

3. **Handle special cases** (if needed):
   - If the new metric requires special visualization handling (like CANAPE), add appropriate logic in the visualization components
   - For metrics with multiple result columns (like Hurlbert's ES), specify an array of `resultName` values

#### Examples of different metric types

**Standard metric:**
```json
{
  "id":              "richness",
  "displayName":     "Species richness",
  "description":     "Number of unique species in the area",
  "commandName":     "Richness",
  "resultName":      "Richness",
  "module":          "main",
  "colorSchemeType": "sequential"
}
```

**Biodiverse metric with multiple commands:**
```json
{
  "id":              "canape",
  "displayName":     "CANAPE",
  "description":     "Categorical analysis of neo- and paleo-endemism",
  "commandName":     ["calc_pe", "calc_phylo_rpd2", "calc_phylo_rpe2"],
  "resultName":      "CANAPE",
  "module":          "biodiverse",
  "colorSchemeType": "CANAPE",
  "resultProcessor": "canape"
}
```

**Multi-property metric:**
```json
{
  "id":              "hurlbert",
  "displayName":     "Hurlbert's ES",
  "description":     "The number of unique species in a random sample of N occurrence records",
  "commandName":     "calc_hurlbert_es",
  "resultName":      ["ES_5", "ES_10", "ES_20", "ES_50", "ES_100"],
  "module":          "biodiverse",
  "colorSchemeType": "sequential",
  "resultProcessor": "hurlbert"
}
```

### How metrics are used in the application

1. **Selection in settings panel**:
   - Users select metrics in the Settings Panel before running an analysis
   - The selected metrics are split by module. Currently, there are two modules - `main` (diversity indices are estimated in R) and `biodiverse` (metrics are estimated using Biodiverse).
   - For Biodiverse metrics, the application uses `commandName` to determine which modules to activate

2. **Visualization**:
   - After analysis, users select metrics to visualize in the Visualization panel
   - The application uses `resultName` to find the appropriate properties in the GeoJSON data
   - For metrics with multiple result properties (array of `resultName`), the UI should allow selection of specific properties
   - Color schemes are applied based on the `colorSchemeType`
   - For diverging indices (like SES metrics), special binning is applied with significance thresholds
   - For sequential indices, quintile-based binning is used

