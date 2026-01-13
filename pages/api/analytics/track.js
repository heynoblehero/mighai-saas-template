import db from '../../../lib/database';

// Ensure all analytics tables exist
function ensureTables() {
  db.prepare(`
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
  `).run();

  db.prepare(`
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
  `).run();

  db.prepare(`
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
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS analytics_engagement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      page_path TEXT NOT NULL,
      max_scroll_depth INTEGER DEFAULT 0,
      time_on_page INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    ensureTables();

    // Handle sendBeacon requests (Content-Type might be text/plain)
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    }

    const { event_type, page_path, session_id, visitor_id, event_data } = body;

    // Get request metadata
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
    const referrer = event_data?.referrer || req.headers.referer || '';

    // Store analytics event
    db.prepare(`
      INSERT INTO analytics_events (event_type, page_path, session_id, visitor_id, event_data, user_agent, ip_address, referrer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event_type,
      page_path || '',
      session_id,
      visitor_id,
      JSON.stringify(event_data || {}),
      userAgent,
      ipAddress,
      referrer
    );

    // Handle specific event types
    switch (event_type) {
      case 'page_view':
        // Store in page_views table
        db.prepare(`
          INSERT INTO page_views (page_path, session_id, visitor_id, referrer, user_agent, ip_address)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(page_path, session_id, visitor_id, referrer, userAgent, ipAddress);
        break;

      case 'session_start':
        // Create or update session record
        db.prepare(`
          INSERT INTO analytics_sessions (session_id, visitor_id, first_page, last_page, entry_referrer, user_agent, ip_address, page_count, is_bounce)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, TRUE)
          ON CONFLICT(session_id) DO UPDATE SET
            last_page = excluded.first_page,
            page_count = page_count + 1,
            is_bounce = CASE WHEN page_count >= 1 THEN FALSE ELSE TRUE END
        `).run(session_id, visitor_id, page_path, page_path, event_data?.entry_referrer || referrer, userAgent, ipAddress);
        break;

      case 'page_exit':
        // Update engagement data
        const timeOnPage = event_data?.time_on_page || 0;
        const scrollDepth = event_data?.max_scroll_depth || 0;

        // Insert or update engagement record
        db.prepare(`
          INSERT INTO analytics_engagement (session_id, page_path, max_scroll_depth, time_on_page)
          VALUES (?, ?, ?, ?)
          ON CONFLICT DO NOTHING
        `).run(session_id, page_path, scrollDepth, timeOnPage);

        // Update session with duration
        db.prepare(`
          UPDATE analytics_sessions
          SET duration_seconds = duration_seconds + ?,
              last_page = ?,
              ended_at = CURRENT_TIMESTAMP,
              is_bounce = CASE WHEN page_count > 1 THEN FALSE ELSE TRUE END
          WHERE session_id = ?
        `).run(timeOnPage, page_path, session_id);
        break;

      case 'scroll':
        // Update max scroll depth for the page
        const depth = event_data?.scroll_depth || 0;
        db.prepare(`
          INSERT INTO analytics_engagement (session_id, page_path, max_scroll_depth, time_on_page)
          VALUES (?, ?, ?, 0)
          ON CONFLICT DO NOTHING
        `).run(session_id, page_path, depth);

        // Update if higher
        db.prepare(`
          UPDATE analytics_engagement
          SET max_scroll_depth = MAX(max_scroll_depth, ?)
          WHERE session_id = ? AND page_path = ?
        `).run(depth, session_id, page_path);
        break;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to track analytics:', error);
    res.status(500).json({ error: 'Failed to track analytics' });
  }
}
