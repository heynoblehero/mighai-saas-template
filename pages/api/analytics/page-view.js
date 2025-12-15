import db from '../../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { page_path, referrer, user_agent } = req.body;

  if (!page_path) {
    return res.status(400).json({ error: 'Page path is required' });
  }

  try {
    // Initialize analytics table if it doesn't exist
    db.prepare(`
      CREATE TABLE IF NOT EXISTS page_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_path TEXT NOT NULL,
        referrer TEXT,
        user_agent TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Get client IP address
    const ip_address = req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] || 
                      req.connection?.remoteAddress || 
                      req.socket?.remoteAddress || 
                      (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
                      'unknown';

    // Record page view
    db.prepare(`
      INSERT INTO page_views (page_path, referrer, user_agent, ip_address)
      VALUES (?, ?, ?, ?)
    `).run(page_path, referrer || null, user_agent || null, ip_address);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to track page view:', error);
    res.status(500).json({ error: 'Failed to track page view' });
  }
}