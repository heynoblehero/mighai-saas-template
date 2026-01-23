import db from '../../../lib/database';
import { withAdminAuth } from '../../../lib/auth-middleware';

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

async function handler(req, res) {
  ensureTable();

  if (req.method === 'GET') {
    return getEmailList(req, res);
  } else if (req.method === 'POST') {
    return addEmail(req, res);
  } else if (req.method === 'DELETE') {
    return unsubscribeEmail(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getEmailList(req, res) {
  try {
    const { page = 1, limit = 50, source, subscribed, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '1=1';
    const params = [];

    if (source && source !== 'all') {
      whereClause += ' AND source = ?';
      params.push(source);
    }

    if (subscribed !== undefined && subscribed !== 'all') {
      whereClause += ' AND subscribed = ?';
      params.push(subscribed === 'true' ? 1 : 0);
    }

    if (search) {
      whereClause += ' AND (email LIKE ? OR name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM email_list WHERE ${whereClause}
    `).get(...params);

    // Get emails with pagination
    const emails = db.prepare(`
      SELECT * FROM email_list
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    // Get stats
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN subscribed = 1 THEN 1 ELSE 0 END) as subscribed_count,
        SUM(CASE WHEN subscribed = 0 THEN 1 ELSE 0 END) as unsubscribed_count,
        SUM(CASE WHEN source = 'chat' THEN 1 ELSE 0 END) as from_chat,
        SUM(CASE WHEN source = 'api' THEN 1 ELSE 0 END) as from_api,
        SUM(CASE WHEN source = 'signup' THEN 1 ELSE 0 END) as from_signup,
        SUM(CASE WHEN source = 'manual' THEN 1 ELSE 0 END) as from_manual
      FROM email_list
    `).get();

    res.status(200).json({
      emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / parseInt(limit))
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching email list:', error);
    res.status(500).json({ error: 'Failed to fetch email list' });
  }
}

async function addEmail(req, res) {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedEmail = email.toLowerCase().trim();

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

        const updated = db.prepare('SELECT * FROM email_list WHERE email = ?').get(normalizedEmail);
        return res.status(200).json({
          success: true,
          status: 'resubscribed',
          email: updated
        });
      }
      return res.status(200).json({
        success: true,
        status: 'already_exists',
        email: existing
      });
    }

    // Insert new email
    const result = db.prepare(`
      INSERT INTO email_list (email, name, source, subscribed)
      VALUES (?, ?, 'manual', 1)
    `).run(normalizedEmail, name?.trim() || null);

    const newEmail = db.prepare('SELECT * FROM email_list WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      status: 'added',
      email: newEmail
    });
  } catch (error) {
    console.error('Error adding email:', error);
    res.status(500).json({ error: 'Failed to add email' });
  }
}

async function unsubscribeEmail(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = db.prepare('SELECT * FROM email_list WHERE email = ?').get(normalizedEmail);

    if (!existing) {
      return res.status(404).json({ error: 'Email not found' });
    }

    db.prepare(`
      UPDATE email_list
      SET subscribed = 0, unsubscribed_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `).run(normalizedEmail);

    res.status(200).json({ success: true, message: 'Email unsubscribed' });
  } catch (error) {
    console.error('Error unsubscribing email:', error);
    res.status(500).json({ error: 'Failed to unsubscribe email' });
  }
}

export default withAdminAuth(handler);
