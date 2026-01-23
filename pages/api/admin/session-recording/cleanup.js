import db from '../../../../lib/database';
import { withAdminAuth } from '../../../../lib/auth-middleware';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get count before cleanup
    const beforeCount = db.prepare(`
      SELECT COUNT(*) as count FROM session_recordings
      WHERE expires_at < datetime('now')
    `).get();

    // Delete expired recordings
    const result = db.prepare(`
      DELETE FROM session_recordings
      WHERE expires_at < datetime('now')
    `).run();

    // Get current stats
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_recordings,
        SUM(LENGTH(events) + LENGTH(COALESCE(initial_snapshot, ''))) as total_size_bytes,
        MIN(created_at) as oldest_recording,
        MAX(created_at) as newest_recording
      FROM session_recordings
    `).get();

    return res.status(200).json({
      success: true,
      deleted: result.changes,
      expired_found: beforeCount?.count || 0,
      stats: {
        total_recordings: stats?.total_recordings || 0,
        total_size_mb: Math.round((stats?.total_size_bytes || 0) / 1024 / 1024 * 100) / 100,
        oldest_recording: stats?.oldest_recording,
        newest_recording: stats?.newest_recording
      }
    });
  } catch (error) {
    console.error('Failed to cleanup session recordings:', error);
    return res.status(500).json({ error: 'Failed to cleanup recordings' });
  }
}

export default withAdminAuth(handler);
