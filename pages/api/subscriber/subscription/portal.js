import sqlite3 from 'sqlite3';
import path from 'path';

function getDb() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'site_builder.db');
  return new sqlite3.Database(dbPath);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  if (!req.session?.passport?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getDb();

  try {
    // Get user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [req.session.passport.user], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    db.close();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.lemonsqueezy_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Lemon Squeezy customer portal URL format
    // Users manage their subscriptions through the Lemon Squeezy customer portal
    const portalUrl = `https://app.lemonsqueezy.com/my-orders`;

    res.json({
      portalUrl,
      message: 'Redirecting to billing portal',
    });
  } catch (error) {
    console.error('Portal error:', error);
    res.status(500).json({ error: 'Failed to get portal URL' });
  }
}
