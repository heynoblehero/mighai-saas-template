#!/usr/bin/env node

/**
 * Migration: Add new fields to support_chat_settings table
 * Features: Animations, Auto-popup, Business Hours, Sounds, Message Status, Team Logo, FAQ
 */

const path = require('path');
const Database = require('better-sqlite3');
// Use the same path as lib/database.js
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'site_builder.db');
const db = new Database(dbPath);
console.log('📂 Database path:', dbPath);

console.log('🔧 Migrating Support Chat Settings...');

const newColumns = [
  // Original columns that might be missing
  { name: 'widget_icon', type: 'TEXT', default: "'chat'" },
  { name: 'greeting_message', type: 'TEXT', default: "''" },
  { name: 'background_color', type: 'TEXT', default: "'#FFFFFF'" },
  { name: 'header_text_color', type: 'TEXT', default: "'#FFFFFF'" },
  { name: 'customer_text_color', type: 'TEXT', default: "'#FFFFFF'" },
  { name: 'admin_text_color', type: 'TEXT', default: "'#1F2937'" },
  { name: 'border_radius', type: 'TEXT', default: "'12'" },
  { name: 'font_family', type: 'TEXT', default: "'system-ui'" },

  // Animation settings
  { name: 'animation_type', type: 'TEXT', default: "'slide_fade'" },
  { name: 'animation_duration', type: 'INTEGER', default: '300' },

  // Auto-popup settings
  { name: 'auto_popup_enabled', type: 'INTEGER', default: '0' },
  { name: 'auto_popup_trigger', type: 'TEXT', default: "'time'" },
  { name: 'auto_popup_delay', type: 'INTEGER', default: '5' },
  { name: 'auto_popup_scroll_percent', type: 'INTEGER', default: '50' },
  { name: 'auto_popup_once_per_session', type: 'INTEGER', default: '1' },

  // Team status / Business hours
  { name: 'show_team_status', type: 'INTEGER', default: '1' },
  { name: 'business_hours_enabled', type: 'INTEGER', default: '0' },
  { name: 'business_hours_start', type: 'TEXT', default: "'09:00'" },
  { name: 'business_hours_end', type: 'TEXT', default: "'17:00'" },
  { name: 'business_hours_timezone', type: 'TEXT', default: "'UTC'" },
  { name: 'business_hours_days', type: 'TEXT', default: "'[1,2,3,4,5]'" }, // JSON array Mon-Fri
  { name: 'online_text', type: 'TEXT', default: "'Online now'" },
  { name: 'away_text', type: 'TEXT', default: "'Away'" },
  { name: 'response_time_text', type: 'TEXT', default: "'Typically replies within a few hours'" },

  // Sound settings
  { name: 'sounds_enabled', type: 'INTEGER', default: '0' },
  { name: 'sound_new_message', type: 'INTEGER', default: '1' },
  { name: 'sound_message_sent', type: 'INTEGER', default: '1' },
  { name: 'sound_popup_open', type: 'INTEGER', default: '0' },
  { name: 'sound_volume', type: 'INTEGER', default: '50' },

  // Message status
  { name: 'show_message_status', type: 'INTEGER', default: '1' },
  { name: 'show_read_receipts', type: 'INTEGER', default: '1' },

  // Team logo
  { name: 'team_logo_enabled', type: 'INTEGER', default: '0' },
  { name: 'team_logo_url', type: 'TEXT', default: 'NULL' },

  // FAQ section (stored as JSON)
  { name: 'faq_enabled', type: 'INTEGER', default: '0' },
  { name: 'faq_title', type: 'TEXT', default: "'Frequently Asked Questions'" },
  { name: 'faq_items', type: 'TEXT', default: "'[]'" }, // JSON array

  // Docs links (stored as JSON)
  { name: 'docs_links', type: 'TEXT', default: "'[]'" }, // JSON array
  { name: 'show_search_in_chat', type: 'INTEGER', default: '1' }
];

try {
  // Get existing columns
  const tableInfo = db.prepare("PRAGMA table_info(support_chat_settings)").all();
  const existingColumns = tableInfo.map(col => col.name);

  let addedCount = 0;

  for (const col of newColumns) {
    if (!existingColumns.includes(col.name)) {
      const sql = `ALTER TABLE support_chat_settings ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`;
      console.log(`  Adding column: ${col.name}`);
      db.prepare(sql).run();
      addedCount++;
    } else {
      console.log(`  Column exists: ${col.name}`);
    }
  }

  // Also add columns to support_messages for read receipts (if table exists)
  try {
    const messagesInfo = db.prepare("PRAGMA table_info(support_messages)").all();
    if (messagesInfo.length > 0) {
      const messagesColumns = messagesInfo.map(col => col.name);

      if (!messagesColumns.includes('is_delivered')) {
        console.log('  Adding column: is_delivered to support_messages');
        db.prepare("ALTER TABLE support_messages ADD COLUMN is_delivered INTEGER DEFAULT 0").run();
        addedCount++;
      }

      if (!messagesColumns.includes('delivered_at')) {
        console.log('  Adding column: delivered_at to support_messages');
        db.prepare("ALTER TABLE support_messages ADD COLUMN delivered_at DATETIME").run();
        addedCount++;
      }

      if (!messagesColumns.includes('read_at')) {
        console.log('  Adding column: read_at to support_messages');
        db.prepare("ALTER TABLE support_messages ADD COLUMN read_at DATETIME").run();
        addedCount++;
      }
    } else {
      console.log('  Skipping support_messages columns (table not created yet)');
    }
  } catch (e) {
    console.log('  Skipping support_messages columns (table not created yet)');
  }

  console.log('');
  console.log(`✅ Migration complete! Added ${addedCount} new columns.`);
  console.log('');
  console.log('New features enabled:');
  console.log('  - Animation presets (slide_fade, scale_bounce, fade)');
  console.log('  - Auto-popup triggers (time, scroll, exit intent)');
  console.log('  - Business hours with online/away status');
  console.log('  - Sound effects (new message, sent, popup)');
  console.log('  - Message status indicators (sent, read)');
  console.log('  - Team logo in header');
  console.log('  - FAQ section with search');
  console.log('  - Docs links');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
