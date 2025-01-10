const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Ensure the directory exists
const dbDir = path.dirname(config.DB_LOCATION);
if (!fs.existsSync(dbDir)) {
  console.log(`Creating database directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

const adapter = new FileSync(config.DB_LOCATION);
const db = low(adapter);

// Set defaults if database is empty
db.defaults({ 
  runs: [],
  schema_version: 1  // Adding schema version for future migrations
})
.write();

console.log('Database initialized at:', config.DB_LOCATION);

module.exports = db;
