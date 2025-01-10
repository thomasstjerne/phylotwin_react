const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findExecutable(name) {
    try {
        // First try to find in PATH
        const whichOutput = execSync(`which ${name}`, { encoding: 'utf8' }).trim();
        if (whichOutput && fs.existsSync(whichOutput)) {
            return whichOutput;
        }
    } catch (error) {
        console.log(`${name} not found in PATH, checking alternative locations...`);
    }

    // Define possible locations
    const possibleLocations = [
        `/usr/local/bin/${name}`,
        `/usr/bin/${name}`,
        `/opt/phylotwin/${name}`,
        path.join(process.env.HOME || '', name),
        path.join(process.env.HOME || '', 'bin', name)
    ];

    // Check each location
    for (const location of possibleLocations) {
        if (fs.existsSync(location)) {
            try {
                fs.accessSync(location, fs.constants.X_OK);
                return location;
            } catch (error) {
                console.log(`Found ${name} at ${location} but it's not executable`);
            }
        }
    }

    return null;
}

module.exports = findExecutable; 