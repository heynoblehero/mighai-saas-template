require('dotenv').config();
const express = require('express');
const next = require('next');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');

// Lemon Squeezy initialization
const { lemonSqueezySetup, createCheckout, getProduct, getVariant, listProducts, listVariants } = require('@lemonsqueezy/lemonsqueezy.js');
const crypto = require('crypto');

// Simple encryption for OAuth tokens (in production, use a proper encryption library)
const encryptToken = (token) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.JWT_SECRET || 'fallback-secret', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decryptToken = (encryptedToken) => {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.JWT_SECRET || 'fallback-secret', 'salt', 32);
    const textParts = encryptedToken.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error);
    return null;
  }
};

// Setup Lemon Squeezy with API key
lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
  onError: (error) => console.error('Lemon Squeezy Error:', error),
});

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

// Reserved page slugs that cannot be used for regular pages
const RESERVED_PAGE_SLUGS = [
  'login',
  'signup', 
  'dashboard',
  'profile',
  'upgrade',
  'billing',
  'password-reset',
  'reset-password',
  'customer-login',
  'customer-signup',
  'customer-dashboard',
  'customer-profile',
  'customer-billing',
  'admin',
  'api',
  'blog',
  'subscribe',
  '_next'
];

// Database setup
const dbPath = process.env.NODE_ENV === 'production'
  ? path.join('/app/data', 'site_builder.db')
  : path.join(process.cwd(), 'site_builder.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Dynamic pages table
  db.run(`CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    meta_description TEXT,
    html_content TEXT NOT NULL,
    css_content TEXT,
    js_content TEXT,
    is_published BOOLEAN DEFAULT true,
    access_level TEXT DEFAULT 'public',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Blog posts table
  db.run(`CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image TEXT,
    is_published BOOLEAN DEFAULT false,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Plans table
  db.run(`CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    api_limit INTEGER NOT NULL DEFAULT 0,
    page_view_limit INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0.00,
    lemonsqueezy_product_id TEXT,
    lemonsqueezy_variant_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);


  // Initialize user sessions table
  db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_data TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Storage buckets table
  db.run(`CREATE TABLE IF NOT EXISTS storage_buckets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    allowed_file_types TEXT,
    max_file_size INTEGER DEFAULT 10485760,
    access_level TEXT DEFAULT 'private',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Storage files table
  db.run(`CREATE TABLE IF NOT EXISTS storage_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bucket_id INTEGER NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by TEXT,
    access_level TEXT DEFAULT 'private',
    metadata TEXT,
    virus_scanned BOOLEAN DEFAULT 0,
    scan_status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bucket_id) REFERENCES storage_buckets(id) ON DELETE CASCADE
  )`);

  // Create indexes for storage tables
  db.run(`CREATE INDEX IF NOT EXISTS idx_files_bucket ON storage_files(bucket_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON storage_files(uploaded_by)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_buckets_slug ON storage_buckets(slug)`);

  // Create default admin user if not exists
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, email, password, role)
          VALUES ('admin', 'admin@example.com', ?, 'admin')`, [defaultPassword]);

  // Create test subscriber users if not exists
  const testPassword = bcrypt.hashSync('test123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
          VALUES ('testuser', 'test@example.com', ?, 'subscriber')`, [testPassword]);
  
  const testPassword2 = bcrypt.hashSync('demo123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
          VALUES ('demouser', 'demo@example.com', ?, 'subscriber')`, [testPassword2]);

  // Create default free plan
  db.run(`INSERT OR IGNORE INTO plans (name, api_limit, page_view_limit, price, is_active) 
          VALUES ('free', 2, 10, 0.00, 1)`);

  // Add access_level column to existing pages table if not exists
  db.run(`ALTER TABLE pages ADD COLUMN access_level TEXT DEFAULT 'public'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding access_level column:', err);
    }
  });

  // Add plan and usage tracking columns to users table
  db.run(`ALTER TABLE users ADD COLUMN plan_id INTEGER DEFAULT 1`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding plan_id column:', err);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN api_calls_used INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding api_calls_used column:', err);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN page_views_used INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding page_views_used column:', err);
    }
  });

  // Add Lemon Squeezy columns to plans table
  db.run(`ALTER TABLE plans ADD COLUMN lemonsqueezy_product_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding lemonsqueezy_product_id column:', err);
    }
  });

  db.run(`ALTER TABLE plans ADD COLUMN lemonsqueezy_variant_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding lemonsqueezy_variant_id column:', err);
    }
  });

  // Add subscription tracking columns to users table
  db.run(`ALTER TABLE users ADD COLUMN lemonsqueezy_customer_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding lemonsqueezy_customer_id column:', err);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN lemonsqueezy_subscription_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding lemonsqueezy_subscription_id column:', err);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding subscription_status column:', err);
    }
  });

  // Analytics events table
  db.run(`CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    page_path TEXT,
    user_id INTEGER,
    session_id TEXT,
    user_agent TEXT,
    ip_address TEXT,
    referrer TEXT,
    event_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Heatmap sessions table for custom heatmap data
  db.run(`CREATE TABLE IF NOT EXISTS heatmap_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    page_path TEXT NOT NULL,
    page_url TEXT,
    user_id INTEGER,
    user_agent TEXT,
    ip_address TEXT,
    viewport_width INTEGER,
    viewport_height INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    total_clicks INTEGER DEFAULT 0,
    total_mouse_moves INTEGER DEFAULT 0,
    total_scroll_events INTEGER DEFAULT 0,
    heatmap_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // A/B testing experiments table
  db.run(`CREATE TABLE IF NOT EXISTS ab_experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    page_path TEXT,
    variant_a_content TEXT,
    variant_b_content TEXT,
    traffic_split INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // A/B testing assignments table
  db.run(`CREATE TABLE IF NOT EXISTS ab_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id INTEGER NOT NULL,
    user_id INTEGER,
    session_id TEXT,
    variant TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (experiment_id) REFERENCES ab_experiments (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Webhook integrations table
  db.run(`CREATE TABLE IF NOT EXISTS integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    webhook_url TEXT NOT NULL,
    request_method TEXT DEFAULT 'POST',
    request_headers TEXT,
    request_body_template TEXT NOT NULL,
    trigger_events TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Integration execution logs table
  db.run(`CREATE TABLE IF NOT EXISTS integration_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER NOT NULL,
    trigger_event TEXT NOT NULL,
    request_payload TEXT,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    execution_time INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (integration_id) REFERENCES integrations (id)
  )`);

  // API Worker Configuration table (single configuration)
  db.run(`CREATE TABLE IF NOT EXISTS api_worker_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    api_endpoint TEXT,
    request_method TEXT DEFAULT 'POST',
    request_headers TEXT,
    request_body_template TEXT,
    input_fields TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER,
    generated_worker_id INTEGER,
    generated_endpoint TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Add OAuth requirements column to api_worker_config if it doesn't exist
  db.run(`ALTER TABLE api_worker_config ADD COLUMN required_oauth_services TEXT DEFAULT '[]'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding required_oauth_services column:', err.message);
    }
  });

  // Add AI-generated endpoint support columns
  db.run(`ALTER TABLE api_worker_config ADD COLUMN generated_worker_id INTEGER`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding generated_worker_id column:', err.message);
    }
  });

  db.run(`ALTER TABLE api_worker_config ADD COLUMN generated_endpoint TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding generated_endpoint column:', err.message);
    }
  });

  // Note: enabled_for_subscribers column is already included in CREATE TABLE oauth_services
  
  // AI Workers table - for AI-generated backend routes
  db.run(`CREATE TABLE IF NOT EXISTS ai_workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workerName TEXT NOT NULL,
    routePath TEXT UNIQUE NOT NULL,
    httpMethod TEXT DEFAULT 'POST',
    description TEXT,
    prompt TEXT,
    context TEXT,
    requireAuth BOOLEAN DEFAULT true,
    accessLevel TEXT DEFAULT 'subscriber',
    workerType TEXT DEFAULT 'ai-api-worker',
    generatedCode TEXT,
    inputSchema TEXT,
    outputSchema TEXT,
    oauthRequirements TEXT,
    isActive BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // AI Worker Logs table for security monitoring
  db.run(`CREATE TABLE IF NOT EXISTS ai_worker_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    user_id INTEGER,
    status TEXT NOT NULL,
    execution_time INTEGER,
    error_message TEXT,
    input_data TEXT,
    output_data TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES ai_workers (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Integration Categories table
  db.run(`CREATE TABLE IF NOT EXISTS integration_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // AI API Services table
  db.run(`CREATE TABLE IF NOT EXISTS ai_api_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    api_endpoint TEXT,
    api_key_required BOOLEAN DEFAULT 1,
    api_key_encrypted TEXT,
    model_options TEXT,
    request_format TEXT,
    response_format TEXT,
    category_id INTEGER,
    icon_url TEXT,
    documentation_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    enabled_for_subscribers BOOLEAN DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES integration_categories (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // User AI API Connections table
  db.run(`CREATE TABLE IF NOT EXISTS user_ai_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ai_service_id INTEGER NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    model_preferences TEXT,
    usage_stats TEXT,
    is_active BOOLEAN DEFAULT 1,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (ai_service_id) REFERENCES ai_api_services (id),
    UNIQUE(user_id, ai_service_id)
  )`);

  // Integration Settings table for admin configurations
  db.run(`CREATE TABLE IF NOT EXISTS integration_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    show_integrations_page BOOLEAN DEFAULT 0,
    require_admin_approval BOOLEAN DEFAULT 0,
    auto_enable_new_services BOOLEAN DEFAULT 0,
    integration_categories_enabled TEXT DEFAULT '[]',
    updated_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users (id)
  )`);

  // Insert default integration categories
  const defaultCategories = [
    { name: 'ai', display_name: 'AI & Machine Learning', description: 'AI APIs and machine learning services', icon: '🤖', sort_order: 1 },
    { name: 'social', display_name: 'Social Media', description: 'Social media platforms and marketing', icon: '📱', sort_order: 2 },
    { name: 'productivity', display_name: 'Productivity', description: 'Productivity and collaboration tools', icon: '⚡', sort_order: 3 },
    { name: 'development', display_name: 'Development', description: 'Development tools and code repositories', icon: '💻', sort_order: 4 },
    { name: 'ecommerce', display_name: 'E-commerce', description: 'E-commerce and payment platforms', icon: '🛒', sort_order: 5 },
    { name: 'marketing', display_name: 'Marketing', description: 'Email marketing and CRM platforms', icon: '📧', sort_order: 6 },
    { name: 'communication', display_name: 'Communication', description: 'Communication and messaging platforms', icon: '💬', sort_order: 7 },
    { name: 'cloud', display_name: 'Cloud Storage', description: 'Cloud storage and file sharing', icon: '☁️', sort_order: 8 }
  ];

  defaultCategories.forEach(category => {
    db.run(`INSERT OR IGNORE INTO integration_categories (name, display_name, description, icon, sort_order) 
            VALUES (?, ?, ?, ?, ?)`,
      [category.name, category.display_name, category.description, category.icon, category.sort_order]);
  });

  // Insert default AI API services
  const defaultAIServices = [
    {
      name: 'openai',
      display_name: 'OpenAI',
      description: 'GPT models, DALL-E, Whisper, and more',
      api_endpoint: 'https://api.openai.com/v1',
      model_options: JSON.stringify(['gpt-4', 'gpt-3.5-turbo', 'dall-e-3', 'whisper-1']),
      icon_url: 'https://openai.com/favicon.ico',
      documentation_url: 'https://platform.openai.com/docs'
    },
    {
      name: 'anthropic',
      display_name: 'Anthropic Claude',
      description: 'Claude AI models for conversations and analysis',
      api_endpoint: 'https://api.anthropic.com/v1',
      model_options: JSON.stringify(['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']),
      icon_url: 'https://anthropic.com/favicon.ico',
      documentation_url: 'https://docs.anthropic.com'
    },
    {
      name: 'google_ai',
      display_name: 'Google AI',
      description: 'Gemini models and Google AI services',
      api_endpoint: 'https://generativelanguage.googleapis.com/v1',
      model_options: JSON.stringify(['gemini-pro', 'gemini-pro-vision']),
      icon_url: 'https://ai.google/favicon.ico',
      documentation_url: 'https://ai.google.dev'
    },
    {
      name: 'cohere',
      display_name: 'Cohere',
      description: 'Natural language processing and generation',
      api_endpoint: 'https://api.cohere.ai/v1',
      model_options: JSON.stringify(['command', 'command-light', 'embed']),
      icon_url: 'https://cohere.com/favicon.ico',
      documentation_url: 'https://docs.cohere.com'
    },
    {
      name: 'huggingface',
      display_name: 'Hugging Face',
      description: 'Open-source ML models and inference',
      api_endpoint: 'https://api-inference.huggingface.co',
      model_options: JSON.stringify(['text-generation', 'text-classification', 'translation']),
      icon_url: 'https://huggingface.co/favicon.ico',
      documentation_url: 'https://huggingface.co/docs'
    }
  ];

  // Get AI category ID and insert services
  db.get(`SELECT id FROM integration_categories WHERE name = 'ai'`, (err, aiCategory) => {
    if (!err && aiCategory) {
      defaultAIServices.forEach(service => {
        db.run(`INSERT OR IGNORE INTO ai_api_services (
          name, display_name, description, api_endpoint, model_options, 
          category_id, icon_url, documentation_url, request_format, response_format
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'json', 'json')`,
          [service.name, service.display_name, service.description, service.api_endpoint,
           service.model_options, aiCategory.id, service.icon_url, service.documentation_url]);
      });
    }
  });

  // Initialize integration settings
  db.run(`INSERT OR IGNORE INTO integration_settings (id, show_integrations_page, require_admin_approval, auto_enable_new_services, integration_categories_enabled)
          VALUES (1, 0, 0, 0, '[]')`);

  // Customer tasks table
  db.run(`CREATE TABLE IF NOT EXISTS customer_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id TEXT UNIQUE NOT NULL,
    input_data TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    api_response TEXT,
    error_message TEXT,
    execution_time INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);


  // Uploaded files table
  db.run(`CREATE TABLE IF NOT EXISTS uploaded_files (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    size INTEGER NOT NULL,
    mimetype TEXT NOT NULL,
    uploaded_by INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users (id)
  )`);


  // Error monitoring table for admin oversight
  db.run(`CREATE TABLE IF NOT EXISTS error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id TEXT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    input_data TEXT,
    api_endpoint TEXT,
    request_method TEXT,
    request_body TEXT,
    response_status INTEGER,
    response_data TEXT,
    user_email TEXT,
    user_plan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // OAuth Services table (Admin manages these)
  db.run(`CREATE TABLE IF NOT EXISTS oauth_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    authorization_url TEXT NOT NULL,
    token_url TEXT NOT NULL,
    scope_default TEXT,
    redirect_uri TEXT NOT NULL,
    icon_url TEXT,
    category TEXT DEFAULT 'other',
    is_active BOOLEAN DEFAULT 1,
    enabled_for_subscribers BOOLEAN DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // User OAuth Connections table (Subscriber connections)
  db.run(`CREATE TABLE IF NOT EXISTS user_oauth_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    oauth_service_id INTEGER NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at DATETIME,
    scope_granted TEXT,
    connection_data TEXT,
    profile_info TEXT,
    is_active BOOLEAN DEFAULT 1,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    last_refreshed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (oauth_service_id) REFERENCES oauth_services (id),
    UNIQUE(user_id, oauth_service_id)
  )`);

  // OAuth Authorization Log table (for security and debugging)
  db.run(`CREATE TABLE IF NOT EXISTS oauth_auth_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    oauth_service_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (oauth_service_id) REFERENCES oauth_services (id)
  )`);

  // Support messages table
  db.run(`CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    customer_email TEXT,
    message TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin')),
    is_read BOOLEAN DEFAULT false,
    is_subscriber BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);


  // Add new columns to existing support_messages table if they don't exist
  db.run(`ALTER TABLE support_messages ADD COLUMN customer_email TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding customer_email column:', err);
    }
  });

  db.run(`ALTER TABLE support_messages ADD COLUMN is_subscriber BOOLEAN DEFAULT true`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding is_subscriber column:', err);
    }
  });

  // Admin onboarding progress table
  db.run(`CREATE TABLE IF NOT EXISTS admin_onboarding (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    current_step INTEGER DEFAULT 0,
    completed_steps TEXT DEFAULT '[]',
    is_completed BOOLEAN DEFAULT false,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Admin 2FA Settings Table
  db.run(`CREATE TABLE IF NOT EXISTS admin_2fa_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    is_enabled BOOLEAN DEFAULT false,
    method TEXT DEFAULT 'email' CHECK (method IN ('email', 'telegram', 'both')),
    telegram_bot_token TEXT,
    telegram_chat_id TEXT,
    require_on_login BOOLEAN DEFAULT true,
    require_on_database_changes BOOLEAN DEFAULT true,
    require_on_page_changes BOOLEAN DEFAULT true,
    require_on_route_changes BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Admin 2FA OTP Sessions Table
  db.run(`CREATE TABLE IF NOT EXISTS admin_2fa_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    otp_code TEXT NOT NULL,
    method TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_data TEXT,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Custom API Routes System - Backend Routes Creator
  db.run(`CREATE TABLE IF NOT EXISTS custom_api_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    description TEXT,
    code TEXT NOT NULL,
    packages TEXT DEFAULT '[]',
    installed_packages TEXT DEFAULT '[]',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_executed_at DATETIME,
    execution_count INTEGER DEFAULT 0,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // API Route Execution Logs
  db.run(`CREATE TABLE IF NOT EXISTS api_route_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    request_method TEXT NOT NULL,
    request_headers TEXT,
    request_body TEXT,
    request_query TEXT,
    request_params TEXT,
    response_status INTEGER,
    response_data TEXT,
    execution_time_ms INTEGER,
    console_logs TEXT DEFAULT '[]',
    error_message TEXT,
    error_stack TEXT,
    ip_address TEXT,
    user_agent TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES custom_api_routes (id) ON DELETE CASCADE
  )`);

  // Server Logs
  db.run(`CREATE TABLE IF NOT EXISTS server_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_type TEXT NOT NULL CHECK (log_type IN ('info', 'error', 'warning', 'debug')),
    message TEXT NOT NULL,
    context TEXT,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Login Attempts Tracking Table - For Brute Force Protection
  db.run(`CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    device_fingerprint TEXT,
    attempt_type TEXT NOT NULL CHECK (attempt_type IN ('admin', 'customer', 'otp')),
    success BOOLEAN DEFAULT 0,
    failure_reason TEXT,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create indexes for login_attempts table
  db.run(`CREATE INDEX IF NOT EXISTS idx_email_attempted ON login_attempts (email, attempted_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ip_attempted ON login_attempts (ip_address, attempted_at)`);

  // Security Events Table - For Audit Logging
  db.run(`CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id INTEGER,
    email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    device_fingerprint TEXT,
    event_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Create indexes for security_events table
  db.run(`CREATE INDEX IF NOT EXISTS idx_event_type_created ON security_events (event_type, created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_severity_created ON security_events (severity, created_at)`);

  // Add account lockout columns to users table
  db.run(`ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding failed_login_attempts column:', err);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN locked_until DATETIME NULL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding locked_until column:', err);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN last_failed_login DATETIME NULL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding last_failed_login column:', err);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN last_successful_login DATETIME NULL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding last_successful_login column:', err);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN last_login_ip TEXT NULL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding last_login_ip column:', err);
    }
  });
});

