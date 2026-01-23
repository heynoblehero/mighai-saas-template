import db from '../../../lib/database';

// Ensure tables exist
function ensureTables() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS session_recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recording_id TEXT UNIQUE NOT NULL,
      session_id TEXT NOT NULL,
      visitor_id TEXT,
      page_url TEXT,
      page_path TEXT,
      initial_snapshot TEXT,
      events TEXT,
      duration_ms INTEGER DEFAULT 0,
      viewport_width INTEGER,
      viewport_height INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    )
  `).run();

  // Create indexes
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_recordings_session ON session_recordings(session_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_recordings_expires ON session_recordings(expires_at)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_recordings_created ON session_recordings(created_at DESC)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_recordings_page ON session_recordings(page_path)').run();
  } catch (e) {
    // Indexes may already exist
  }
}

// Get retention days from settings
function getRetentionDays() {
  try {
    const settings = db.prepare('SELECT retention_days FROM session_recording_settings WHERE id = 1').get();
    return settings?.retention_days || 7;
  } catch {
    return 7;
  }
}

// Cleanup expired recordings
function cleanupExpired() {
  try {
    const result = db.prepare(`
      DELETE FROM session_recordings
      WHERE expires_at < datetime('now')
    `).run();
    if (result.changes > 0) {
      console.log(`SessionRecording: Cleaned up ${result.changes} expired recordings`);
    }
  } catch (error) {
    console.error('Failed to cleanup expired recordings:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    ensureTables();

    // Run cleanup occasionally (1% of requests)
    if (Math.random() < 0.01) {
      cleanupExpired();
    }

    const {
      recording_id,
      session_id,
      visitor_id,
      page_url,
      page_path,
      initial_snapshot,
      events,
      duration_ms,
      viewport_width,
      viewport_height,
      is_final
    } = req.body;

    if (!recording_id || !session_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if recording already exists
    const existing = db.prepare('SELECT id, events FROM session_recordings WHERE recording_id = ?').get(recording_id);

    const retentionDays = getRetentionDays();
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

    if (existing) {
      // Append events to existing recording
      let existingEvents = [];
      try {
        existingEvents = JSON.parse(existing.events || '[]');
      } catch {
        existingEvents = [];
      }

      const newEvents = Array.isArray(events) ? events : [];
      const mergedEvents = [...existingEvents, ...newEvents];

      db.prepare(`
        UPDATE session_recordings
        SET events = ?,
            duration_ms = ?,
            expires_at = ?
        WHERE recording_id = ?
      `).run(
        JSON.stringify(mergedEvents),
        duration_ms || 0,
        expiresAt,
        recording_id
      );
    } else {
      // Create new recording
      db.prepare(`
        INSERT INTO session_recordings (
          recording_id, session_id, visitor_id, page_url, page_path,
          initial_snapshot, events, duration_ms, viewport_width, viewport_height,
          expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        recording_id,
        session_id,
        visitor_id || null,
        page_url || null,
        page_path || null,
        initial_snapshot || null,
        JSON.stringify(events || []),
        duration_ms || 0,
        viewport_width || null,
        viewport_height || null,
        expiresAt
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to save session recording:', error);
    return res.status(500).json({ error: 'Failed to save recording' });
  }
}
