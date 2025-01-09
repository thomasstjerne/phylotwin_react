
## PhyloTwin-GUI - GUI for GBIF occurrence data processing pipeline

#### Other components of the workflow:
 - https://github.com/vmikk/phylotwin-preprocessor
 - https://github.com/vmikk/phylotwin


### Local development

Install Java using SDKMAN (required for Nextflow):

```bash
# Install SDKMAN
curl -s https://get.sdkman.io | bash

# .. Open a new terminal
# and install Java
sdk install java 17.0.10-tem
java -version
```

Install Nextflow and pull the core pipeline:

```bash
# Install Nextflow
curl -s https://get.nextflow.io | bash

# Pull the core pipeline
nextflow pull vmikk/phylotwin -r main
```


Install Node.js and npm:  

```bash
# Download and install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Download and install Node.js
nvm install 22

## Verify the Node.js version
node -v      # v22.12.0
nvm current  # v22.12.0

## Verify npm version
npm -v       # 10.9.0
```

Install project dependencies:  

```bash
## Install project dependencies for the client
cd client
npm install

## Install project dependencies for the server
cd ../server
npm install
```


## Start the development servers - need two terminal tabs

```bash
# Terminal 1 (for the backend) - In the server directory
npm run dev
# nodemon server.js  # assuming server.js is your entry point

# Terminal 2 (for the frontend) - In the client directory
npm start
```

Frontend is at http://localhost:3000  
Backend API is at http://localhost:5000  


## Previous version of the GUI

The first version of the GUI was developed by Thomas Stjernegaard Jeppesen at GBIF

#### React web app - frontend
https://github.com/gbif/phylonext-ui

#### Backend
https://github.com/gbif/phylonext-ws

