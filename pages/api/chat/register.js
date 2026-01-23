import db from '../../../lib/database';
import crypto from 'crypto';

// Create chat_users table if it doesn't exist
function ensureTable() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS chat_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      session_token TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

// Create email_list table if it doesn't exist
function ensureEmailListTable() {
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

// Add user to email list
function addToEmailList(email, name) {
  try {
    ensureEmailListTable();
    db.prepare(`
      INSERT OR IGNORE INTO email_list (email, name, source, subscribed)
      VALUES (?, ?, 'chat', 1)
    `).run(email.toLowerCase().trim(), name?.trim() || null);
  } catch (error) {
    console.error('Error adding to email list:', error);
    // Don't throw - email list is non-critical
  }
}

function generateToken() {
  return 'chat_' + crypto.randomBytes(32).toString('hex');
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    ensureTable();

    // Check if user already exists
    let chatUser = db.prepare('SELECT * FROM chat_users WHERE email = ?').get(email);

    if (chatUser) {
      // User exists, generate new token if they don't have one
      if (!chatUser.session_token) {
        const token = generateToken();
        db.prepare('UPDATE chat_users SET session_token = ? WHERE id = ?').run(token, chatUser.id);
        chatUser.session_token = token;
      }
    } else {
      // Create new chat user
      const token = generateToken();
      const result = db.prepare(`
        INSERT INTO chat_users (email, name, session_token)
        VALUES (?, ?, ?)
      `).run(email.toLowerCase().trim(), name?.trim() || null, token);

      chatUser = db.prepare('SELECT * FROM chat_users WHERE id = ?').get(result.lastInsertRowid);

      // Add to email list for new users
      addToEmailList(email, name);
    }

    // Set cookie for the token
    res.setHeader('Set-Cookie', `chat_token=${chatUser.session_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`);

    return res.status(200).json({
      success: true,
      token: chatUser.session_token,
      user: {
        id: chatUser.id,
        email: chatUser.email,
        name: chatUser.name,
        type: 'guest'
      }
    });
  } catch (error) {
    console.error('Error registering chat user:', error);
    return res.status(500).json({ error: 'Failed to register' });
  }
}
