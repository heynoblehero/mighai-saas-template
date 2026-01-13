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

// Create support_chat_settings table
db.run(`
  CREATE TABLE IF NOT EXISTS support_chat_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visibility TEXT DEFAULT 'public', -- 'public' or 'subscribers_only'
    primary_color TEXT DEFAULT '#3B82F6', -- Default blue
    secondary_color TEXT DEFAULT '#10B981', -- Default green
    button_text TEXT DEFAULT 'Support Chat',
    position TEXT DEFAULT 'bottom-right', -- 'bottom-left', 'bottom-right', 'top-left', 'top-right'
    is_enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert default support chat settings if not exists
db.run(`
  INSERT OR IGNORE INTO support_chat_settings (id, visibility, primary_color, secondary_color, button_text, position, is_enabled)
  VALUES (1, 'public', '#3B82F6', '#10B981', 'Support Chat', 'bottom-right', 1)
`);

// Create analytics_sessions table for proper session tracking
db.run(`
  CREATE TABLE IF NOT EXISTS analytics_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    visitor_id TEXT,
    first_page TEXT,
    last_page TEXT,
    entry_referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    page_count INTEGER DEFAULT 1,
    duration_seconds INTEGER DEFAULT 0,
    is_bounce BOOLEAN DEFAULT TRUE,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME
  )
`);

// Create analytics_engagement table for scroll/time tracking
db.run(`
  CREATE TABLE IF NOT EXISTS analytics_engagement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    page_path TEXT NOT NULL,
    max_scroll_depth INTEGER DEFAULT 0,
    time_on_page INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create analytics_events table
db.run(`
  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    page_path TEXT,
    session_id TEXT,
    visitor_id TEXT,
    event_data TEXT,
    user_agent TEXT,
    ip_address TEXT,
    referrer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create page_views table
db.run(`
  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_path TEXT NOT NULL,
    session_id TEXT,
    visitor_id TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create chat_users table for email-based anonymous chat
db.run(`
  CREATE TABLE IF NOT EXISTS chat_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    session_token TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create support_messages table
db.run(`
  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    chat_user_id INTEGER,
    message TEXT NOT NULL,
    sender_type TEXT DEFAULT 'customer',
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create ab_tests table
db.run(`
  CREATE TABLE IF NOT EXISTS ab_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    page_path TEXT,
    status TEXT DEFAULT 'active',
    variants TEXT,
    variant_a_weight INTEGER DEFAULT 50,
    variant_b_weight INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create ab_test_assignments table
db.run(`
  CREATE TABLE IF NOT EXISTS ab_test_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    variant TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(experiment_id, session_id)
  )
`);

// Create ab_test_conversions table
db.run(`
  CREATE TABLE IF NOT EXISTS ab_test_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    variant TEXT NOT NULL,
    conversion_type TEXT NOT NULL,
    conversion_value REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(experiment_id, session_id, conversion_type)
  )
`);

// Create heatmap_clicks table for click tracking
db.run(`
  CREATE TABLE IF NOT EXISTS heatmap_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    visitor_id TEXT,
    page_path TEXT NOT NULL,
    page_url TEXT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    x_percent REAL,
    y_percent REAL,
    viewport_width INTEGER,
    viewport_height INTEGER,
    page_width INTEGER,
    page_height INTEGER,
    element_tag TEXT,
    element_id TEXT,
    element_class TEXT,
    element_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create heatmap_movements table for mouse movement tracking (sampled)
db.run(`
  CREATE TABLE IF NOT EXISTS heatmap_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    visitor_id TEXT,
    page_path TEXT NOT NULL,
    points TEXT NOT NULL,
    viewport_width INTEGER,
    viewport_height INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create heatmap_scroll table for scroll depth tracking
db.run(`
  CREATE TABLE IF NOT EXISTS heatmap_scroll (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    visitor_id TEXT,
    page_path TEXT NOT NULL,
    max_scroll_percent INTEGER DEFAULT 0,
    viewport_height INTEGER,
    page_height INTEGER,
    fold_views TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create indexes for better query performance
db.run(`CREATE INDEX IF NOT EXISTS idx_heatmap_clicks_page ON heatmap_clicks(page_path, created_at)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_heatmap_movements_page ON heatmap_movements(page_path, created_at)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_heatmap_scroll_page ON heatmap_scroll(page_path, created_at)`);

console.log('Database tables created successfully!');

db.close(() => {
  console.log('Database connection closed.');
});