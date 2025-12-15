const db = require('./database');

// Initialize storage buckets and files tables
function initializeStorageTables() {
  try {
    // Create buckets table
    db.exec(`
      CREATE TABLE IF NOT EXISTS storage_buckets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        allowed_file_types TEXT, -- JSON array of MIME types
        max_file_size INTEGER DEFAULT 10485760, -- 10MB default
        access_level TEXT DEFAULT 'private', -- public, private, admin, user
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create files table
    db.exec(`
      CREATE TABLE IF NOT EXISTS storage_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bucket_id INTEGER NOT NULL,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_by TEXT, -- email or user ID
        access_level TEXT DEFAULT 'private', -- public, private, admin, user
        metadata TEXT, -- JSON object for additional metadata
        virus_scanned BOOLEAN DEFAULT 0,
        scan_status TEXT DEFAULT 'pending', -- pending, safe, infected, error
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bucket_id) REFERENCES storage_buckets(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_files_bucket ON storage_files(bucket_id);
      CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON storage_files(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_files_access_level ON storage_files(access_level);
      CREATE INDEX IF NOT EXISTS idx_buckets_slug ON storage_buckets(slug);
    `);

    console.log('✓ Storage tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing storage tables:', error);
    return false;
  }
}

module.exports = { initializeStorageTables };
