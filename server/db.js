const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Ensure database directory exists
const dbDir = path.dirname(config.DB_LOCATION);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

console.log('Using database at:', config.DB_LOCATION);

const adapter = new FileSync(config.DB_LOCATION);
const db = low(adapter);

// Initialize database with default values and schema version 2
db.defaults({ 
    runs: [],
    schema_version: 2
}).write();

module.exports = db;
