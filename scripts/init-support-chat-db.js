#!/usr/bin/env node

/**
 * Initialize Support Chat Settings Database
 * Creates the necessary tables for support chat functionality
 */

const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, '..', 'site_builder.db');
const db = new Database(dbPath);

console.log('🔧 Initializing Support Chat Database...');

try {
  // Create support_chat_settings table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS support_chat_settings (
      id INTEGER PRIMARY KEY,
      visibility TEXT DEFAULT 'public',
      primary_color TEXT DEFAULT '#3B82F6',
      secondary_color TEXT DEFAULT '#10B981',
      button_text TEXT DEFAULT 'Support Chat',
      position TEXT DEFAULT 'bottom-right',
      is_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log('✅ support_chat_settings table created');

  // Insert default settings if not exists
  const existing = db.prepare('SELECT id FROM support_chat_settings WHERE id = 1').get();
  if (!existing) {
    db.prepare(`
      INSERT INTO support_chat_settings (id, visibility, is_enabled)
      VALUES (1, 'public', 1)
    `).run();
    console.log('✅ Default support chat settings inserted');
  } else {
    console.log('ℹ️ Support chat settings already exist');
  }

  // Create support_messages table if not exists
  db.prepare(`
    CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      sender_type TEXT DEFAULT 'customer',
      is_read BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log('✅ support_messages table created');

  // Create analytics tables if not exists
  db.prepare(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      page_path TEXT NOT NULL,
      session_id TEXT,
      event_data TEXT,
      user_agent TEXT,
      ip_address TEXT,
      referrer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log('✅ analytics_events table created');

  db.prepare(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      ip_address TEXT,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log('✅ page_views table created');

  // Create A/B testing tables
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ab_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      experiment_id TEXT NOT NULL,
      name TEXT NOT NULL,
      variant_a_content TEXT,
      variant_b_content TEXT,
      variant_a_weight INTEGER DEFAULT 50,
      variant_b_weight INTEGER DEFAULT 50,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(experiment_id)
    )
  `).run();
  console.log('✅ ab_tests table created');

  db.prepare(`
    CREATE TABLE IF NOT EXISTS ab_test_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      experiment_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      variant TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(experiment_id, session_id)
    )
  `).run();
  console.log('✅ ab_test_assignments table created');

  console.log('');
  console.log('✅ All support chat and analytics tables initialized successfully!');
  console.log('');
  console.log('You can now use:');
  console.log('  - Support Chat Widget (automatically available on all pages)');
  console.log('  - Analytics Tracking (page views, clicks, forms)');
  console.log('  - A/B Testing');
  console.log('  - Heatmap Integration');

} catch (error) {
  console.error('❌ Error initializing database:', error);
  process.exit(1);
}
