

## TO DO:
# - try https://kepler.gl/demo  with GeoJSON output



## Install docker-compose
# sudo apt install docker-compose-plugin

## Run the app

```bash
## Start the app
docker compose up

## Rebuild containers after Dockerfile changes
docker compose up --build

## To see logs (in separate terminal)
docker compose logs -f
```

Frontend will be available at http://localhost:3000  
Backend API at                http://localhost:5000  


# Changes to React code will hot reload automatically
# Backend changes will trigger nodemon to restart the server


## Previous version of the GUI

The first version of the GUI was developed by Thomas Stjernegaard Jeppesen at GBIF

#### React web app - frontend
https://github.com/gbif/phylonext-ui

#### Backend
https://github.com/gbif/phylonext-ws



############################### Local development

# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Download and install Node.js:
nvm install 22

# Verify the Node.js version:
node -v      # v22.12.0
nvm current  # v22.12.0

# Verify npm version:
npm -v       # 10.9.0

## Install project dependencies for the client
cd client
npm install

## Install project dependencies for the server
cd ../server
npm install


## Start the development servers - need two terminal tabs

# Terminal 1 (for the backend) - In the server directory
npm start
# nodemon server.js  # assuming server.js is your entry point

# Terminal 2 (for the frontend) - In the client directory
npm start




The server needs:
A database file at ~/phylonext_data/db.json
A directory for runs at ~/phylonext_data/runs
A directory for persistent data at ~/phylonext_data/persistant



Server code organization:
   server/
   ├── Auth/
   │   ├── auth.js
   │   └── user.model.js
   ├── routes/
   │   ├── jobs.js
   │   └── runs.js
   ├── services/
   │   └── jobService.js
   ├── config.js
   ├── db.js
   └── index.js


API Endpoints:
    /api/auth/login     - User authentication
    /api/auth/me        - Get current user
    /api/phylonext/jobs - Job management
    /api/phylonext      - Pipeline runs


## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Mapbox token to `.env`:
   ```
   REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
   ```

Note: Never commit the `.env` file containing your actual token to version control.

