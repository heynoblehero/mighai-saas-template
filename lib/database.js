const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'site_builder.db');

// Create a database connection using better-sqlite3 for synchronous operations
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Set busy timeout to wait up to 5 seconds when database is locked
// This prevents SQLITE_BUSY errors during concurrent access
db.pragma('busy_timeout = 5000');

module.exports = db;