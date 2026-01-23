import db from '../../../lib/database';

// Ensure email_list table exists
function ensureTable() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS email_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      subscribed BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      unsubscribed_at DATETIME
    )
  `).run();
}

// Get API key from email_settings
function getApiKey() {
  try {
    const settings = db.prepare('SELECT email_list_api_key FROM email_settings WHERE id = 1').get();
    return settings?.email_list_api_key || null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  // Set CORS headers for external access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Validate API key
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'API key required. Use Authorization: Bearer <api_key>' });
  }

  const providedApiKey = authHeader.substring(7);
  const storedApiKey = getApiKey();

  if (!storedApiKey) {
    return res.status(401).json({ success: false, error: 'API key not configured. Please set up in admin settings.' });
  }

  if (providedApiKey !== storedApiKey) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  // Process subscription
  const { email, name, source = 'api' } = req.body;

  // Validate email
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedSource = ['chat', 'api', 'signup', 'manual'].includes(source) ? source : 'api';

  try {
    ensureTable();

    // Check if email already exists
    const existing = db.prepare('SELECT * FROM email_list WHERE email = ?').get(normalizedEmail);

    if (existing) {
      // If unsubscribed, resubscribe
      if (!existing.subscribed) {
        db.prepare(`
          UPDATE email_list
          SET subscribed = 1, unsubscribed_at = NULL, name = COALESCE(?, name)
          WHERE email = ?
        `).run(name?.trim() || null, normalizedEmail);

        return res.status(200).json({
          success: true,
          status: 'resubscribed',
          email: normalizedEmail
        });
      }

      return res.status(200).json({
        success: true,
        status: 'already_exists',
        email: normalizedEmail
      });
    }

    // Insert new email
    db.prepare(`
      INSERT INTO email_list (email, name, source, subscribed)
      VALUES (?, ?, ?, 1)
    `).run(normalizedEmail, name?.trim() || null, normalizedSource);

    return res.status(201).json({
      success: true,
      status: 'subscribed',
      email: normalizedEmail
    });
  } catch (error) {
    console.error('Error subscribing email:', error);
    return res.status(500).json({ success: false, error: 'Failed to subscribe email' });
  }
}
