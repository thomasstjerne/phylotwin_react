const config = require("./config");
const fs = require('fs');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Ensure the directory exists
const dbDir = path.dirname(config.DB_LOCATION);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create db.json if it doesn't exist
if (!fs.existsSync(config.DB_LOCATION)) {
  fs.writeFileSync(config.DB_LOCATION, JSON.stringify({ runs: [] }));
}

const adapter = new FileSync(config.DB_LOCATION);
const db = low(adapter);

// Set defaults (will only be used if db.json is empty)
db.defaults({ runs: [] })
  .write();

module.exports = db;
