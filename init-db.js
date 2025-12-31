// Simple script to initialize the database tables
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database setup
const dbPath = path.join(__dirname, 'site_builder.db');
const db = new sqlite3.Database(dbPath);

// Create email_settings table
db.run(`
  CREATE TABLE IF NOT EXISTS email_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_email TEXT NOT NULL,
    from_email TEXT NOT NULL DEFAULT 'noreply@mighai.com',
    from_name TEXT NOT NULL DEFAULT 'Mighai',
    resend_api_key TEXT,
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_username TEXT,
    smtp_password TEXT,
    email_notifications BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create email_campaigns table
db.run(`
  CREATE TABLE IF NOT EXISTS email_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'welcome', 'onboarding', 'newsletter', 'marketing'
    trigger_condition TEXT, -- JSON string with conditions
    email_template_id INTEGER,
    is_active BOOLEAN DEFAULT 1,
    send_delay_hours INTEGER DEFAULT 0,
    target_plan TEXT, -- 'free', 'basic', 'pro', 'enterprise', 'all'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create email_templates table
db.run(`
  CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    template_type TEXT NOT NULL, -- 'campaign', 'transactional', 'otp'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert default settings if not exists
db.run(`
  INSERT OR IGNORE INTO email_settings (id, admin_email, from_email, from_name)
  VALUES (1, 'admin@mighai.com', 'noreply@mighai.com', 'Mighai')
`);

console.log('Database tables created successfully!');

db.close(() => {
  console.log('Database connection closed.');
});