// Passport configuration
passport.use(new LocalStrategy({
  usernameField: 'email'
}, (email, password, done) => {
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'Invalid credentials' });
    
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return done(err);
      if (isMatch) return done(null, user);
      return done(null, false, { message: 'Invalid credentials' });
    });
  });
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    done(err, user);
  });
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + extension;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedExtensions = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|json|xml/;
    const allowedMimetypes = /image|application\/pdf|application\/msword|application\/vnd\.openxmlformats|text|application\/json|application\/xml/;
    
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.test(file.mimetype);
    
    console.log(`File validation - Name: ${file.originalname}, Type: ${file.mimetype}, Extension: ${path.extname(file.originalname)}, Allowed: ${mimetype || extname}`);
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error(`Invalid file type. File: ${file.originalname}, Type: ${file.mimetype}. Allowed: images, PDFs, documents, text files`));
    }
  }
});

nextApp.prepare().then(() => {
  const server = express();

  // Middleware
  server.use(helmet({
    contentSecurityPolicy: false // Disable for development
  }));
  server.use(cors());
  // Increase body parser limits to handle larger payloads
  server.use(bodyParser.json({ 
    limit: '50mb',
    parameterLimit: 100000
  }));
  server.use(bodyParser.urlencoded({ 
    extended: true,
    limit: '50mb',
    parameterLimit: 100000
  }));
  server.use(session({
    store: new FileStore({
      path: path.join(__dirname, '.sessions'),
      ttl: 86400, // 24 hours in seconds
      retries: 0,
      reapInterval: 3600 // Clean up expired sessions every hour
    }),
    secret: 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 86400000 // 24 hours in milliseconds
    }
  }));
  server.use(passport.initialize());
  server.use(passport.session());

  // Authentication middleware - for admin only
  const requireAuth = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
      return next();
    }
    res.status(401).json({ error: 'Admin authentication required' });
  };

  // Authentication middleware - for subscribers only
  const requireSubscriberAuth = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'subscriber') {
      return next();
    }
    res.status(401).json({ error: 'Subscriber authentication required' });
  };

  // Authentication middleware - for any authenticated user (admin or subscriber)
  const requireAnyAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Authentication required' });
  };

  // Handle root path FIRST - before any other routes
  server.get('/', (req, res) => {
    console.log('Root path accessed - checking for home page');
    db.get('SELECT * FROM pages WHERE slug = ? AND is_published = true', ['home'], (err, page) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Server error');
      }
      if (!page) {
        console.log('No home page found, using Next.js default');
        // If no dynamic home page found, use Next.js default
        return handle(req, res);
      }
      
      // Check access permissions
      if (page.access_level === 'subscriber') {
        if (!req.isAuthenticated() || (req.user.role !== 'subscriber' && req.user.role !== 'admin')) {
          return res.redirect('/subscribe/login?redirect=/');
        }
      }
      
      console.log('Serving dynamic home page');
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title}</title>
  <meta name="description" content="${page.meta_description || ''}">
  <style>${page.css_content || ''}</style>
</head>
<body>
  ${page.html_content}
  <script>${page.js_content || ''}</script>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    });
  });

  // API Routes

  // File Upload Routes
  server.post('/api/upload', requireAuth, upload.array('files', 10), (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploadedFiles = req.files.map(file => ({
        id: uuidv4(),
        original_name: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        uploaded_by: req.user.id,
        uploaded_at: new Date().toISOString()
      }));

      // Store file info in database
      uploadedFiles.forEach(fileInfo => {
        db.run(`INSERT INTO uploaded_files (id, original_name, filename, path, size, mimetype, uploaded_by, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [fileInfo.id, fileInfo.original_name, fileInfo.filename, fileInfo.path, 
           fileInfo.size, fileInfo.mimetype, fileInfo.uploaded_by, fileInfo.uploaded_at]);
      });

      res.json({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        files: uploadedFiles
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get uploaded files
  server.get('/api/files', requireAuth, (req, res) => {
    const { limit = 50 } = req.query;
    db.all('SELECT * FROM uploaded_files WHERE uploaded_by = ? ORDER BY uploaded_at DESC LIMIT ?',
      [req.user.id, parseInt(limit)], (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(files);
      });
  });

  // Delete uploaded file
  server.delete('/api/files/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM uploaded_files WHERE id = ? AND uploaded_by = ?',
      [id, req.user.id], (err, file) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!file) return res.status(404).json({ error: 'File not found' });

        // Delete physical file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        // Delete from database
        db.run('DELETE FROM uploaded_files WHERE id = ?', [id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'File deleted successfully' });
        });
      });
  });

  // Serve uploaded files
  server.get('/api/files/serve/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(filePath);
  });

  // Public API routes (must come first, use different path to avoid Next.js interception)
  server.get('/api-public/blog', (req, res) => {
    db.all('SELECT * FROM blog_posts WHERE is_published = true ORDER BY created_at DESC', (err, posts) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(posts);
    });
  });

  server.get('/api-public/blog/:slug', (req, res) => {
    const { slug } = req.params;
    db.get('SELECT * FROM blog_posts WHERE slug = ? AND is_published = true', [slug], (err, post) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!post) return res.status(404).json({ error: 'Post not found' });
      res.json(post);
    });
  });

  // Authentication routes
  server.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    res.json({ user: { id: req.user.id, username: req.user.username, email: req.user.email, role: req.user.role } });
  });

  server.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ error: 'Logout failed' });
      res.json({ message: 'Logged out successfully' });
    });
  });

  server.get('/api/auth/me', (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: { id: req.user.id, username: req.user.username, email: req.user.email, role: req.user.role } });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // Subscriber registration
  server.post('/api/subscribe/register', (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    // Check if user already exists
    db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], (err, existingUser) => {
      if (err) return res.status(500).json({ error: err.message });
      if (existingUser) return res.status(400).json({ error: 'User already exists' });

      // Hash password and create subscriber
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.run(`INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'subscriber')`,
        [username, email, hashedPassword],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Account created successfully', id: this.lastID });
        });
    });
  });

  // Subscriber login
  server.post('/api/subscribe/login', passport.authenticate('local'), (req, res) => {
    if (req.user.role !== 'subscriber') {
      return res.status(403).json({ error: 'Subscriber access required' });
    }
    res.json({ 
      user: { 
        id: req.user.id, 
        username: req.user.username, 
        email: req.user.email, 
        role: req.user.role 
      } 
    });
  });

  // Check subscriber status with plan info
  server.get('/api/subscribe/me', (req, res) => {
    if (req.isAuthenticated() && (req.user.role === 'subscriber' || req.user.role === 'admin')) {
      db.get(`SELECT u.id, u.username, u.email, u.role, u.api_calls_used, u.page_views_used,
                     p.name as plan_name, p.api_limit, p.page_view_limit, p.price
              FROM users u 
              LEFT JOIN plans p ON u.plan_id = p.id 
              WHERE u.id = ?`, [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ user });
      });
    } else {
      res.status(401).json({ error: 'Not authenticated as subscriber' });
    }
  });

  // Get API Worker configuration for customers (only if active)
  server.get('/api/api-worker-config/public', requireSubscriberAuth, (req, res) => {
    db.get('SELECT input_fields, is_active, generated_endpoint, generated_worker_id FROM api_worker_config WHERE id = 1 AND is_active = 1', (err, config) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!config) {
        return res.json({ available: false, message: 'No AI-powered services are currently available' });
      }
      
      res.json({
        available: true,
        input_fields: JSON.parse(config.input_fields || '[]'),
        service_type: 'ai_generated',
        generated_endpoint: config.generated_endpoint,
        generated_worker_id: config.generated_worker_id
      });
    });
  });

  // Create new task (with optional file upload support)
  server.post('/api/tasks/create', requireSubscriberAuth, upload.any(), async (req, res) => {
    let input_data = req.body.input_data;
    
    // If input_data is a string (from form data), parse it
    if (typeof input_data === 'string') {
      try {
        input_data = JSON.parse(input_data);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid input_data format' });
      }
    }
    
    // If files were uploaded, add them to input_data
    if (req.files && req.files.length > 0) {
      const uploadedFiles = req.files.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        url: `/api/files/serve/${file.filename}`
      }));
      
      // Add files to input data
      input_data.uploaded_files = uploadedFiles;
    }
    
    const userId = req.user.id;
    
    // Check user's API limits
    db.get(`SELECT u.api_calls_used, p.api_limit, p.name as plan_name
            FROM users u 
            LEFT JOIN plans p ON u.plan_id = p.id 
            WHERE u.id = ?`, [userId], async (err, userPlan) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (!userPlan) {
        return res.status(404).json({ error: 'User plan not found' });
      }

      // Check if user has exceeded their limit
      if (userPlan.api_calls_used >= userPlan.api_limit) {
        return res.status(429).json({ 
          error: 'API call limit exceeded', 
          current_usage: userPlan.api_calls_used,
          limit: userPlan.api_limit,
          plan: userPlan.plan_name
        });
      }

      // Get API Worker configuration
      db.get('SELECT * FROM api_worker_config WHERE id = 1 AND is_active = 1', async (err, config) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!config) return res.status(404).json({ error: 'Service is not currently available' });

        // Check OAuth requirements
        const requiredOAuthServices = JSON.parse(config.required_oauth_services || '[]');
        
        if (requiredOAuthServices.length > 0) {
          // Get user's OAuth connections
          const userConnections = await new Promise((resolve, reject) => {
            db.all(`SELECT oauth_service_id FROM user_oauth_connections 
                    WHERE user_id = ? AND is_active = 1 AND oauth_service_id IN (${requiredOAuthServices.map(() => '?').join(',')})`,
              [userId, ...requiredOAuthServices], (err, connections) => {
                if (err) reject(err);
                else resolve(connections);
              });
          });

          const connectedServices = userConnections.map(conn => conn.oauth_service_id);
          const missingServices = requiredOAuthServices.filter(serviceId => !connectedServices.includes(serviceId));

          if (missingServices.length > 0) {
            // Get service names for better error message
            const serviceNames = await new Promise((resolve, reject) => {
              db.all(`SELECT display_name FROM oauth_services WHERE id IN (${missingServices.map(() => '?').join(',')})`,
                missingServices, (err, services) => {
                  if (err) reject(err);
                  else resolve(services.map(s => s.display_name));
                });
            });

            return res.status(403).json({
              error: 'OAuth connections required',
              message: `You must connect your accounts to the following services before using this API: ${serviceNames.join(', ')}`,
              required_services: serviceNames,
              missing_connections: missingServices.length,
              connect_url: '/dashboard/connections'
            });
          }
        }

        // Continue with existing logic

        // Generate unique task ID
        const taskId = uuidv4();
        
        try {
          // Create task record
          db.run(`INSERT INTO customer_tasks (user_id, task_id, input_data, status) 
                  VALUES (?, ?, ?, 'pending')`,
            [userId, taskId, JSON.stringify(input_data)], async function(err) {
              if (err) return res.status(500).json({ error: err.message });

              const taskDbId = this.lastID;

              try {
                // Execute AI-generated endpoint request
                let result;
                if (config.generated_endpoint) {
                  // Use AI-generated endpoint
                  const response = await fetch(`http://localhost:${process.env.PORT || 3000}${config.generated_endpoint}`, {
                    method: config.request_method || 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${userId}`
                    },
                    body: JSON.stringify(input_data)
                  });

                  const responseData = await response.json();
                  result = {
                    data: responseData,
                    execution_time: Date.now() - Date.now() // Simplified timing
                  };
                } else {
                  // Fallback to old API worker if still configured
                  result = await executeAPIWorkerRequest(config, input_data);
                }
                
                // Update task record with success
                db.run(`UPDATE customer_tasks SET 
                        status = 'completed', 
                        api_response = ?, 
                        execution_time = ?, 
                        updated_at = CURRENT_TIMESTAMP 
                        WHERE id = ?`,
                  [JSON.stringify(result.data), result.execution_time, taskDbId], (err) => {
                    if (err) console.error('Failed to update task:', err);
                  });

                // Increment API calls used
                db.run('UPDATE users SET api_calls_used = api_calls_used + 1 WHERE id = ?', [userId], (err) => {
                  if (err) console.error('Failed to update API usage:', err);
                });

                res.json({
                  success: true,
                  task_id: taskId,
                  message: 'Task completed successfully',
                  usage: {
                    calls_used: userPlan.api_calls_used + 1,
                    calls_remaining: userPlan.api_limit - (userPlan.api_calls_used + 1),
                    plan: userPlan.plan_name
                  }
                });

              } catch (error) {
                console.error('❌ Task execution failed:', error);
                
                // Log error for admin monitoring
                await logError(
                  userId, 
                  taskId, 
                  'API_WORKER_REQUEST_FAILED',
                  error.error || error.message,
                  error.stack || error.toString(),
                  input_data,
                  config,
                  error.response || { status: error.status, data: error.details }
                );
                
                // Update task record with failure
                db.run(`UPDATE customer_tasks SET 
                        status = 'failed', 
                        error_message = ?, 
                        execution_time = ?, 
                        updated_at = CURRENT_TIMESTAMP 
                        WHERE id = ?`,
                  [error.error || error.message, error.execution_time || 0, taskDbId], (err) => {
                    if (err) console.error('Failed to update task:', err);
                  });

                res.status(500).json({
                  success: false,
                  task_id: taskId,
                  error: error.error || error.message,
                  details: error.details || 'Unknown error occurred'
                });
              }
            });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    });
  });

  // Get customer's tasks
  server.get('/api/tasks', requireSubscriberAuth, (req, res) => {
    const userId = req.user.id;
    const { status, limit = 50 } = req.query;
    
    let query = `SELECT * FROM customer_tasks WHERE user_id = ?`;
    let params = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(query, params, (err, tasks) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Parse JSON fields
      const tasksWithParsedData = tasks.map(task => ({
        ...task,
        input_data: JSON.parse(task.input_data || '{}'),
        api_response: task.api_response ? JSON.parse(task.api_response) : null
      }));
      
      res.json(tasksWithParsedData);
    });
  });

  // Get specific task details - returns raw API JSON response
  server.get('/api/tasks/:taskId/result', requireSubscriberAuth, (req, res) => {
    const { taskId } = req.params;
    const userId = req.user.id;
    
    db.get(`SELECT api_response, status FROM customer_tasks WHERE task_id = ? AND user_id = ?`, 
      [taskId, userId], (err, task) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!task) return res.status(404).json({ error: 'Task not found' });
        if (task.status !== 'completed') {
          return res.status(400).json({ error: 'Task not completed yet' });
        }
        
        // Return the raw API response JSON
        const apiResponse = JSON.parse(task.api_response || '{}');
        res.json(apiResponse);
      });
  });

  // Legacy worker API endpoint (keeping for backward compatibility)
  server.post('/api/worker/call', requireSubscriberAuth, (req, res) => {
    const userId = req.user.id;
    
    // Get user's current plan and usage
    db.get(`SELECT u.api_calls_used, p.api_limit, p.name as plan_name
            FROM users u 
            LEFT JOIN plans p ON u.plan_id = p.id 
            WHERE u.id = ?`, [userId], (err, userPlan) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (!userPlan) {
        return res.status(404).json({ error: 'User plan not found' });
      }

      // Check if user has exceeded their limit
      if (userPlan.api_calls_used >= userPlan.api_limit) {
        return res.status(429).json({ 
          error: 'API call limit exceeded', 
          current_usage: userPlan.api_calls_used,
          limit: userPlan.api_limit,
          plan: userPlan.plan_name
        });
      }

      // Increment API calls used
      db.run('UPDATE users SET api_calls_used = api_calls_used + 1 WHERE id = ?', [userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // For now, simulate worker response
        // In real implementation, you'd call your actual worker here
        const workerResponse = {
          success: true,
          message: 'Worker task completed successfully',
          data: {
            processed_at: new Date().toISOString(),
            task_id: Math.random().toString(36).substr(2, 9)
          },
          usage: {
            calls_used: userPlan.api_calls_used + 1,
            calls_remaining: userPlan.api_limit - (userPlan.api_calls_used + 1),
            plan: userPlan.plan_name
          }
        };

        res.json(workerResponse);
      });
    });
  });

  // Admin - get all subscribers with plan info
  server.get('/api/subscribers', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    db.all(`SELECT u.id, u.username, u.email, u.role, u.created_at, u.api_calls_used, u.page_views_used,
                   p.name as plan_name, p.api_limit, p.page_view_limit, p.price
            FROM users u 
            LEFT JOIN plans p ON u.plan_id = p.id 
            WHERE u.role = ? ORDER BY u.created_at DESC`, ['subscriber'], (err, subscribers) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(subscribers);
    });
  });

  // Plans API routes (Admin only)
  server.get('/api/plans', requireAuth, (req, res) => {
    db.all('SELECT * FROM plans ORDER BY price ASC', (err, plans) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(plans);
    });
  });

  // Public plans API (for subscribers to view available plans)
  server.get('/api/plans/public', (req, res) => {
    db.all('SELECT id, name, api_limit, page_view_limit, price, is_active FROM plans WHERE is_active = 1 ORDER BY price ASC', (err, plans) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(plans);
    });
  });

  server.post('/api/plans', requireAuth, async (req, res) => {
    const { name, api_limit, page_view_limit, price, is_active } = req.body;
    
    if (!name || api_limit === undefined || page_view_limit === undefined) {
      return res.status(400).json({ error: 'Name, API limit, and page view limit are required' });
    }

    try {
      let lemonSqueezyProductId = null;
      let lemonSqueezyVariantId = null;

      // Create Lemon Squeezy product and variant for paid plans
      if (price > 0) {
        // Note: For Lemon Squeezy, you typically create products and variants manually in the dashboard
        // and then reference them by ID. This is a simplified example - you would need actual product/variant IDs
        // from your Lemon Squeezy store.
        
        // You can get these IDs from your Lemon Squeezy dashboard or by using the API
        console.log(`Creating plan for ${name} - Price: $${price}`);
        console.log('Note: Lemon Squeezy products/variants should be created in the dashboard first');
        
        // For now, we'll store null values - you'll need to update these with actual IDs
        // from your Lemon Squeezy store
        lemonSqueezyProductId = null; // Replace with actual product ID
        lemonSqueezyVariantId = null; // Replace with actual variant ID
      }

      // Insert plan into database
      db.run(`INSERT INTO plans (name, api_limit, page_view_limit, price, lemonsqueezy_product_id, lemonsqueezy_variant_id, is_active) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, api_limit, page_view_limit, price || 0, lemonSqueezyProductId, lemonSqueezyVariantId, is_active !== false],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ 
            id: this.lastID, 
            message: 'Plan created successfully',
            lemonsqueezy_product_id: lemonSqueezyProductId,
            lemonsqueezy_variant_id: lemonSqueezyVariantId
          });
        });

    } catch (lemonSqueezyError) {
      console.error('Lemon Squeezy error:', lemonSqueezyError);
      res.status(500).json({ error: 'Failed to create Lemon Squeezy product/variant: ' + lemonSqueezyError.message });
    }
  });

  server.put('/api/plans/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { name, api_limit, page_view_limit, price, is_active } = req.body;
    
    db.run(`UPDATE plans SET name = ?, api_limit = ?, page_view_limit = ?, price = ?, 
            is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, api_limit, page_view_limit, price, is_active, id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Plan updated successfully' });
      });
  });

  server.delete('/api/plans/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // Don't allow deleting free plan or plans with active users
    db.get('SELECT COUNT(*) as user_count FROM users WHERE plan_id = ?', [id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (result.user_count > 0) {
        return res.status(400).json({ error: 'Cannot delete plan with active users' });
      }

      db.run('DELETE FROM plans WHERE id = ? AND name != "free"', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
          return res.status(400).json({ error: 'Cannot delete free plan or plan not found' });
        }
        res.json({ message: 'Plan deleted successfully' });
      });
    });
  });

  // Generate checkout link for embedding (public endpoint)
  server.get('/api/checkout-link/:planId', async (req, res) => {
    const { planId } = req.params;
    
    try {
      // Get plan details
      db.get('SELECT * FROM plans WHERE id = ? AND is_active = 1', [planId], async (err, plan) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!plan) return res.status(404).json({ error: 'Plan not found' });
        
        if (!plan.lemonsqueezy_variant_id) {
          return res.status(400).json({ error: 'Plan is not available for purchase' });
        }

        try {
          // Create Lemon Squeezy checkout session
          const checkoutData = {
            data: {
              type: 'checkouts',
              attributes: {
                checkout_data: {
                  custom: {
                    plan_id: planId.toString(),
                    plan_name: plan.name
                  }
                }
              },
              relationships: {
                store: {
                  data: {
                    type: 'stores',
                    id: process.env.LEMONSQUEEZY_STORE_ID
                  }
                },
                variant: {
                  data: {
                    type: 'variants',
                    id: plan.lemonsqueezy_variant_id
                  }
                }
              }
            }
          };

          const checkout = await createCheckout(
            process.env.LEMONSQUEEZY_STORE_ID,
            plan.lemonsqueezy_variant_id,
            {
              checkoutData: checkoutData.data.attributes.checkout_data
            }
          );

          res.json({ checkout_url: checkout.data.attributes.url });
        } catch (lemonSqueezyError) {
          console.error('Lemon Squeezy checkout error:', lemonSqueezyError);
          res.status(500).json({ error: 'Failed to create checkout session' });
        }
      });
    } catch (error) {
      console.error('Checkout link error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Lemon Squeezy checkout session creation
  server.post('/api/create-checkout-session', requireSubscriberAuth, async (req, res) => {
    const { plan_id } = req.body;
    
    if (!plan_id) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    try {
      // Get plan details
      db.get('SELECT * FROM plans WHERE id = ? AND is_active = 1', [plan_id], async (err, plan) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!plan) return res.status(404).json({ error: 'Plan not found' });
        
        if (!plan.lemonsqueezy_variant_id) {
          return res.status(400).json({ error: 'Plan is not available for purchase' });
        }

        try {
          // Create Lemon Squeezy checkout session
          const checkout = await createCheckout(
            process.env.LEMONSQUEEZY_STORE_ID,
            plan.lemonsqueezy_variant_id,
            {
              checkoutData: {
                email: req.user.email,
                custom: {
                  user_id: req.user.id.toString(),
                  username: req.user.username,
                  plan_id: plan_id.toString(),
                  plan_name: plan.name
                }
              }
            }
          );

          res.json({ checkout_url: checkout.data.attributes.url });
        } catch (lemonSqueezyError) {
          console.error('Lemon Squeezy checkout error:', lemonSqueezyError);
          res.status(500).json({ error: 'Failed to create checkout session' });
        }
      });
    } catch (error) {
      console.error('Checkout session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Lemon Squeezy webhook handler
  server.post('/api/lemonsqueezy-webhook', express.json(), (req, res) => {
    const payload = req.body;
    const sig = req.headers['x-signature'];
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    // Verify webhook signature (implement based on Lemon Squeezy docs)
    if (secret && sig) {
      const crypto = require('crypto');
      const expectedSig = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
      
      if (`sha256=${expectedSig}` !== sig) {
        console.error('Webhook signature verification failed');
        return res.status(400).send('Webhook Error: Invalid signature');
      }
    }

    // Handle the event
    const eventName = payload.meta?.event_name;
    
    switch (eventName) {
      case 'order_created':
        handleSuccessfulPayment(payload.data);
        break;
      
      case 'subscription_payment_success':
        handleSuccessfulSubscriptionRenewal(payload.data);
        break;
      
      case 'subscription_cancelled':
        handleSubscriptionCancellation(payload.data);
        break;

      default:
        console.log(`Unhandled event type ${eventName}`);
    }

    res.json({received: true});
  });

  // Helper functions for webhook events
  function handleSuccessfulPayment(orderData) {
    const customData = orderData.attributes.custom_data || {};
    const userId = customData.user_id;
    const planId = customData.plan_id;
    
    if (userId) {
      // User was authenticated during checkout
      db.run(`UPDATE users SET 
              plan_id = ?, 
              lemonsqueezy_order_id = ?, 
              lemonsqueezy_customer_id = ?,
              subscription_status = 'active',
              api_calls_used = 0,
              page_views_used = 0
              WHERE id = ?`, 
        [planId, orderData.id, orderData.attributes.customer_id, userId], (err) => {
          if (err) {
            console.error('Error updating user subscription:', err);
          } else {
            console.log(`User ${userId} upgraded to plan ${planId}`);
          }
        });
    } else {
      // Payment from public checkout link - find or create user by email
      const customerEmail = orderData.attributes.user_email;
      
      if (customerEmail) {
        db.get('SELECT * FROM users WHERE email = ?', [customerEmail], (err, user) => {
          if (err) {
            console.error('Error finding user by email:', err);
            return;
          }
          
          if (user) {
            // Update existing user
            db.run(`UPDATE users SET 
                    plan_id = ?, 
                    lemonsqueezy_order_id = ?, 
                    lemonsqueezy_customer_id = ?,
                    subscription_status = 'active',
                    api_calls_used = 0,
                    page_views_used = 0
                    WHERE id = ?`, 
              [planId, orderData.id, orderData.attributes.customer_id, user.id], (err) => {
                if (err) {
                  console.error('Error updating existing user subscription:', err);
                } else {
                  console.log(`Existing user ${user.id} upgraded to plan ${planId}`);
                }
              });
          } else {
            // Create new subscriber account
            const bcrypt = require('bcryptjs');
            const tempPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = bcrypt.hashSync(tempPassword, 10);
            const username = customerEmail.split('@')[0];
            
            db.run(`INSERT INTO users (username, email, password, role, plan_id, lemonsqueezy_order_id, lemonsqueezy_customer_id, subscription_status) 
                    VALUES (?, ?, ?, 'subscriber', ?, ?, ?, 'active')`,
              [username, customerEmail, hashedPassword, planId, orderData.id, orderData.attributes.customer_id], function(err) {
                if (err) {
                  console.error('Error creating new subscriber:', err);
                } else {
                  console.log(`New subscriber ${this.lastID} created with plan ${planId}`);
                  // TODO: Send welcome email with login instructions
                }
              });
          }
        });
      }
    }
  }

  function handleSuccessfulSubscriptionRenewal(subscriptionInvoiceData) {
    if (subscriptionInvoiceData.attributes.subscription_id) {
      db.run(`UPDATE users SET 
              subscription_status = 'active',
              api_calls_used = 0,
              page_views_used = 0
              WHERE lemonsqueezy_subscription_id = ?`, 
        [subscriptionInvoiceData.attributes.subscription_id], (err) => {
          if (err) {
            console.error('Error renewing subscription:', err);
          } else {
            console.log(`Subscription renewed: ${subscriptionInvoiceData.attributes.subscription_id}`);
          }
        });
    }
  }

  function handleSubscriptionCancellation(subscriptionData) {
    db.run(`UPDATE users SET 
            plan_id = 1,
            lemonsqueezy_subscription_id = NULL,
            subscription_status = 'inactive'
            WHERE lemonsqueezy_subscription_id = ?`, 
      [subscriptionData.id], (err) => {
        if (err) {
          console.error('Error cancelling subscription:', err);
        } else {
          console.log(`Subscription cancelled: ${subscriptionData.id}`);
        }
      });
  }

  // Analytics API routes
  server.post('/api/analytics/track', (req, res) => {
    const { event_type, page_path, event_data, session_id } = req.body;
    const user_id = req.isAuthenticated() ? req.user.id : null;
    const user_agent = req.get('User-Agent');
    const ip_address = req.ip || req.connection.remoteAddress;
    const referrer = req.get('Referer');

    db.run(`INSERT INTO analytics_events (event_type, page_path, user_id, session_id, user_agent, ip_address, referrer, event_data) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [event_type, page_path, user_id, session_id, user_agent, ip_address, referrer, JSON.stringify(event_data)],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
  });

  // Custom Heatmap Data Collection API
  server.post('/api/heatmap/data', (req, res) => {
    const { 
      clicks, 
      mouseMoves, 
      scrollData, 
      sessionId, 
      pageUrl, 
      pagePath, 
      viewport, 
      startTime, 
      endTime,
      totalClicks,
      totalMouseMoves,
      totalScrollEvents
    } = req.body;
    
    const user_id = req.isAuthenticated() ? req.user.id : null;
    const user_agent = req.get('User-Agent');
    const ip_address = req.ip || req.connection.remoteAddress;

    // Store heatmap session data
    db.run(`INSERT INTO heatmap_sessions (
              session_id, page_path, page_url, user_id, user_agent, ip_address,
              viewport_width, viewport_height, start_time, end_time,
              total_clicks, total_mouse_moves, total_scroll_events, heatmap_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId, pagePath, pageUrl, user_id, user_agent, ip_address,
        viewport.width, viewport.height, new Date(startTime), new Date(endTime),
        totalClicks, totalMouseMoves, totalScrollEvents,
        JSON.stringify({ clicks, mouseMoves, scrollData })
      ],
      function(err) {
        if (err) {
          console.error('Heatmap data storage error:', err);
          return res.status(500).json({ error: err.message });
        }
        
        console.log(`Heatmap data stored for session ${sessionId}: ${totalClicks} clicks, ${totalMouseMoves} mouse moves, ${totalScrollEvents} scroll events`);
        res.json({ success: true, session_id: sessionId });
      });
  });

  // Get heatmap data (admin only)
  server.get('/api/heatmap/sessions', requireAuth, (req, res) => {
    const { page_path, start_date, end_date, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM heatmap_sessions WHERE 1=1';
    const params = [];

    if (page_path) {
      query += ' AND page_path = ?';
      params.push(page_path);
    }

    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date + ' 23:59:59');
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(query, params, (err, sessions) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Parse heatmap_data JSON for each session
      const processedSessions = sessions.map(session => ({
        ...session,
        heatmap_data: session.heatmap_data ? JSON.parse(session.heatmap_data) : null
      }));

      res.json(processedSessions);
    });
  });

  // Heatmap configuration endpoints
  server.get('/api/heatmaps/config', requireAuth, (req, res) => {
    // Return heatmap configuration settings
    res.json({
      enabled: true,
      collection_enabled: true,
      third_party_integrations: [],
      settings: {
        click_tracking: true,
        mouse_movement: true,
        scroll_tracking: true,
        session_recording: false
      }
    });
  });

  server.post('/api/heatmaps/config', requireAuth, (req, res) => {
    // Update heatmap configuration (for future implementation)
    const { enabled, collection_enabled, settings } = req.body;
    
    // For now, just return success - in the future this could save to database
    res.json({
      success: true,
      message: 'Heatmap configuration updated',
      config: {
        enabled: enabled ?? true,
        collection_enabled: collection_enabled ?? true,
        settings: settings || {
          click_tracking: true,
          mouse_movement: true,
          scroll_tracking: true,
          session_recording: false
        }
      }
    });
  });

  // Get analytics data (admin only)
  server.get('/api/analytics/dashboard', requireAuth, (req, res) => {
    const { start_date, end_date, event_type } = req.query;
    
    let query = 'SELECT * FROM analytics_events WHERE 1=1';
    let params = [];

    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }
    if (event_type) {
      query += ' AND event_type = ?';
      params.push(event_type);
    }

    query += ' ORDER BY created_at DESC LIMIT 1000';

    db.all(query, params, (err, events) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(events);
    });
  });

  // Get analytics summary
  server.get('/api/analytics/summary', requireAuth, (req, res) => {
    const summaryQueries = [
      // Page views by day
      `SELECT DATE(created_at) as date, COUNT(*) as views 
       FROM analytics_events 
       WHERE event_type = 'page_view' AND created_at >= date('now', '-30 days')
       GROUP BY DATE(created_at) 
       ORDER BY date DESC`,
      
      // Top pages
      `SELECT page_path, COUNT(*) as views 
       FROM analytics_events 
       WHERE event_type = 'page_view' AND created_at >= date('now', '-30 days')
       GROUP BY page_path 
       ORDER BY views DESC 
       LIMIT 10`,
      
      // Event types summary
      `SELECT event_type, COUNT(*) as count 
       FROM analytics_events 
       WHERE created_at >= date('now', '-30 days')
       GROUP BY event_type 
       ORDER BY count DESC`
    ];

    Promise.all(summaryQueries.map(query => 
      new Promise((resolve, reject) => {
        db.all(query, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      })
    )).then(([pageViewsByDay, topPages, eventTypes]) => {
      res.json({
        pageViewsByDay,
        topPages,
        eventTypes
      });
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
  });

  // A/B Testing API routes
  server.get('/api/ab-experiments', requireAuth, (req, res) => {
    db.all('SELECT * FROM ab_experiments ORDER BY created_at DESC', (err, experiments) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(experiments);
    });
  });

  server.post('/api/ab-experiments', requireAuth, (req, res) => {
    const { name, description, page_path, variant_a_content, variant_b_content, traffic_split } = req.body;
    
    db.run(`INSERT INTO ab_experiments (name, description, page_path, variant_a_content, variant_b_content, traffic_split) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, page_path, variant_a_content, variant_b_content, traffic_split || 50],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Experiment created successfully' });
      });
  });

  // Get A/B test variant for user
  // A/B Test CRUD API endpoints
  
  // Get all A/B test experiments (admin only)
  server.get('/api/ab-test', requireAuth, (req, res) => {
    db.all('SELECT * FROM ab_experiments ORDER BY created_at DESC', (err, experiments) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(experiments || []);
    });
  });

  // Create new A/B test experiment (admin only)
  server.post('/api/ab-test', requireAuth, (req, res) => {
    const { name, description, page_path, variant_a_content, variant_b_content, traffic_split } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    db.run(`INSERT INTO ab_experiments (
      name, description, page_path, variant_a_content, variant_b_content, 
      traffic_split, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      name, description, page_path,
      variant_a_content || '<p>Variant A Content</p>',
      variant_b_content || '<p>Variant B Content</p>',
      traffic_split || 50,
      1
    ], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Return the created experiment
      db.get('SELECT * FROM ab_experiments WHERE id = ?', [this.lastID], (err, experiment) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(experiment);
      });
    });
  });

  // Update A/B test experiment (admin only)
  server.put('/api/ab-test/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { name, description, page_path, variant_a_content, variant_b_content, traffic_split, is_active } = req.body;

    db.run(`UPDATE ab_experiments SET 
      name = ?, description = ?, page_path = ?, variant_a_content = ?, 
      variant_b_content = ?, traffic_split = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`, [
      name, description, page_path, variant_a_content, variant_b_content, traffic_split, is_active, id
    ], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Return the updated experiment
      db.get('SELECT * FROM ab_experiments WHERE id = ?', [id], (err, experiment) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(experiment);
      });
    });
  });

  // Delete A/B test experiment (admin only)
  server.delete('/api/ab-test/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // Delete related assignments first
    db.run('DELETE FROM ab_assignments WHERE experiment_id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Delete the experiment
      db.run('DELETE FROM ab_experiments WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, deletedCount: this.changes });
      });
    });
  });

  // Get A/B test variant for specific experiment (public endpoint)
  server.get('/api/ab-test/:experimentId', (req, res) => {
    const { experimentId } = req.params;
    const userId = req.isAuthenticated() ? req.user.id : null;
    const sessionId = req.query.session_id || uuidv4();

    // Check if user/session already has assignment
    db.get('SELECT * FROM ab_assignments WHERE experiment_id = ? AND (user_id = ? OR session_id = ?)', 
      [experimentId, userId, sessionId], (err, assignment) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (assignment) {
          return res.json({ variant: assignment.variant, session_id: sessionId });
        }

        // Get experiment details
        db.get('SELECT * FROM ab_experiments WHERE id = ? AND is_active = 1', [experimentId], (err, experiment) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

          // Assign variant based on traffic split
          const variant = Math.random() * 100 < experiment.traffic_split ? 'A' : 'B';

          // Save assignment
          db.run(`INSERT INTO ab_assignments (experiment_id, user_id, session_id, variant) 
                  VALUES (?, ?, ?, ?)`,
            [experimentId, userId, sessionId, variant], (err) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ 
                variant, 
                session_id: sessionId,
                content: variant === 'A' ? experiment.variant_a_content : experiment.variant_b_content
              });
            });
        });
      });
  });

  // Webhook integrations API routes
  server.get('/api/integrations', requireAuth, (req, res) => {
    db.all('SELECT * FROM integrations ORDER BY created_at DESC', (err, integrations) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(integrations);
    });
  });

  server.post('/api/integrations', requireAuth, (req, res) => {
    const { name, description, webhook_url, request_method, request_headers, request_body_template, trigger_events } = req.body;
    
    db.run(`INSERT INTO integrations (name, description, webhook_url, request_method, request_headers, request_body_template, trigger_events, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, webhook_url, request_method || 'POST', JSON.stringify(request_headers || {}), 
       request_body_template, JSON.stringify(trigger_events), req.user.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Integration created successfully' });
      });
  });

  // Test webhook integration
  server.post('/api/integrations/:id/test', requireAuth, async (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM integrations WHERE id = ?', [id], async (err, integration) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!integration) return res.status(404).json({ error: 'Integration not found' });

      try {
        const testData = {
          user_email: 'test@example.com',
          user_name: 'Test User',
          event_type: 'test',
          timestamp: new Date().toISOString()
        };

        const result = await executeIntegration(integration, 'test', testData);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  // Helper function to execute integrations
  async function executeIntegration(integration, eventType, eventData) {
    const startTime = Date.now();
    
    try {
      // Replace variables in request body
      let requestBody = integration.request_body_template;
      
      // Replace common variables
      const variables = {
        '{{user_email}}': eventData.user_email || '',
        '{{user_name}}': eventData.user_name || eventData.username || '',
        '{{user_id}}': eventData.user_id || '',
        '{{event_type}}': eventType,
        '{{timestamp}}': new Date().toISOString(),
        '{{plan_name}}': eventData.plan_name || '',
        '{{subscription_id}}': eventData.subscription_id || '',
        ...eventData // Include all event data as variables
      };

      for (const [key, value] of Object.entries(variables)) {
        requestBody = requestBody.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
      }

      const headers = JSON.parse(integration.request_headers || '{}');
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';

      const response = await axios({
        method: integration.request_method,
        url: integration.webhook_url,
        headers,
        data: JSON.parse(requestBody),
        timeout: 10000
      });

      const executionTime = Date.now() - startTime;

      // Log success
      db.run(`INSERT INTO integration_logs (integration_id, trigger_event, request_payload, response_status, response_body, execution_time) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        [integration.id, eventType, requestBody, response.status, JSON.stringify(response.data), executionTime]);

      return { success: true, status: response.status, data: response.data };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Log error
      db.run(`INSERT INTO integration_logs (integration_id, trigger_event, request_payload, response_status, error_message, execution_time) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        [integration.id, eventType, integration.request_body_template, error.response?.status || 0, error.message, executionTime]);

      throw error;
    }
  }

  // Function to trigger integrations on events
  function triggerIntegrations(eventType, eventData) {
    db.all('SELECT * FROM integrations WHERE is_active = 1', (err, integrations) => {
      if (err) {
        console.error('Error fetching integrations:', err);
        return;
      }

      integrations.forEach(integration => {
        const triggerEvents = JSON.parse(integration.trigger_events);
        if (triggerEvents.includes(eventType)) {
          executeIntegration(integration, eventType, eventData).catch(err => {
            console.error(`Integration ${integration.name} failed:`, err.message);
          });
        }
      });
    });
  }

  // API Worker Configuration API routes (Admin only)
  server.get('/api/api-worker-config', requireAuth, (req, res) => {
    db.get('SELECT * FROM api_worker_config WHERE id = 1', (err, config) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!config) {
        return res.json({ 
          request_method: 'POST',
          request_headers: '{}',
          request_body_template: '{}',
          input_fields: '[]', 
          required_oauth_services: '[]',
          is_active: false,
          service_type: 'ai_generated'
        });
      }
      res.json({
        ...config,
        request_headers: JSON.parse(config.request_headers || '{}'),
        input_fields: JSON.parse(config.input_fields || '[]'),
        required_oauth_services: JSON.parse(config.required_oauth_services || '[]'),
        service_type: 'ai_generated'
      });
    });
  });

  server.post('/api/api-worker-config', requireAuth, (req, res) => {
    const { request_method, request_headers, request_body_template, input_fields, required_oauth_services, is_active, generated_worker_id, generated_endpoint } = req.body;
    
    if (!input_fields) {
      return res.status(400).json({ error: 'Input fields configuration is required for AI-generated endpoints' });
    }

    db.run(`INSERT OR REPLACE INTO api_worker_config (id, request_method, request_headers, request_body_template, input_fields, required_oauth_services, is_active, generated_worker_id, generated_endpoint, created_by, updated_at) 
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [request_method || 'POST', JSON.stringify(request_headers || {}), request_body_template || '{}', JSON.stringify(input_fields), JSON.stringify(required_oauth_services || []), is_active !== false, generated_worker_id, generated_endpoint, req.user.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'AI-powered backend configuration saved successfully' });
      });
  });

  // Test AI-generated endpoint
  server.post('/api/api-worker-config/test', requireAuth, async (req, res) => {
    const { test_data } = req.body;
    
    db.get('SELECT * FROM api_worker_config WHERE id = 1', async (err, config) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!config) return res.status(404).json({ error: 'Backend configuration not found' });

      try {
        if (!config.generated_endpoint) {
          return res.json({ 
            success: false, 
            message: 'No AI-generated endpoint available. Please generate an endpoint first using the AI generation feature.' 
          });
        }

        const testPayload = test_data || { prompt: 'Test from admin panel' };
        
        // Test the generated endpoint directly
        const response = await fetch(`http://localhost:${process.env.PORT || 3000}${config.generated_endpoint}`, {
          method: config.request_method || 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${req.user.id}` // Simulate authenticated request
          },
          body: JSON.stringify(testPayload)
        });

        const result = await response.json();
        res.json({ success: response.ok, result, status: response.status });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  // AI Worker Security and Isolation Functions
  
  // Security middleware for AI worker routes
  const aiWorkerSecurityMiddleware = (req, res, next) => {
    try {
      // Input validation and sanitization
      if (req.body) {
        sanitizeInput(req.body);
      }
      
      // Rate limiting per user (simple implementation)
      const userId = req.user?.id;
      if (userId && !checkRateLimit(userId, 'ai_worker')) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please wait before making another request.' 
        });
      }
      
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      next();
    } catch (error) {
      res.status(500).json({ error: 'Security validation failed' });
    }
  };

  // Input sanitization function
  function sanitizeInput(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous characters and scripts
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeInput(obj[key]);
      }
    }
  }

  // Simple rate limiting implementation
  const rateLimitMap = new Map();
  function checkRateLimit(userId, action, maxRequests = 10, windowMinutes = 1) {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    const rateData = rateLimitMap.get(key);
    
    if (now > rateData.resetTime) {
      // Reset the window
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (rateData.count >= maxRequests) {
      return false;
    }
    
    rateData.count++;
    return true;
  }

  // Secure execution environment for AI-generated code
  async function executeAIWorkerSecurely(worker, req, res) {
    console.log('\n🔒 === SECURE AI WORKER EXECUTION ===');
    console.log('🆔 Worker ID:', worker.id);
    console.log('📝 Worker Name:', worker.workerName);
    console.log('⏱️  Timeout:', 30000, 'ms');
    
    const startTime = Date.now();
    const timeoutMs = 30000; // 30 second timeout
    
    try {
      console.log('🏗️  Creating isolated execution context...');
      // Create isolated execution context
      const isolatedContext = createIsolatedContext(worker, req);
      console.log('✅ Isolated context created');
      console.log('📋 Context keys:', Object.keys(isolatedContext));
      
      console.log('🚀 Starting code execution with timeout...');
      // Execute with timeout
      const result = await Promise.race([
        executeWorkerCode(isolatedContext),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Execution timeout')), timeoutMs)
        )
      ]);
      
      const executionTime = Date.now() - startTime;
      console.log('✅ Execution completed successfully in', executionTime, 'ms');
      console.log('📊 Result type:', typeof result);
      console.log('📄 Result preview:', JSON.stringify(result).substring(0, 100) + '...');
      
      // Log successful execution
      logAIWorkerExecution(worker.id, req.user?.id, 'success', executionTime);
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.log('❌ Execution failed after', executionTime, 'ms');
      console.log('🚨 Error in secure execution:', error.message);
      console.log('🔍 Error stack:', error.stack);
      
      // Log failed execution
      logAIWorkerExecution(worker.id, req.user?.id, 'error', executionTime, error.message);
      console.log('=== SECURE EXECUTION FAILED ===\n');
      throw error;
    }
  }

  // Create isolated execution context
  function createIsolatedContext(worker, req) {
    const inputSchema = JSON.parse(worker.inputSchema || '[]');
    const oauthRequirements = JSON.parse(worker.oauthRequirements || '[]');
    
    // Validate input against schema
    const validatedInput = validateAgainstSchema(req.body, inputSchema);
    
    return {
      worker,
      input: validatedInput,
      user: {
        id: req.user.id,
        email: req.user.email
      },
      oauth: {}, // Will be populated with OAuth tokens if required
      db: null, // No direct database access for security
      console: {
        log: (...args) => console.log(`[AI Worker ${worker.id}]`, ...args),
        error: (...args) => console.error(`[AI Worker ${worker.id}]`, ...args)
      }
    };
  }

  // Validate input against schema
  function validateAgainstSchema(input, schema) {
    const validated = {};
    
    schema.forEach(field => {
      const value = input[field.name];
      
      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        throw new Error(`Required field '${field.label}' is missing`);
      }
      
      // Type validation
      if (value !== undefined && value !== null) {
        switch (field.type) {
          case 'number':
            if (isNaN(value)) {
              throw new Error(`Field '${field.label}' must be a number`);
            }
            validated[field.name] = Number(value);
            break;
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              throw new Error(`Field '${field.label}' must be a valid email`);
            }
            validated[field.name] = value;
            break;
          case 'select':
            if (field.options && !field.options.includes(value)) {
              throw new Error(`Field '${field.label}' must be one of: ${field.options.join(', ')}`);
            }
            validated[field.name] = value;
            break;
          default:
            validated[field.name] = value;
        }
      }
    });
    
    return validated;
  }

  // Execute worker code in isolated environment
  async function executeWorkerCode(context) {
    console.log('\n⚙️  === EXECUTING WORKER CODE ===');
    console.log('🏗️  Context input:', JSON.stringify(context.input).substring(0, 200) + '...');
    console.log('📝 Generated code length:', context.generatedCode?.length, 'characters');
    
    // This is a simplified implementation
    // In production, you'd use a proper sandboxing solution like vm2 or worker_threads
    
    try {
      console.log('🔄 Starting mock execution...');
      
      // For now, return a mock response
      // The actual AI-generated code would be evaluated here in a secure sandbox
      const result = {
        success: true,
        data: {
          message: 'AI worker executed successfully',
          input: context.input,
          timestamp: new Date().toISOString(),
          mock: true,
          note: 'This is a mock response. In production, the AI-generated code would be executed here in a secure sandbox.'
        }
      };
      
      console.log('✅ Mock execution completed');
      console.log('📤 Mock result:', JSON.stringify(result).substring(0, 150) + '...');
      
      return result;
    } catch (error) {
      console.log('❌ Worker execution failed:', error.message);
      throw new Error(`Worker execution failed: ${error.message}`);
    }
  }

  // Log AI worker executions (this is a duplicate, will be removed)
  // The correct logging function is defined later as logAIWorkerExecution

  // AI Worker Code Generation Function
  async function generateAIWorkerCode(params) {
    const { apiKey, workerName, routePath, httpMethod, description, prompt, context } = params;
    
    console.log('\n🤖 === AI WORKER CODE GENERATION START ===');
    console.log('📝 Worker Name:', workerName);
    console.log('🛤️  Route Path:', routePath);
    console.log('📡 HTTP Method:', httpMethod);
    console.log('📋 Description:', description);
    console.log('💭 Prompt:', prompt);
    console.log('🔧 Context:', context);
    console.log('🔑 API Key (first 20 chars):', apiKey ? apiKey.substring(0, 20) + '...' : 'NOT PROVIDED');
    
    try {
      const systemPrompt = `You are an expert backend developer that generates Node.js/Express route code based on user requirements.

IMPORTANT RULES:
1. Generate complete, production-ready Express route handler code
2. The code should make API calls to Claude (Anthropic) using the provided API key: ${apiKey}
3. Process subscriber inputs and return AI-generated responses
4. Always include error handling and input validation
5. Support OAuth token access for external APIs when requested
6. Use async/await for asynchronous operations
7. Return JSON responses with proper HTTP status codes
8. Include helpful comments in the code
9. Follow security best practices
10. The route will be dynamically mounted on the server

Generate a complete Express route handler function for:
- Route: ${routePath}
- HTTP Method: ${httpMethod}
- Description: ${description}
- Requirements: ${prompt}
${context ? `\nAdditional Context: ${context}` : ''}

The generated endpoint should:
- Take subscriber inputs from req.body
- Make requests to Claude API (https://api.anthropic.com/v1/messages)
- Process and transform the AI response
- Return personalized responses to subscribers

Return your response in this exact JSON format (IMPORTANT: generatedCode must be a properly escaped JSON string, not template literals):
{
  "success": true,
  "generatedCode": "const express = require('express');\\nconst router = express.Router();\\n\\nrouter.post('/api/endpoint', async (req, res) => {\\n  // code here\\n});\\n\\nmodule.exports = router;",
  "inputSchema": {JSON schema for expected inputs},
  "outputSchema": {JSON schema for expected outputs},
  "oauthRequirements": ["service1", "service2"],
  "tokens_used": estimated_tokens,
  "estimated_cost": estimated_cost_in_dollars
}

CRITICAL: The "generatedCode" field MUST be a valid JSON string with properly escaped quotes, newlines (\\n), and other special characters. Do NOT use template literals (backticks) or unescaped quotes.

Example structure for the generated code:
server.${httpMethod.toLowerCase()}('${routePath}', requireSubscriberAuth, async (req, res) => {
  try {
    const axios = require('axios');
    const { input } = req.body; // subscriber inputs
    
    // Make request to Claude API
    const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: input // or process input as needed
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '${apiKey}',
        'anthropic-version': '2023-06-01'
      }
    });
    
    const aiResponse = claudeResponse.data.content[0].text;
    res.json({ success: true, data: aiResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

      console.log('\n📡 === CLAUDE API REQUEST START ===');
      const requestBody = {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Generate backend code for: ${description}\n\nDetailed requirements: ${prompt}\n${context ? `\nContext: ${context}` : ''}`
          }
        ]
      };
      
      console.log('🌐 URL:', 'https://api.anthropic.com/v1/messages');
      console.log('📋 Model:', requestBody.model);
      console.log('🔢 Max Tokens:', requestBody.max_tokens);
      console.log('💬 User Message Length:', requestBody.messages[0].content.length, 'characters');
      console.log('📏 System Prompt Length:', systemPrompt.length, 'characters');
      console.log('🔑 Headers:', {
        'Content-Type': 'application/json',
        'x-api-key': apiKey ? apiKey.substring(0, 20) + '...' : 'NOT PROVIDED',
        'anthropic-version': '2023-06-01'
      });

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      console.log('\n✅ === CLAUDE API RESPONSE SUCCESS ===');
      console.log('📊 Status:', response.status, response.statusText);
      console.log('🔤 Response Content Length:', JSON.stringify(response.data).length, 'characters');
      console.log('💰 Usage:', response.data.usage);
      console.log('📝 Content Preview (first 200 chars):', response.data.content?.[0]?.text?.substring(0, 200) + '...');

      if (response.data && response.data.content && response.data.content[0]) {
        const aiResponse = response.data.content[0].text;
        
        console.log('\n🔍 === PROCESSING AI RESPONSE ===');
        console.log('📄 Full AI Response:');
        console.log(aiResponse);
        
        try {
          console.log('🔄 Attempting JSON parse...');
          // Try to parse as JSON first
          const parsedResponse = JSON.parse(aiResponse);
          console.log('✅ JSON Parse Successful!');
          console.log('📊 Parsed Response:', parsedResponse);
          
          if (parsedResponse.success && parsedResponse.generatedCode) {
            console.log('🎯 Found valid generated code structure');
            const result = {
              success: true,
              generatedCode: parsedResponse.generatedCode,
              inputSchema: JSON.stringify(parsedResponse.inputSchema || {}),
              outputSchema: JSON.stringify(parsedResponse.outputSchema || {}),
              oauthRequirements: JSON.stringify(parsedResponse.oauthRequirements || []),
              tokens_used: parsedResponse.tokens_used || 1000,
              estimated_cost: parsedResponse.estimated_cost || 0.01
            };
            console.log('✅ === AI WORKER GENERATION SUCCESS ===');
            return result;
          } else {
            console.log('❌ Parsed response missing required fields (success/generatedCode)');
          }
        } catch (jsonError) {
          console.log('❌ JSON Parse Failed:', jsonError.message);
          console.log('🔍 Attempting to fix malformed JSON with template literals...');
          
          // Try to fix template literals in JSON (common issue)
          let fixedResponse = aiResponse;
          try {
            // Replace template literals with properly escaped strings
            fixedResponse = aiResponse.replace(/"generatedCode":\s*`([^`]*)`/gs, (match, code) => {
              // Properly escape the code for JSON
              const escapedCode = code
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
              return `"generatedCode": "${escapedCode}"`;
            });
            
            console.log('🔧 Attempting to parse fixed JSON...');
            const parsedResponse = JSON.parse(fixedResponse);
            console.log('✅ Fixed JSON Parse Successful!');
            
            if (parsedResponse.success && parsedResponse.generatedCode) {
              console.log('🎯 Found valid generated code structure (after fixing)');
              const result = {
                success: true,
                generatedCode: parsedResponse.generatedCode,
                inputSchema: JSON.stringify(parsedResponse.inputSchema || {}),
                outputSchema: JSON.stringify(parsedResponse.outputSchema || {}),
                oauthRequirements: JSON.stringify(parsedResponse.oauthRequirements || []),
                tokens_used: parsedResponse.tokens_used || 1000,
                estimated_cost: parsedResponse.estimated_cost || 0.01
              };
              console.log('✅ === AI WORKER GENERATION SUCCESS (FIXED JSON) ===');
              return result;
            }
          } catch (fixError) {
            console.log('❌ Fixed JSON parse also failed:', fixError.message);
          }
          
          console.log('🔍 Attempting markdown code extraction...');
          // If JSON parsing fails, extract code from markdown blocks
          const codeMatch = aiResponse.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/);
          if (codeMatch) {
            console.log('✅ Found code in markdown blocks');
            const result = {
              success: true,
              generatedCode: codeMatch[1],
              inputSchema: '{}',
              outputSchema: '{}',
              oauthRequirements: '[]',
              tokens_used: 1000,
              estimated_cost: 0.01
            };
            console.log('✅ === AI WORKER GENERATION SUCCESS (MARKDOWN) ===');
            return result;
          } else {
            console.log('❌ No code blocks found in markdown');
          }
        }
      } else {
        console.log('❌ Invalid response structure - missing content');
        console.log('📋 Response data:', response.data);
      }

      const error = 'Failed to generate valid code from AI response';
      console.log('❌ === AI WORKER GENERATION FAILED ===');
      console.log('🚨 Error:', error);
      return {
        success: false,
        error: error
      };

    } catch (error) {
      console.log('\n💥 === AI WORKER GENERATION ERROR ===');
      console.error('🚨 Error Type:', error.constructor.name);
      console.error('📝 Error Message:', error.message);
      console.error('📊 Error Response Status:', error.response?.status);
      console.error('📋 Error Response Headers:', error.response?.headers);
      console.error('📄 Error Response Data:', error.response?.data);
      console.error('🔍 Error Stack:', error.stack);
      console.log('=== END ERROR DETAILS ===\n');
      
      return {
        success: false,
        error: error.message || 'Failed to generate AI worker code'
      };
    }
  }

  // AI Workers API routes (Admin only)
  
  // Get all AI workers
  server.get('/api/ai-workers/list', requireAuth, (req, res) => {
    db.all('SELECT * FROM ai_workers ORDER BY created_at DESC', (err, workers) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ workers: workers || [] });
    });
  });

  // Delete AI worker
  server.delete('/api/ai-workers/list', requireAuth, (req, res) => {
    const { workerId } = req.body;
    
    if (!workerId) {
      return res.status(400).json({ error: 'Worker ID is required' });
    }

    db.run('DELETE FROM ai_workers WHERE id = ?', [workerId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'AI worker not found' });
      }
      res.json({ message: 'AI worker deleted successfully' });
    });
  });

  // Create new AI worker
  server.post('/api/ai-workers/create', requireAuth, async (req, res) => {
    console.log('\n🚀 === AI WORKER CREATE REQUEST ===');
    console.log('👤 User ID:', req.user?.id);
    console.log('📥 Request Body:', req.body);
    console.log('🔑 API Key Present:', req.headers['x-api-key'] ? 'YES (length: ' + req.headers['x-api-key'].length + ')' : 'NO');
    
    const { workerName, routePath, httpMethod, description, prompt, context, requireAuth: reqAuth, accessLevel, workerType } = req.body;
    const apiKey = req.headers['x-api-key'];
    
    console.log('✅ Extracted Parameters:');
    console.log('  - Worker Name:', workerName);
    console.log('  - Route Path:', routePath);
    console.log('  - HTTP Method:', httpMethod);
    console.log('  - Description:', description);
    console.log('  - Prompt Length:', prompt?.length, 'characters');
    console.log('  - Context:', context);
    console.log('  - Require Auth:', reqAuth);
    console.log('  - Access Level:', accessLevel);
    console.log('  - Worker Type:', workerType);
    
    if (!workerName || !routePath || !description || !prompt) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Worker name, route path, description, and prompt are required' });
    }

    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      console.log('❌ Invalid API key');
      return res.status(400).json({ error: 'Valid Anthropic API key is required. Please configure your API key.' });
    }
    
    console.log('✅ Validation passed, proceeding to AI generation...');

    try {
      // Generate AI-powered backend code using Claude
      const claudeResponse = await generateAIWorkerCode({
        apiKey,
        workerName,
        routePath,
        httpMethod,
        description,
        prompt,
        context
      });

      console.log('🔄 Claude Response Received:', claudeResponse.success ? 'SUCCESS' : 'FAILED');
      
      if (!claudeResponse.success) {
        console.log('❌ AI worker code generation failed');
        return res.status(500).json({ error: 'Failed to generate AI worker code: ' + claudeResponse.error });
      }

      console.log('📀 Inserting into database...');
      // Insert into database
      db.run(`INSERT INTO ai_workers (
        workerName, routePath, httpMethod, description, prompt, context, 
        requireAuth, accessLevel, workerType, generatedCode, inputSchema, 
        outputSchema, oauthRequirements, isActive, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workerName, 
          routePath, 
          httpMethod || 'POST', 
          description, 
          prompt, 
          context,
          reqAuth !== false, 
          accessLevel || 'subscriber', 
          workerType || 'ai-api-worker',
          claudeResponse.generatedCode,
          claudeResponse.inputSchema || '{}',
          claudeResponse.outputSchema || '{}',
          claudeResponse.oauthRequirements || '[]',
          true,
          req.user.id
        ],
        function(err) {
          if (err) {
            console.log('❌ Database INSERT error:', err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ error: 'Route path already exists' });
            }
            return res.status(500).json({ error: err.message });
          }
          
          const workerId = this.lastID;
          console.log('✅ Database INSERT successful, Worker ID:', workerId);
          
          // Return created worker with Claude usage info
          db.get('SELECT * FROM ai_workers WHERE id = ?', [workerId], (err, worker) => {
            if (err) {
              console.log('❌ Database SELECT error:', err.message);
              return res.status(500).json({ error: err.message });
            }
            
            console.log('✅ Worker retrieved from database');
            const response = {
              worker,
              tokens_used: claudeResponse.tokens_used || 0,
              estimated_cost: claudeResponse.estimated_cost || 0.0,
              message: 'AI worker created successfully'
            };
            console.log('📤 Sending response:', response);
            console.log('=== AI WORKER CREATE COMPLETE ===\n');
            
            res.json(response);
          });
        });
    } catch (error) {
      console.error('Error creating AI worker:', error);
      res.status(500).json({ error: 'Failed to create AI worker' });
    }
  });

  // Update AI worker configuration
  server.put('/api/ai-workers/update/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { customInputs, oauthServices } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Worker ID is required' });
    }

    db.run(`UPDATE ai_workers 
            SET inputSchema = ?, oauthRequirements = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      [JSON.stringify(customInputs || []), JSON.stringify(oauthServices || []), id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
          return res.status(404).json({ error: 'AI worker not found' });
        }
        res.json({ message: 'AI worker configuration updated successfully' });
      });
  });

  // Execute integrated backend workers
  server.all('/api/integrated/*', requireSubscriberAuth, aiWorkerSecurityMiddleware, async (req, res) => {
    console.log('\n⚡ === INTEGRATED BACKEND EXECUTION REQUEST ===');
    console.log('🛤️  Route Path:', req.path);
    console.log('📡 HTTP Method:', req.method);
    console.log('👤 User ID:', req.user?.id);
    console.log('📥 Request Body:', req.body);
    console.log('🔍 Query Params:', req.query);
    
    const routePath = req.path;
    
    try {
      console.log('🔍 Looking up integrated backend worker in database...');
      // Find the integrated backend worker for this route
      db.get('SELECT * FROM ai_workers WHERE routePath = ? AND isActive = 1 AND workerType = "integrated-backend"', [routePath], async (err, worker) => {
        if (err) {
          console.log('❌ Database error:', err.message);
          return res.status(500).json({ error: err.message });
        }
        
        if (!worker) {
          console.log('❌ Integrated backend worker not found for route:', routePath);
          return res.status(404).json({ 
            error: 'Integrated backend endpoint not found',
            route: routePath,
            available_routes: 'Please check if the endpoint exists and is active'
          });
        }

        console.log('✅ Found integrated backend worker:', worker.workerName);
        console.log('🔧 Worker Type:', worker.workerType);
        console.log('🔐 Auth Required:', worker.requireAuth);
        console.log('📊 Access Level:', worker.accessLevel);

        // Verify user has required access level
        if (worker.accessLevel === 'subscriber' && (!req.user || req.user.subscription_status !== 'active')) {
          console.log('❌ Access denied: subscriber access required');
          return res.status(403).json({ 
            error: 'Subscriber access required',
            required_level: worker.accessLevel,
            user_level: req.user?.subscription_status || 'none'
          });
        }

        try {
          console.log('🚀 Executing integrated backend worker...');
          console.log('📝 Generated Code Preview (first 200 chars):', worker.generatedCode?.substring(0, 200) + '...');
          
          // Execute the integrated backend worker securely
          const result = await executeAIWorkerSecurely(worker, req, res);
          
          console.log('✅ Integrated backend worker execution successful');
          console.log('📤 Result preview:', JSON.stringify(result).substring(0, 200) + '...');
          
          // Log successful execution
          logAIWorkerExecution(
            worker.id, 
            req.user.id, 
            'success', 
            null, 
            null,
            JSON.stringify(req.body),
            JSON.stringify(result),
            req.ip,
            req.get('User-Agent')
          );
          
        } catch (error) {
          console.log('❌ Integrated backend worker execution failed:', error.message);
          console.log('📊 Error Stack:', error.stack);
          
          // Log failed execution
          logAIWorkerExecution(
            worker.id, 
            req.user.id, 
            'error', 
            error.message, 
            error.stack,
            JSON.stringify(req.body),
            null,
            req.ip,
            req.get('User-Agent')
          );
          
          return res.status(500).json({ 
            error: 'Integrated backend execution failed', 
            details: error.message,
            worker_name: worker.workerName
          });
        }
      });
    } catch (error) {
      console.log('❌ Integrated backend request processing failed:', error.message);
      return res.status(500).json({ 
        error: 'Request processing failed', 
        details: error.message 
      });
    }
  });

  // Execute AI worker (customer endpoint)
  server.all('/api/worker/*', requireSubscriberAuth, aiWorkerSecurityMiddleware, async (req, res) => {
    console.log('\n⚡ === AI WORKER EXECUTION REQUEST ===');
    console.log('🛤️  Route Path:', req.path);
    console.log('📡 HTTP Method:', req.method);
    console.log('👤 User ID:', req.user?.id);
    console.log('📥 Request Body:', req.body);
    console.log('🔍 Query Params:', req.query);
    
    const routePath = req.path;
    
    try {
      console.log('🔍 Looking up AI worker in database...');
      // Find the AI worker for this route
      db.get('SELECT * FROM ai_workers WHERE routePath = ? AND isActive = 1', [routePath], async (err, worker) => {
        if (err) {
          console.log('❌ Database error:', err.message);
          return res.status(500).json({ error: err.message });
        }
        
        if (!worker) {
          console.log('❌ AI worker not found for route:', routePath);
          return res.status(404).json({ error: 'AI worker not found or inactive' });
        }
        
        console.log('✅ AI Worker found:');
        console.log('  - ID:', worker.id);
        console.log('  - Name:', worker.workerName);
        console.log('  - Method:', worker.httpMethod);
        console.log('  - Access Level:', worker.accessLevel);
        console.log('  - Generated Code Length:', worker.generatedCode?.length, 'characters');
        
        // Check if HTTP method matches
        if (worker.httpMethod.toUpperCase() !== req.method.toUpperCase()) {
          console.log('❌ HTTP method mismatch:', req.method, 'vs', worker.httpMethod);
          return res.status(405).json({ error: `Method ${req.method} not allowed. This route accepts ${worker.httpMethod}` });
        }
        
        console.log('✅ HTTP method check passed');
        
        // Check access level permissions
        console.log('🔐 Checking access level permissions...');
        if (worker.accessLevel === 'admin' && req.user.role !== 'admin') {
          console.log('❌ Admin access required but user is not admin');
          return res.status(403).json({ error: 'Admin access required' });
        }
        console.log('✅ Access level check passed');
        
        // Check OAuth requirements
        console.log('🔗 Checking OAuth requirements...');
        const oauthRequirements = JSON.parse(worker.oauthRequirements || '[]');
        console.log('📋 Required OAuth services:', oauthRequirements);
        
        if (oauthRequirements.length > 0) {
          const userConnections = await getUserOAuthConnections(req.user.id, oauthRequirements);
          console.log('🔌 User OAuth connections:', userConnections.map(c => c.service_name));
          
          if (userConnections.length < oauthRequirements.length) {
            console.log('❌ Missing required OAuth connections');
            return res.status(403).json({ 
              error: 'Missing required OAuth connections',
              required_services: oauthRequirements,
              connected_services: userConnections.map(c => c.service_name)
            });
          }
        }
        console.log('✅ OAuth requirements check passed');
        
        try {
          console.log('🚀 Executing AI worker code...');
          console.log('📝 Generated Code Preview (first 200 chars):', worker.generatedCode?.substring(0, 200) + '...');
          
          // Execute the AI worker securely
          const result = await executeAIWorkerSecurely(worker, req, res);
          
          console.log('✅ AI worker execution successful');
          console.log('📤 Result preview:', JSON.stringify(result).substring(0, 200) + '...');
          
          // Log successful execution with details
          logAIWorkerExecution(
            worker.id, 
            req.user.id, 
            'success', 
            null, 
            null,
            JSON.stringify(req.body),
            JSON.stringify(result),
            req.ip,
            req.get('User-Agent')
          );
          
          res.json(result);
        } catch (error) {
          console.log('❌ AI worker execution failed');
          console.log('🚨 Error Type:', error.constructor.name);
          console.log('📝 Error Message:', error.message);
          console.log('🔍 Error Stack:', error.stack);
          
          // Log failed execution
          logAIWorkerExecution(
            worker.id, 
            req.user.id, 
            'error', 
            null, 
            error.message,
            JSON.stringify(req.body),
            null,
            req.ip,
            req.get('User-Agent')
          );
          
          console.log('=== AI WORKER EXECUTION FAILED ===\n');
          res.status(500).json({ error: error.message });
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute AI worker' });
    }
  });

  // Get user OAuth connections
  async function getUserOAuthConnections(userId, requiredServices) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT os.name as service_name FROM user_oauth_connections uoc
              JOIN oauth_services os ON uoc.oauth_service_id = os.id
              WHERE uoc.user_id = ? AND uoc.is_active = 1 AND os.name IN (${requiredServices.map(() => '?').join(',')})`,
        [userId, ...requiredServices], (err, connections) => {
          if (err) reject(err);
          else resolve(connections);
        });
    });
  }

  // Enhanced logging function
  function logAIWorkerExecution(workerId, userId, status, executionTime, errorMessage = null, inputData = null, outputData = null, ipAddress = null, userAgent = null) {
    db.run(`INSERT INTO ai_worker_logs (
      worker_id, user_id, status, execution_time, error_message, input_data, output_data, ip_address, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [workerId, userId, status, executionTime, errorMessage, inputData, outputData, ipAddress, userAgent],
      (err) => {
        if (err) console.error('Failed to log AI worker execution:', err);
      });
  }

  // Get AI worker execution logs (Admin only)
  server.get('/api/ai-workers/logs/:workerId?', requireAuth, (req, res) => {
    const { workerId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `SELECT awl.*, aw.workerName, aw.routePath, u.email as user_email
                 FROM ai_worker_logs awl
                 JOIN ai_workers aw ON awl.worker_id = aw.id
                 LEFT JOIN users u ON awl.user_id = u.id`;
    let params = [];
    
    if (workerId) {
      query += ' WHERE awl.worker_id = ?';
      params.push(workerId);
    }
    
    query += ' ORDER BY awl.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    db.all(query, params, (err, logs) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ logs });
    });
  });

  // Reload server with AI routes
  server.post('/api/ai-workers/reload-server', requireAuth, (req, res) => {
    // In a real implementation, you would dynamically load the AI worker routes
    // For now, we'll just return success and let the frontend know routes are "activated"
    db.all('SELECT COUNT(*) as count FROM ai_workers WHERE isActive = 1', (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const routesCount = result[0]?.count || 0;
      res.json({ 
        success: true, 
        routes_loaded: routesCount,
        message: `${routesCount} AI routes activated` 
      });
    });
  });

  // OAuth Services API routes (Admin only)
  
  // Get all OAuth services
  server.get('/api/oauth-services', requireAuth, (req, res) => {
    db.all('SELECT * FROM oauth_services ORDER BY category, display_name', (err, services) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Don't expose client secrets in the response
      const sanitizedServices = services.map(service => ({
        ...service,
        client_secret: service.client_secret ? '***masked***' : null
      }));
      
      res.json(sanitizedServices);
    });
  });

  // Get OAuth service by ID
  server.get('/api/oauth-services/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM oauth_services WHERE id = ?', [id], (err, service) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!service) return res.status(404).json({ error: 'OAuth service not found' });
      
      // Don't expose client secret in the response
      const sanitizedService = {
        ...service,
        client_secret: service.client_secret ? '***masked***' : null
      };
      
      res.json(sanitizedService);
    });
  });

  // Create OAuth service
  server.post('/api/oauth-services', requireAuth, (req, res) => {
    const { 
      name, display_name, description, client_id, client_secret, 
      authorization_url, token_url, scope_default, redirect_uri, 
      icon_url, category, is_active 
    } = req.body;

    if (!name || !display_name || !client_id || !client_secret || !authorization_url || !token_url || !redirect_uri) {
      return res.status(400).json({ error: 'Required fields: name, display_name, client_id, client_secret, authorization_url, token_url, redirect_uri' });
    }

    db.run(`INSERT INTO oauth_services (
      name, display_name, description, client_id, client_secret, 
      authorization_url, token_url, scope_default, redirect_uri, 
      icon_url, category, is_active, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, display_name, description, client_id, client_secret, authorization_url, 
       token_url, scope_default, redirect_uri, icon_url, category || 'other', 
       is_active !== false, req.user.id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'OAuth service with this name already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'OAuth service created successfully', id: this.lastID });
      }
    );
  });

  // Update OAuth service
  server.put('/api/oauth-services/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { 
      name, display_name, description, client_id, client_secret, 
      authorization_url, token_url, scope_default, redirect_uri, 
      icon_url, category, is_active 
    } = req.body;

    if (!name || !display_name || !client_id || !authorization_url || !token_url || !redirect_uri) {
      return res.status(400).json({ error: 'Required fields: name, display_name, client_id, authorization_url, token_url, redirect_uri' });
    }

    // Build update query dynamically to handle optional client_secret update
    let updateFields = [
      'name = ?', 'display_name = ?', 'description = ?', 'client_id = ?',
      'authorization_url = ?', 'token_url = ?', 'scope_default = ?', 
      'redirect_uri = ?', 'icon_url = ?', 'category = ?', 'is_active = ?',
      'updated_at = CURRENT_TIMESTAMP'
    ];
    let updateValues = [
      name, display_name, description, client_id, authorization_url, 
      token_url, scope_default, redirect_uri, icon_url, category || 'other', 
      is_active !== false
    ];

    // Only update client_secret if provided (not masked)
    if (client_secret && client_secret !== '***masked***') {
      updateFields.splice(4, 0, 'client_secret = ?');
      updateValues.splice(4, 0, client_secret);
    }

    updateValues.push(id);

    db.run(`UPDATE oauth_services SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues,
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'OAuth service with this name already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'OAuth service not found' });
        }
        res.json({ message: 'OAuth service updated successfully' });
      }
    );
  });

  // Delete OAuth service
  server.delete('/api/oauth-services/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // Check if any users have connections to this service
    db.get('SELECT COUNT(*) as count FROM user_oauth_connections WHERE oauth_service_id = ?', [id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (result.count > 0) {
        return res.status(400).json({ error: 'Cannot delete OAuth service with active user connections' });
      }
      
      db.run('DELETE FROM oauth_services WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
          return res.status(404).json({ error: 'OAuth service not found' });
        }
        res.json({ message: 'OAuth service deleted successfully' });
      });
    });
  });

  // User OAuth Connections API routes

  // Get user's OAuth connections (for subscribers)
  server.get('/api/oauth-connections', requireSubscriberAuth, (req, res) => {
    const userId = req.user.id;
    
    db.all(`SELECT 
      uoc.id, uoc.oauth_service_id, uoc.scope_granted, uoc.profile_info,
      uoc.is_active, uoc.connected_at, uoc.last_used_at, uoc.last_refreshed_at,
      os.name, os.display_name, os.description, os.icon_url, os.category
    FROM user_oauth_connections uoc
    JOIN oauth_services os ON uoc.oauth_service_id = os.id
    WHERE uoc.user_id = ? AND uoc.is_active = 1
    ORDER BY uoc.connected_at DESC`, [userId], (err, connections) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(connections);
    });
  });

  // Get available OAuth services for connection (for subscribers) - only admin-enabled
  server.get('/api/oauth-services/available', requireSubscriberAuth, (req, res) => {
    const userId = req.user.id;
    
    db.all(`SELECT 
      os.id, os.name, os.display_name, os.description, os.icon_url, os.category,
      os.authorization_url, os.scope_default,
      CASE WHEN uoc.id IS NOT NULL THEN 1 ELSE 0 END as is_connected
    FROM oauth_services os
    LEFT JOIN user_oauth_connections uoc ON os.id = uoc.oauth_service_id AND uoc.user_id = ? AND uoc.is_active = 1
    WHERE os.is_active = 1 AND os.enabled_for_subscribers = 1
    ORDER BY os.category, os.display_name`, [userId], (err, services) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(services);
    });
  });

  // Get available AI services for connection (for subscribers) - only admin-enabled
  server.get('/api/ai-services/available', requireSubscriberAuth, (req, res) => {
    const userId = req.user.id;
    
    db.all(`SELECT 
      ai.id, ai.name, ai.display_name, ai.description, ai.icon_url, 
      ai.model_options, ai.documentation_url,
      ic.name as category, ic.display_name as category_display_name,
      CASE WHEN uai.id IS NOT NULL THEN 1 ELSE 0 END as is_connected
    FROM ai_api_services ai
    LEFT JOIN integration_categories ic ON ai.category_id = ic.id
    LEFT JOIN user_ai_connections uai ON ai.id = uai.ai_service_id AND uai.user_id = ? AND uai.is_active = 1
    WHERE ai.is_active = 1 AND ai.enabled_for_subscribers = 1
    ORDER BY ic.sort_order, ai.display_name`, [userId], (err, services) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(services);
    });
  });

  // Connect to AI service (for subscribers)
  server.post('/api/ai-connections', requireSubscriberAuth, (req, res) => {
    const { ai_service_id, api_key, model_preferences } = req.body;
    const userId = req.user.id;

    if (!ai_service_id || !api_key) {
      return res.status(400).json({ error: 'AI service ID and API key are required' });
    }

    // Check if service is enabled for subscribers
    db.get('SELECT * FROM ai_api_services WHERE id = ? AND is_active = 1 AND enabled_for_subscribers = 1', 
      [ai_service_id], (err, service) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!service) return res.status(404).json({ error: 'AI service not found or not available' });

        const encryptedApiKey = encryptToken(api_key);

        db.run(`INSERT OR REPLACE INTO user_ai_connections (
          user_id, ai_service_id, api_key_encrypted, model_preferences, 
          is_active, connected_at
        ) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
          [userId, ai_service_id, encryptedApiKey, JSON.stringify(model_preferences || {})],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Successfully connected to AI service' });
          }
        );
      }
    );
  });

  // Get user's AI connections
  server.get('/api/ai-connections', requireSubscriberAuth, (req, res) => {
    const userId = req.user.id;
    
    db.all(`SELECT 
      uai.id, uai.ai_service_id, uai.model_preferences, uai.usage_stats,
      uai.is_active, uai.connected_at, uai.last_used_at,
      ai.name, ai.display_name, ai.description, ai.icon_url, ai.model_options,
      ic.display_name as category
    FROM user_ai_connections uai
    JOIN ai_api_services ai ON uai.ai_service_id = ai.id
    LEFT JOIN integration_categories ic ON ai.category_id = ic.id
    WHERE uai.user_id = ? AND uai.is_active = 1
    ORDER BY uai.connected_at DESC`, [userId], (err, connections) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(connections);
    });
  });

  // Disconnect from AI service
  server.delete('/api/ai-connections/:id', requireSubscriberAuth, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    db.run('UPDATE user_ai_connections SET is_active = 0 WHERE id = ? AND user_id = ?', 
      [id, userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
          return res.status(404).json({ error: 'AI connection not found' });
        }
        res.json({ message: 'AI connection disconnected successfully' });
      }
    );
  });

  // Check if integrations are available for current user
  server.get('/api/integrations/available', requireSubscriberAuth, (req, res) => {
    const queries = [
      new Promise((resolve, reject) => {
        db.get('SELECT show_integrations_page FROM integration_settings WHERE id = 1', 
          (err, result) => err ? reject(err) : resolve(result?.show_integrations_page || false));
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM oauth_services WHERE is_active = 1 AND enabled_for_subscribers = 1', 
          (err, result) => err ? reject(err) : resolve(result.count));
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM ai_api_services WHERE is_active = 1 AND enabled_for_subscribers = 1', 
          (err, result) => err ? reject(err) : resolve(result.count));
      })
    ];

    Promise.all(queries)
      .then(results => {
        const [integrationsEnabled, oauthCount, aiCount] = results;
        const totalServices = oauthCount + aiCount;
        
        res.json({
          integrations_available: integrationsEnabled && totalServices > 0,
          integrations_page_enabled: integrationsEnabled,
          total_services: totalServices,
          oauth_services: oauthCount,
          ai_services: aiCount
        });
      })
      .catch(err => {
        console.error('Integration availability check error:', err);
        res.status(500).json({ error: 'Failed to check integration availability' });
      });
  });

  // Disconnect OAuth connection
  server.delete('/api/oauth-connections/:id', requireSubscriberAuth, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    db.run('UPDATE user_oauth_connections SET is_active = 0 WHERE id = ? AND user_id = ?', 
      [id, userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
          return res.status(404).json({ error: 'OAuth connection not found' });
        }
        
        // Log the disconnection
        db.run(`INSERT INTO oauth_auth_logs (user_id, oauth_service_id, action, success, ip_address, user_agent)
                SELECT user_id, oauth_service_id, 'disconnect', 1, ?, ?
                FROM user_oauth_connections WHERE id = ?`,
          [req.ip, req.get('User-Agent'), id]);
        
        res.json({ message: 'OAuth connection disconnected successfully' });
      }
    );
  });

  // Admin endpoint to view all OAuth connections
  server.get('/api/admin/oauth-connections', requireAuth, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    db.all(`SELECT 
      uoc.id, uoc.user_id, uoc.scope_granted, uoc.is_active, 
      uoc.connected_at, uoc.last_used_at, uoc.last_refreshed_at,
      os.name as service_name, os.display_name as service_display_name,
      u.email as user_email
    FROM user_oauth_connections uoc
    JOIN oauth_services os ON uoc.oauth_service_id = os.id
    JOIN users u ON uoc.user_id = u.id
    ORDER BY uoc.connected_at DESC
    LIMIT ? OFFSET ?`, [limit, offset], (err, connections) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get total count
      db.get('SELECT COUNT(*) as total FROM user_oauth_connections', (countErr, countResult) => {
        if (countErr) return res.status(500).json({ error: countErr.message });
        
        res.json({
          connections,
          pagination: {
            page,
            limit,
            total: countResult.total,
            pages: Math.ceil(countResult.total / limit)
          }
        });
      });
    });
  });

  // OAuth Authorization Flow endpoints

  // Initiate OAuth flow
  server.get('/api/oauth/auth/:serviceId', requireSubscriberAuth, (req, res) => {
    const { serviceId } = req.params;
    const userId = req.user.id;
    
    db.get('SELECT * FROM oauth_services WHERE id = ? AND is_active = 1', [serviceId], (err, service) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!service) return res.status(404).json({ error: 'OAuth service not found' });
      
      // Generate state parameter for security
      const state = require('crypto').randomBytes(32).toString('hex');
      
      // Store state in session or temporary storage
      req.session.oauthState = state;
      req.session.oauthServiceId = serviceId;
      req.session.oauthUserId = userId;
      
      // Build authorization URL
      const authUrl = new URL(service.authorization_url);
      authUrl.searchParams.append('client_id', service.client_id);
      authUrl.searchParams.append('redirect_uri', service.redirect_uri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('state', state);
      
      if (service.scope_default) {
        authUrl.searchParams.append('scope', service.scope_default);
      }
      
      // Log the authorization attempt
      db.run(`INSERT INTO oauth_auth_logs (user_id, oauth_service_id, action, success, ip_address, user_agent)
              VALUES (?, ?, 'auth_initiated', 1, ?, ?)`,
        [userId, serviceId, req.ip, req.get('User-Agent')]);
      
      res.json({ 
        authorization_url: authUrl.toString(),
        state: state
      });
    });
  });

  // Handle OAuth callback
  server.get('/api/oauth/callback/:serviceId', (req, res) => {
    const { serviceId } = req.params;
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect('/dashboard/connections?error=' + encodeURIComponent(error));
    }
    
    if (!code || !state) {
      return res.redirect('/dashboard/connections?error=missing_parameters');
    }
    
    // Verify state parameter
    if (!req.session.oauthState || req.session.oauthState !== state) {
      return res.redirect('/dashboard/connections?error=invalid_state');
    }
    
    const storedServiceId = req.session.oauthServiceId;
    const userId = req.session.oauthUserId;
    
    if (parseInt(storedServiceId) !== parseInt(serviceId)) {
      return res.redirect('/dashboard/connections?error=service_mismatch');
    }
    
    // Get service details
    db.get('SELECT * FROM oauth_services WHERE id = ?', [serviceId], async (err, service) => {
      if (err || !service) {
        console.error('Service not found:', err);
        return res.redirect('/dashboard/connections?error=service_not_found');
      }
      
      try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch(service.token_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: service.client_id,
            client_secret: service.client_secret,
            code: code,
            redirect_uri: service.redirect_uri
          })
        });
        
        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange code for token');
        }
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
          throw new Error('No access token received');
        }
        
        // Calculate token expiration
        const expiresAt = tokenData.expires_in 
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null;
        
        // Get user profile info if possible (optional)
        let profileInfo = null;
        try {
          if (service.name === 'google') {
            const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
            });
            if (profileResponse.ok) {
              profileInfo = await profileResponse.json();
            }
          }
        } catch (profileError) {
          console.log('Failed to fetch profile info:', profileError.message);
        }
        
        // Store or update the connection
        db.run(`INSERT OR REPLACE INTO user_oauth_connections (
          user_id, oauth_service_id, access_token, refresh_token, 
          token_expires_at, scope_granted, profile_info, is_active,
          connected_at, last_refreshed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            userId, serviceId, tokenData.access_token, tokenData.refresh_token || null,
            expiresAt, tokenData.scope || service.scope_default, 
            profileInfo ? JSON.stringify(profileInfo) : null
          ],
          function(err) {
            if (err) {
              console.error('Failed to store OAuth connection:', err);
              return res.redirect('/dashboard/connections?error=storage_failed');
            }
            
            // Log successful connection
            db.run(`INSERT INTO oauth_auth_logs (user_id, oauth_service_id, action, success, ip_address, user_agent)
                    VALUES (?, ?, 'connected', 1, ?, ?)`,
              [userId, serviceId, req.ip, req.get('User-Agent')]);
            
            // Clear session data
            delete req.session.oauthState;
            delete req.session.oauthServiceId;
            delete req.session.oauthUserId;
            
            res.redirect('/dashboard/connections?success=connected');
          }
        );
        
      } catch (error) {
        console.error('OAuth callback error:', error);
        
        // Log failed connection
        db.run(`INSERT INTO oauth_auth_logs (user_id, oauth_service_id, action, success, error_message, ip_address, user_agent)
                VALUES (?, ?, 'connection_failed', 0, ?, ?, ?)`,
          [userId, serviceId, error.message, req.ip, req.get('User-Agent')]);
        
        res.redirect('/dashboard/connections?error=connection_failed');
      }
    });
  });

  // Refresh OAuth token
  server.post('/api/oauth/refresh/:connectionId', requireSubscriberAuth, async (req, res) => {
    const { connectionId } = req.params;
    const userId = req.user.id;
    
    db.get(`SELECT uoc.*, os.token_url, os.client_id, os.client_secret
            FROM user_oauth_connections uoc
            JOIN oauth_services os ON uoc.oauth_service_id = os.id
            WHERE uoc.id = ? AND uoc.user_id = ? AND uoc.is_active = 1`,
      [connectionId, userId], async (err, connection) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!connection) return res.status(404).json({ error: 'OAuth connection not found' });
        
        if (!connection.refresh_token) {
          return res.status(400).json({ error: 'No refresh token available' });
        }
        
        try {
          const tokenResponse = await fetch(connection.token_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: connection.client_id,
              client_secret: connection.client_secret,
              refresh_token: connection.refresh_token
            })
          });
          
          if (!tokenResponse.ok) {
            throw new Error('Failed to refresh token');
          }
          
          const tokenData = await tokenResponse.json();
          
          if (!tokenData.access_token) {
            throw new Error('No access token received');
          }
          
          const expiresAt = tokenData.expires_in 
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null;
          
          // Update the connection with new tokens
          db.run(`UPDATE user_oauth_connections 
                  SET access_token = ?, refresh_token = COALESCE(?, refresh_token), 
                      token_expires_at = ?, last_refreshed_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            [tokenData.access_token, tokenData.refresh_token, expiresAt, connectionId],
            function(err) {
              if (err) return res.status(500).json({ error: err.message });
              
              // Log successful refresh
              db.run(`INSERT INTO oauth_auth_logs (user_id, oauth_service_id, action, success, ip_address, user_agent)
                      VALUES (?, ?, 'token_refreshed', 1, ?, ?)`,
                [userId, connection.oauth_service_id, req.ip, req.get('User-Agent')]);
              
              res.json({ message: 'Token refreshed successfully' });
            }
          );
          
        } catch (error) {
          console.error('Token refresh error:', error);
          
          // Log failed refresh
          db.run(`INSERT INTO oauth_auth_logs (user_id, oauth_service_id, action, success, error_message, ip_address, user_agent)
                  VALUES (?, ?, 'refresh_failed', 0, ?, ?, ?)`,
            [userId, connection.oauth_service_id, error.message, req.ip, req.get('User-Agent')]);
          
          res.status(500).json({ error: 'Failed to refresh token: ' + error.message });
        }
      }
    );
  });

  // Integration Management API routes (Admin only)

  // Get integration settings
  server.get('/api/admin/integration-settings', requireAuth, (req, res) => {
    db.get('SELECT * FROM integration_settings WHERE id = 1', (err, settings) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(settings || { show_integrations_page: false, require_admin_approval: false, auto_enable_new_services: false, integration_categories_enabled: '[]' });
    });
  });

  // Update integration settings
  server.post('/api/admin/integration-settings', requireAuth, (req, res) => {
    const { show_integrations_page, require_admin_approval, auto_enable_new_services, integration_categories_enabled } = req.body;
    
    db.run(`INSERT OR REPLACE INTO integration_settings (id, show_integrations_page, require_admin_approval, auto_enable_new_services, integration_categories_enabled, updated_by, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [show_integrations_page, require_admin_approval, auto_enable_new_services, JSON.stringify(integration_categories_enabled || []), req.user.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Integration settings updated successfully' });
      }
    );
  });

  // Get all integration categories
  server.get('/api/admin/integration-categories', requireAuth, (req, res) => {
    db.all('SELECT * FROM integration_categories ORDER BY sort_order, display_name', (err, categories) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(categories);
    });
  });

  // Get AI API services
  server.get('/api/admin/ai-services', requireAuth, (req, res) => {
    db.all(`SELECT ai.*, ic.display_name as category_name 
            FROM ai_api_services ai 
            LEFT JOIN integration_categories ic ON ai.category_id = ic.id 
            ORDER BY ai.display_name`, (err, services) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Don't expose API keys in the response
      const sanitizedServices = services.map(service => ({
        ...service,
        api_key_encrypted: service.api_key_encrypted ? '***masked***' : null
      }));
      
      res.json(sanitizedServices);
    });
  });

  // Create AI API service
  server.post('/api/admin/ai-services', requireAuth, (req, res) => {
    const { 
      name, display_name, description, api_endpoint, api_key, 
      model_options, category_id, icon_url, documentation_url,
      is_active, enabled_for_subscribers 
    } = req.body;

    if (!name || !display_name || !api_endpoint) {
      return res.status(400).json({ error: 'Name, display name, and API endpoint are required' });
    }

    const encryptedApiKey = api_key ? encryptToken(api_key) : null;

    db.run(`INSERT INTO ai_api_services (
      name, display_name, description, api_endpoint, api_key_encrypted, 
      model_options, category_id, icon_url, documentation_url, 
      is_active, enabled_for_subscribers, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, display_name, description, api_endpoint, encryptedApiKey,
       JSON.stringify(model_options || []), category_id, icon_url, 
       documentation_url, is_active !== false, enabled_for_subscribers || false, req.user.id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'AI service with this name already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'AI service created successfully', id: this.lastID });
      }
    );
  });

  // Update AI API service
  server.put('/api/admin/ai-services/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { 
      name, display_name, description, api_endpoint, api_key, 
      model_options, category_id, icon_url, documentation_url,
      is_active, enabled_for_subscribers 
    } = req.body;

    if (!name || !display_name || !api_endpoint) {
      return res.status(400).json({ error: 'Name, display name, and API endpoint are required' });
    }

    let updateFields = [
      'name = ?', 'display_name = ?', 'description = ?', 'api_endpoint = ?',
      'model_options = ?', 'category_id = ?', 'icon_url = ?', 'documentation_url = ?',
      'is_active = ?', 'enabled_for_subscribers = ?', 'updated_at = CURRENT_TIMESTAMP'
    ];
    let updateValues = [
      name, display_name, description, api_endpoint, JSON.stringify(model_options || []),
      category_id, icon_url, documentation_url, is_active !== false, enabled_for_subscribers || false
    ];

    // Only update API key if provided (not masked)
    if (api_key && api_key !== '***masked***') {
      updateFields.splice(4, 0, 'api_key_encrypted = ?');
      updateValues.splice(4, 0, encryptToken(api_key));
    }

    updateValues.push(id);

    db.run(`UPDATE ai_api_services SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues,
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'AI service with this name already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'AI service not found' });
        }
        res.json({ message: 'AI service updated successfully' });
      }
    );
  });

  // Delete AI API service
  server.delete('/api/admin/ai-services/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // Check if any users have connections to this service
    db.get('SELECT COUNT(*) as count FROM user_ai_connections WHERE ai_service_id = ?', [id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (result.count > 0) {
        return res.status(400).json({ error: 'Cannot delete AI service with active user connections' });
      }
      
      db.run('DELETE FROM ai_api_services WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
          return res.status(404).json({ error: 'AI service not found' });
        }
        res.json({ message: 'AI service deleted successfully' });
      });
    });
  });

  // Bulk enable/disable OAuth services for subscribers
  server.post('/api/admin/oauth-services/bulk-enable', requireAuth, (req, res) => {
    const { service_ids, enabled_for_subscribers } = req.body;
    
    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'Service IDs array is required' });
    }

    const placeholders = service_ids.map(() => '?').join(',');
    const updateValues = [enabled_for_subscribers ? 1 : 0, ...service_ids];

    db.run(`UPDATE oauth_services SET enabled_for_subscribers = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id IN (${placeholders})`,
      updateValues,
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
          message: `${this.changes} OAuth services ${enabled_for_subscribers ? 'enabled' : 'disabled'} for subscribers`,
          updated_count: this.changes 
        });
      }
    );
  });

  // Bulk enable/disable AI services for subscribers
  server.post('/api/admin/ai-services/bulk-enable', requireAuth, (req, res) => {
    const { service_ids, enabled_for_subscribers } = req.body;
    
    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'Service IDs array is required' });
    }

    const placeholders = service_ids.map(() => '?').join(',');
    const updateValues = [enabled_for_subscribers ? 1 : 0, ...service_ids];

    db.run(`UPDATE ai_api_services SET enabled_for_subscribers = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id IN (${placeholders})`,
      updateValues,
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
          message: `${this.changes} AI services ${enabled_for_subscribers ? 'enabled' : 'disabled'} for subscribers`,
          updated_count: this.changes 
        });
      }
    );
  });

  // Get integration overview for admin dashboard
  server.get('/api/admin/integrations-overview', requireAuth, (req, res) => {
    const queries = [
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as total_oauth, SUM(enabled_for_subscribers) as enabled_oauth FROM oauth_services WHERE is_active = 1', 
          (err, result) => err ? reject(err) : resolve({ oauth: result }));
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as total_ai, SUM(enabled_for_subscribers) as enabled_ai FROM ai_api_services WHERE is_active = 1', 
          (err, result) => err ? reject(err) : resolve({ ai: result }));
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT show_integrations_page FROM integration_settings WHERE id = 1', 
          (err, result) => err ? reject(err) : resolve({ settings: result }));
      }),
      new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(DISTINCT user_id) as connected_users 
                FROM (SELECT user_id FROM user_oauth_connections WHERE is_active = 1 
                      UNION SELECT user_id FROM user_ai_connections WHERE is_active = 1)`, 
          (err, result) => err ? reject(err) : resolve({ users: result }));
      })
    ];

    Promise.all(queries)
      .then(results => {
        const overview = {
          oauth_services: results[0].oauth,
          ai_services: results[1].ai,
          integrations_page_enabled: results[2].settings?.show_integrations_page || false,
          users_with_connections: results[3].users.connected_users || 0
        };
        res.json(overview);
      })
      .catch(err => {
        console.error('Integration overview error:', err);
        res.status(500).json({ error: 'Failed to fetch integration overview' });
      });
  });

  // Admin Error Monitoring Routes
  server.get('/api/admin/error-logs', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 50, error_type } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (error_type) {
      whereClause = 'WHERE error_type = ?';
      params.push(error_type);
    }
    
    params.push(limit, offset);
    
    const query = `
      SELECT 
        id, user_id, task_id, error_type, error_message, 
        user_email, user_plan, api_endpoint, request_method,
        response_status, created_at
      FROM error_logs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    db.all(query, params, (err, logs) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM error_logs ${whereClause}`;
      const countParams = error_type ? [error_type] : [];
      
      db.get(countQuery, countParams, (countErr, count) => {
        if (countErr) return res.status(500).json({ error: countErr.message });
        
        res.json({
          logs,
          total: count.total,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(count.total / limit)
        });
      });
    });
  });

  // Get detailed error log
  server.get('/api/admin/error-logs/:id', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    
    db.get('SELECT * FROM error_logs WHERE id = ?', [id], (err, log) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!log) return res.status(404).json({ error: 'Error log not found' });
      
      res.json(log);
    });
  });

  // Get error statistics
  server.get('/api/admin/error-stats', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const queries = [
      // Total errors in last 24 hours
      `SELECT COUNT(*) as count FROM error_logs WHERE created_at > datetime('now', '-1 day')`,
      // Total errors in last 7 days  
      `SELECT COUNT(*) as count FROM error_logs WHERE created_at > datetime('now', '-7 days')`,
      // Error types breakdown
      `SELECT error_type, COUNT(*) as count FROM error_logs GROUP BY error_type ORDER BY count DESC`,
      // Most affected users
      `SELECT user_email, COUNT(*) as error_count FROM error_logs GROUP BY user_id, user_email ORDER BY error_count DESC LIMIT 10`
    ];

    Promise.all(queries.map(query => 
      new Promise((resolve, reject) => {
        db.all(query, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      })
    )).then(([last24h, last7days, errorTypes, affectedUsers]) => {
      res.json({
        errors_last_24h: last24h[0].count,
        errors_last_7_days: last7days[0].count,
        error_types: errorTypes,
        most_affected_users: affectedUsers
      });
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
  });

  // Support Messages API Endpoints for Subscribers
  server.get('/api/support/messages', requireSubscriberAuth, (req, res) => {
    const userId = req.user.id;
    
    db.all(`SELECT id, message, sender_type, is_read, created_at 
            FROM support_messages 
            WHERE user_id = ? AND is_subscriber = true
            ORDER BY created_at ASC`,
      [userId], (err, messages) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(messages);
      });
  });

  server.post('/api/support/messages', requireSubscriberAuth, (req, res) => {
    const { message } = req.body;
    const userId = req.user.id;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get user email for the message
    db.get('SELECT email FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.run(`INSERT INTO support_messages (user_id, customer_email, message, sender_type, is_subscriber) 
              VALUES (?, ?, ?, 'customer', true)`,
        [userId, user.email, message.trim()], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          
          res.json({
            id: this.lastID,
            message: message.trim(),
            sender_type: 'customer',
            is_read: false,
            created_at: new Date().toISOString()
          });
        });
    });
  });

  // Mark subscriber messages as read
  server.put('/api/support/messages/read', requireSubscriberAuth, (req, res) => {
    const userId = req.user.id;
    
    db.run(`UPDATE support_messages 
            SET is_read = true 
            WHERE user_id = ? AND sender_type = 'admin' AND is_subscriber = true`,
      [userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
  });

  // Non-subscriber support messages (public endpoint)
  server.post('/api/support/contact', (req, res) => {
    const { email, message } = req.body;
    
    if (!email || !message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Email and message are required' });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    
    db.run(`INSERT INTO support_messages (customer_email, message, sender_type, is_subscriber) 
            VALUES (?, ?, 'customer', false)`,
      [email.toLowerCase().trim(), message.trim()], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({
          id: this.lastID,
          message: 'Your message has been sent successfully. We will get back to you soon!',
          success: true
        });
      });
  });

  // Get conversation for non-subscriber by email (for follow-up messages)
  server.get('/api/support/contact/:email', (req, res) => {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    db.all(`SELECT id, message, sender_type, is_read, created_at 
            FROM support_messages 
            WHERE customer_email = ? AND is_subscriber = false
            ORDER BY created_at ASC`,
      [email.toLowerCase().trim()], (err, messages) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(messages);
      });
  });

  // Admin Support Messages API - Get all conversations (subscribers and non-subscribers)
  server.get('/api/admin/support/conversations', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { type = 'all' } = req.query; // 'subscribers', 'non-subscribers', or 'all'
    
    let whereClause = '';
    let params = [];
    
    if (type === 'subscribers') {
      whereClause = 'WHERE sm.is_subscriber = true';
    } else if (type === 'non-subscribers') {
      whereClause = 'WHERE sm.is_subscriber = false';
    }

    db.all(`SELECT DISTINCT 
              COALESCE(sm.user_id, 'email_' || sm.customer_email) as conversation_id,
              sm.user_id,
              sm.customer_email,
              sm.is_subscriber,
              u.username,
              COALESCE(u.email, sm.customer_email) as email,
              (SELECT message FROM support_messages sm2 WHERE 
                (sm.user_id IS NOT NULL AND sm2.user_id = sm.user_id) OR 
                (sm.user_id IS NULL AND sm2.customer_email = sm.customer_email)
                ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM support_messages sm3 WHERE 
                (sm.user_id IS NOT NULL AND sm3.user_id = sm.user_id) OR 
                (sm.user_id IS NULL AND sm3.customer_email = sm.customer_email)
                ORDER BY created_at DESC LIMIT 1) as last_message_time,
              (SELECT COUNT(*) FROM support_messages sm4 WHERE 
                ((sm.user_id IS NOT NULL AND sm4.user_id = sm.user_id) OR 
                 (sm.user_id IS NULL AND sm4.customer_email = sm.customer_email))
                AND sm4.sender_type = 'customer' AND sm4.is_read = false) as unread_count
            FROM support_messages sm
            LEFT JOIN users u ON sm.user_id = u.id
            ${whereClause}
            ORDER BY last_message_time DESC`,
      params, (err, conversations) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(conversations);
      });
  });

  // Get subscriber conversations only
  server.get('/api/admin/support/subscribers', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    db.all(`SELECT DISTINCT 
              u.id as user_id, 
              u.email, 
              u.username,
              'subscriber' as type,
              (SELECT message FROM support_messages sm2 WHERE sm2.user_id = u.id AND sm2.is_subscriber = true ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM support_messages sm3 WHERE sm3.user_id = u.id AND sm3.is_subscriber = true ORDER BY created_at DESC LIMIT 1) as last_message_time,
              (SELECT COUNT(*) FROM support_messages sm4 WHERE sm4.user_id = u.id AND sm4.sender_type = 'customer' AND sm4.is_read = false AND sm4.is_subscriber = true) as unread_count
            FROM users u 
            WHERE u.id IN (SELECT DISTINCT user_id FROM support_messages WHERE is_subscriber = true AND user_id IS NOT NULL)
            ORDER BY last_message_time DESC`,
      (err, conversations) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(conversations);
      });
  });

  // Get non-subscriber conversations only
  server.get('/api/admin/support/non-subscribers', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    db.all(`SELECT DISTINCT 
              customer_email as email,
              customer_email,
              'non-subscriber' as type,
              (SELECT message FROM support_messages sm2 WHERE sm2.customer_email = sm.customer_email AND sm2.is_subscriber = false ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM support_messages sm3 WHERE sm3.customer_email = sm.customer_email AND sm3.is_subscriber = false ORDER BY created_at DESC LIMIT 1) as last_message_time,
              (SELECT COUNT(*) FROM support_messages sm4 WHERE sm4.customer_email = sm.customer_email AND sm4.sender_type = 'customer' AND sm4.is_read = false AND sm4.is_subscriber = false) as unread_count
            FROM support_messages sm
            WHERE is_subscriber = false AND customer_email IS NOT NULL
            ORDER BY last_message_time DESC`,
      (err, conversations) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(conversations);
      });
  });

  // Get messages for a specific conversation (subscriber or non-subscriber)
  server.get('/api/admin/support/messages/:identifier', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { identifier } = req.params;
    
    // Check if identifier is user_id (number) or email (string with @)
    const isEmail = identifier.includes('@');
    
    if (isEmail) {
      // Non-subscriber conversation
      db.all(`SELECT sm.*, sm.customer_email as email, 'Non-subscriber' as username 
              FROM support_messages sm 
              WHERE sm.customer_email = ? AND sm.is_subscriber = false
              ORDER BY created_at ASC`,
        [identifier], (err, messages) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(messages);
        });
    } else {
      // Subscriber conversation
      db.all(`SELECT sm.*, u.email, u.username 
              FROM support_messages sm 
              JOIN users u ON sm.user_id = u.id 
              WHERE sm.user_id = ? AND sm.is_subscriber = true
              ORDER BY created_at ASC`,
        [identifier], (err, messages) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(messages);
        });
    }
  });

  // Send message to specific conversation (subscriber or non-subscriber)
  server.post('/api/admin/support/messages/:identifier', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { identifier } = req.params;
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const isEmail = identifier.includes('@');
    
    if (isEmail) {
      // Reply to non-subscriber
      db.run(`INSERT INTO support_messages (customer_email, message, sender_type, is_subscriber) 
              VALUES (?, ?, 'admin', false)`,
        [identifier, message.trim()], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          
          res.json({
            id: this.lastID,
            message: message.trim(),
            sender_type: 'admin',
            is_read: false,
            created_at: new Date().toISOString()
          });
        });
    } else {
      // Reply to subscriber
      db.get('SELECT email FROM users WHERE id = ?', [identifier], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        db.run(`INSERT INTO support_messages (user_id, customer_email, message, sender_type, is_subscriber) 
                VALUES (?, ?, ?, 'admin', true)`,
          [identifier, user.email, message.trim()], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
              id: this.lastID,
              message: message.trim(),
              sender_type: 'admin',
              is_read: false,
              created_at: new Date().toISOString()
            });
          });
      });
    }
  });

  // Mark customer messages as read by admin
  server.put('/api/admin/support/messages/:identifier/read', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { identifier } = req.params;
    const isEmail = identifier.includes('@');
    
    if (isEmail) {
      // Mark non-subscriber messages as read
      db.run(`UPDATE support_messages 
              SET is_read = true 
              WHERE customer_email = ? AND sender_type = 'customer' AND is_subscriber = false`,
        [identifier], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        });
    } else {
      // Mark subscriber messages as read
      db.run(`UPDATE support_messages 
              SET is_read = true 
              WHERE user_id = ? AND sender_type = 'customer' AND is_subscriber = true`,
        [identifier], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        });
    }
  });

  // Admin Onboarding API Endpoints
  server.get('/api/admin/onboarding/status', requireAuth, (req, res) => {
    const userId = req.user.id;
    
    db.get('SELECT * FROM admin_onboarding WHERE user_id = ?', [userId], (err, onboarding) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (!onboarding) {
        // Create initial onboarding record
        db.run('INSERT INTO admin_onboarding (user_id) VALUES (?)', [userId], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          
          res.json({
            current_step: 0,
            completed_steps: [],
            is_completed: false,
            total_steps: 6
          });
        });
      } else {
        res.json({
          current_step: onboarding.current_step,
          completed_steps: JSON.parse(onboarding.completed_steps || '[]'),
          is_completed: onboarding.is_completed,
          total_steps: 6
        });
      }
    });
  });

  server.put('/api/admin/onboarding/step', requireAuth, (req, res) => {
    const userId = req.user.id;
    const { step, completed = false } = req.body;
    
    db.get('SELECT * FROM admin_onboarding WHERE user_id = ?', [userId], (err, onboarding) => {
      if (err) return res.status(500).json({ error: err.message });
      
      let completedSteps = JSON.parse(onboarding?.completed_steps || '[]');
      let currentStep = onboarding?.current_step || 0;
      
      if (completed && !completedSteps.includes(step)) {
        completedSteps.push(step);
        currentStep = Math.max(currentStep, step + 1);
      }
      
      const isCompleted = completedSteps.length >= 6; // Total steps
      const completedAt = isCompleted ? new Date().toISOString() : null;
      
      db.run(`UPDATE admin_onboarding 
              SET current_step = ?, completed_steps = ?, is_completed = ?, completed_at = ?
              WHERE user_id = ?`,
        [currentStep, JSON.stringify(completedSteps), isCompleted, completedAt, userId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          
          res.json({
            current_step: currentStep,
            completed_steps: completedSteps,
            is_completed: isCompleted
          });
        }
      );
    });
  });

  // Helper function to execute API Worker request
  // Function to log errors for admin monitoring
  async function logError(userId, taskId, errorType, errorMessage, errorStack, inputData, config, response) {
    return new Promise((resolve) => {
      // Get user details for better error context
      db.get('SELECT email, plan_id FROM users WHERE id = ?', [userId], (err, user) => {
        let userEmail = 'unknown';
        let userPlan = 'unknown';
        
        if (!err && user) {
          userEmail = user.email;
          // Get plan name
          db.get('SELECT name FROM plans WHERE id = ?', [user.plan_id], (planErr, plan) => {
            if (!planErr && plan) {
              userPlan = plan.name;
            }
            
            // Insert error log
            db.run(`INSERT INTO error_logs (
              user_id, task_id, error_type, error_message, error_stack,
              input_data, api_endpoint, request_method, request_body,
              response_status, response_data, user_email, user_plan
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
              userId,
              taskId,
              errorType,
              errorMessage,
              errorStack,
              JSON.stringify(inputData),
              config?.api_endpoint || null,
              config?.request_method || null,
              config?.request_body_template || null,
              response?.status || null,
              response?.data ? JSON.stringify(response.data) : null,
              userEmail,
              userPlan
            ], (insertErr) => {
              if (insertErr) {
                console.error('Failed to log error:', insertErr);
              } else {
                console.log(`Logged error for user ${userEmail} (${userId})`);
              }
              resolve();
            });
          });
        } else {
          // Insert error log without user details
          db.run(`INSERT INTO error_logs (
            user_id, task_id, error_type, error_message, error_stack,
            input_data, api_endpoint, request_method, request_body,
            response_status, response_data, user_email, user_plan
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            userId,
            taskId,
            errorType,
            errorMessage,
            errorStack,
            JSON.stringify(inputData),
            config?.api_endpoint || null,
            config?.request_method || null,
            config?.request_body_template || null,
            response?.status || null,
            response?.data ? JSON.stringify(response.data) : null,
            userEmail,
            userPlan
          ], (insertErr) => {
            if (insertErr) {
              console.error('Failed to log error:', insertErr);
            }
            resolve();
          });
        }
      });
    });
  }

  async function executeAPIWorkerRequest(config, inputData) {
    const startTime = Date.now();
    
    try {
      console.log('🔧 API Worker Request Debug:');
      console.log('Config:', {
        endpoint: config.api_endpoint,
        method: config.request_method,
        headers: config.request_headers,
        template: config.request_body_template
      });
      console.log('Input Data:', inputData);

      // Validate configuration
      if (!config.api_endpoint) {
        throw new Error('API endpoint is not configured');
      }

      // Parse headers safely
      let headers = {};
      try {
        headers = JSON.parse(config.request_headers || '{}');
      } catch (headerError) {
        console.error('Invalid request headers JSON:', config.request_headers);
        throw new Error('Invalid request headers configuration');
      }
      
      // Don't set default Content-Type if one is specified
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }

      // Process request body template with variable substitution
      let requestBody = config.request_body_template || '{}';
      
      console.log('Original request body template:', requestBody);
      console.log('Input data for substitution:', JSON.stringify(inputData, null, 2));
      
      // Replace variables in format {{variable_name}} with input data
      // We need to handle this more carefully to avoid JSON corruption
      let templateObject;
      try {
        // Parse the template as JSON first to understand its structure
        templateObject = JSON.parse(requestBody);
      } catch (templateError) {
        console.error('Invalid template JSON:', requestBody);
        throw new Error(`Invalid request body template: ${templateError.message}`);
      }
      
      // Recursively replace template variables in the parsed object
      function replaceVariablesInObject(obj, inputData) {
        if (typeof obj === 'string') {
          // Handle template strings like "{{variable_name}}"
          const templateRegex = /^{{(.+)}}$/;
          const match = obj.match(templateRegex);
          if (match) {
            const variableName = match[1];
            if (inputData.hasOwnProperty(variableName)) {
              return inputData[variableName]; // Return the actual value, preserving its type
            }
            console.log(`Warning: Template variable {{${variableName}}} not found in input data`);
            return obj; // Return unchanged if variable not found
          }
          return obj;
        } else if (Array.isArray(obj)) {
          return obj.map(item => replaceVariablesInObject(item, inputData));
        } else if (obj !== null && typeof obj === 'object') {
          const result = {};
          for (const [key, value] of Object.entries(obj)) {
            result[key] = replaceVariablesInObject(value, inputData);
          }
          return result;
        }
        return obj;
      }
      
      const processedObject = replaceVariablesInObject(templateObject, inputData);
      requestBody = JSON.stringify(processedObject);
      
      console.log('Processed template object:', JSON.stringify(processedObject, null, 2));

      console.log('Processed request body:', requestBody);

      // Handle different content types
      let parsedBody;
      const contentType = headers['Content-Type'] || headers['content-type'] || '';
      const isMultipart = contentType.toLowerCase().includes('multipart/form-data');
      const isFormEncoded = contentType.toLowerCase().includes('application/x-www-form-urlencoded');
      
      if (isMultipart) {
        // For multipart, we need to use FormData
        console.log('Using multipart/form-data format');
        const FormData = require('form-data');
        const formData = new FormData();
        
        try {
          let jsonData;
          try {
            jsonData = JSON.parse(requestBody);
          } catch (jsonError) {
            console.error('JSON Parse Error Details:');
            console.error('- Error:', jsonError.message);
            console.error('- Position:', jsonError.toString());
            console.error('- Invalid JSON:', requestBody);
            console.error('- JSON around error (10 chars):', requestBody.substring(Math.max(0, 11-10), 11+10));
            throw new Error(`Invalid JSON template after variable substitution: ${jsonError.message}. Template: ${requestBody.substring(0, 100)}...`);
          }
          
          // Handle each field in the template
          for (const [key, value] of Object.entries(jsonData)) {
            console.log(`Processing field: ${key}, value type: ${typeof value}, value:`, value);
            
            if (key === 'file' || key.includes('file')) {
              // Handle file fields specially
              if (inputData.uploaded_files && inputData.uploaded_files.length > 0) {
                // Use the first uploaded file
                const uploadedFile = inputData.uploaded_files[0];
                const fs = require('fs');
                
                if (fs.existsSync(uploadedFile.path)) {
                  console.log(`Adding file: ${uploadedFile.originalname} from ${uploadedFile.path}`);
                  formData.append(key, fs.createReadStream(uploadedFile.path), {
                    filename: uploadedFile.originalname,
                    contentType: uploadedFile.mimetype
                  });
                } else {
                  console.log(`File not found at ${uploadedFile.path}, using placeholder`);
                  formData.append(key, JSON.stringify(value));
                }
              } else if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
                // Skip unresolved template variables for files
                console.log(`Skipping unresolved file template: ${value}`);
              } else if (typeof value === 'object' && value !== null) {
                // Handle file objects that contain file data
                if (value.data && value.name) {
                  console.log(`Processing file object with data: ${value.name}`);
                  
                  // Check if data is base64 encoded (from frontend file upload)
                  if (typeof value.data === 'string' && value.data.startsWith('data:')) {
                    // Extract base64 data
                    const base64Data = value.data.split(',')[1] || value.data;
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    console.log(`Adding file from base64 data: ${value.name}, size: ${buffer.length} bytes`);
                    formData.append(key, buffer, {
                      filename: value.name,
                      contentType: value.type || 'application/octet-stream'
                    });
                  } else {
                    // If it's just text data, create a text buffer
                    const buffer = Buffer.from(value.data || '', 'utf8');
                    console.log(`Adding text file: ${value.name}, size: ${buffer.length} bytes`);
                    formData.append(key, buffer, {
                      filename: value.name || 'file.txt',
                      contentType: value.type || 'text/plain'
                    });
                  }
                } else {
                  // Fallback: convert object to JSON string
                  console.log(`Converting file object to JSON string for multipart`);
                  const fileValue = JSON.stringify(value);
                  formData.append(key, fileValue);
                }
              } else {
                // Handle string file values
                console.log(`Adding string file value: ${value}`);
                formData.append(key, String(value));
              }
            } else {
              // Handle non-file fields normally
              const fieldValue = typeof value === 'string' ? value : JSON.stringify(value);
              console.log(`Adding non-file field: ${key} = ${fieldValue}`);
              formData.append(key, fieldValue);
            }
          }
          
          parsedBody = formData;
          
          // Remove Content-Type header - axios will set it with boundary
          delete headers['Content-Type'];
          delete headers['content-type'];
          
          console.log('FormData fields prepared:', Object.keys(jsonData));
        } catch (parseError) {
          throw new Error('Invalid JSON for multipart data: ' + parseError.message);
        }
      } else if (isFormEncoded) {
        // For URL-encoded, convert JSON to URL params
        console.log('Using application/x-www-form-urlencoded format');
        try {
          const jsonData = JSON.parse(requestBody);
          const urlParams = new URLSearchParams();
          Object.entries(jsonData).forEach(([key, value]) => {
            urlParams.append(key, typeof value === 'string' ? value : JSON.stringify(value));
          });
          parsedBody = urlParams.toString();
        } catch (parseError) {
          parsedBody = requestBody;
        }
      } else {
        // Default to JSON
        console.log('Using JSON format');
        try {
          parsedBody = JSON.parse(requestBody);
        } catch (parseError) {
          console.log('Request body is not valid JSON, sending as string');
          parsedBody = requestBody;
        }
      }

      console.log('Final request config:', {
        method: config.request_method || 'POST',
        url: config.api_endpoint,
        headers,
        contentType: contentType,
        bodyType: typeof parsedBody
      });

      const response = await axios({
        method: config.request_method || 'POST',
        url: config.api_endpoint,
        headers,
        data: parsedBody,
        timeout: 30000,
        validateStatus: () => true // Don't throw on HTTP error status codes
      });

      const executionTime = Date.now() - startTime;
      
      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      return { 
        success: true, 
        status: response.status, 
        data: response.data,
        execution_time: executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.error('❌ API Worker Request Failed:');
      console.error('Error message:', error.message);
      console.error('Error details:', error.response?.data || error);
      
      throw {
        success: false,
        error: error.message,
        status: error.response?.status || 0,
        execution_time: executionTime,
        details: error.response?.data || error.toString()
      };
    }
  }

  // Pages API routes
  server.get('/api/pages', requireAuth, (req, res) => {
    db.all('SELECT * FROM pages ORDER BY created_at DESC', (err, pages) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(pages);
    });
  });

  server.post('/api/pages', requireAuth, (req, res) => {
    const { slug, title, meta_description, html_content, css_content, js_content, is_published, access_level } = req.body;
    
    // Validate required fields
    if (!slug || !title || !html_content) {
      return res.status(400).json({ error: 'Missing required fields: slug, title, html_content' });
    }
    
    // Check if slug is reserved
    if (RESERVED_PAGE_SLUGS.includes(slug.toLowerCase())) {
      return res.status(400).json({ 
        error: `The slug "${slug}" is reserved. Reserved slugs: ${RESERVED_PAGE_SLUGS.join(', ')}. Use the Reserved Pages section to customize customer-facing pages.`
      });
    }
    
    db.run(`INSERT INTO pages (slug, title, meta_description, html_content, css_content, js_content, is_published, access_level, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, title, meta_description, html_content, css_content, js_content, is_published, access_level || 'public', req.user.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Page created successfully' });
      });
  });

  server.get('/api/pages/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM pages WHERE id = ?', [id], (err, page) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!page) return res.status(404).json({ error: 'Page not found' });
      res.json(page);
    });
  });

  server.put('/api/pages/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { slug, title, meta_description, html_content, css_content, js_content, is_published, access_level } = req.body;
    
    // Validate required fields
    if (!slug || !title || !html_content) {
      return res.status(400).json({ error: 'Missing required fields: slug, title, html_content' });
    }
    
    // Check if slug is reserved
    if (RESERVED_PAGE_SLUGS.includes(slug.toLowerCase())) {
      return res.status(400).json({ 
        error: `The slug "${slug}" is reserved. Reserved slugs: ${RESERVED_PAGE_SLUGS.join(', ')}. Use the Reserved Pages section to customize customer-facing pages.`
      });
    }
    
    db.run(`UPDATE pages SET slug = ?, title = ?, meta_description = ?, html_content = ?, 
            css_content = ?, js_content = ?, is_published = ?, access_level = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      [slug, title, meta_description, html_content, css_content, js_content, is_published, access_level || 'public', id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Page updated successfully' });
      });
  });

  server.delete('/api/pages/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM pages WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Page deleted successfully' });
    });
  });

  // Blog API routes
  server.get('/api/blog', requireAuth, (req, res) => {
    db.all('SELECT * FROM blog_posts ORDER BY created_at DESC', (err, posts) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(posts);
    });
  });

  server.post('/api/blog', requireAuth, (req, res) => {
    const { title, slug, content, excerpt, featured_image, is_published } = req.body;
    
    db.run(`INSERT INTO blog_posts (title, slug, content, excerpt, featured_image, is_published, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, content, excerpt, featured_image, is_published, req.user.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Blog post created successfully' });
      });
  });

  server.put('/api/blog/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { title, slug, content, excerpt, featured_image, is_published } = req.body;
    
    db.run(`UPDATE blog_posts SET title = ?, slug = ?, content = ?, excerpt = ?, 
            featured_image = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      [title, slug, content, excerpt, featured_image, is_published, id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Blog post updated successfully' });
      });
  });

  server.delete('/api/blog/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM blog_posts WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Blog post deleted successfully' });
    });
  });

  // Public blog routes
  server.get('/blog', (req, res) => {
    return nextApp.render(req, res, '/blog');
  });

  server.get('/blog/:slug', (req, res) => {
    return nextApp.render(req, res, '/blog/[slug]', { slug: req.params.slug });
  });


  // Admin login route - allow access without authentication
  server.get('/admin/login', (req, res) => {
    return handle(req, res);
  });

  // Admin routes (Next.js) - ONLY for admin role
  server.get('/admin*', (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.redirect('/admin/login');
    }
    return handle(req, res);
  });

  server.get('/login', (req, res) => {
    return nextApp.render(req, res, '/login');
  });

  // Subscriber routes
  server.get('/subscribe/signup', (req, res) => {
    return nextApp.render(req, res, '/subscribe/signup');
  });

  server.get('/subscribe/login', (req, res) => {
    return nextApp.render(req, res, '/subscribe/login');
  });

  // Subscriber dashboard routes - ONLY for subscribers (not admins)
  server.get('/dashboard*', (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'subscriber') {
      return res.redirect('/subscribe/login');
    }
    return handle(req, res);
  });

  // Dynamic page serving - This must come LAST to catch all remaining routes
  server.get('/:slug', (req, res) => {
    const { slug } = req.params;
    
    // Skip if it's a Next.js static file or API route
    if (slug.startsWith('_next') || slug.startsWith('api') || slug.includes('.')) {
      return handle(req, res);
    }
    
    // Check regular pages
      db.get('SELECT * FROM pages WHERE slug = ? AND is_published = true', [slug], (err, page) => {
        if (err) return res.status(500).send('Server error');
        if (!page) {
          // If no dynamic page found, let Next.js handle it (could be a static page)
          return handle(req, res);
        }
      
      // Check access permissions
      if (page.access_level === 'subscriber') {
        if (!req.isAuthenticated() || (req.user.role !== 'subscriber' && req.user.role !== 'admin')) {
          return res.redirect(`/subscribe/login?redirect=/${slug}`);
        }
      }
      
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title}</title>
  <meta name="description" content="${page.meta_description || ''}">
  <style>${page.css_content || ''}</style>
</head>
<body>
  ${page.html_content}
  <script>${page.js_content || ''}</script>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      });
  });

  // Default Next.js handler for unmatched routes
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Server ready on http://localhost:${PORT}`);
    console.log(`> Admin panel: http://localhost:${PORT}/admin`);
    console.log(`> Default login: admin@example.com / admin123`);
  });
});