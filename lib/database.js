const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'site_builder.db');

// Create a database connection using better-sqlite3 for synchronous operations
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

module.exports = db;