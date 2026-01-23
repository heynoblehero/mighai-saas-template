import db from '../../../../lib/database';
import { withAdminAuth } from '../../../../lib/auth-middleware';

async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Recording ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get full recording data for replay
      const recording = db.prepare(`
        SELECT *
        FROM session_recordings
        WHERE recording_id = ? OR id = ?
      `).get(id, id);

      if (!recording) {
        return res.status(404).json({ error: 'Recording not found' });
      }

      // Parse events JSON
      let events = [];
      try {
        events = JSON.parse(recording.events || '[]');
      } catch {
        events = [];
      }

      return res.status(200).json({
        id: recording.id,
        recording_id: recording.recording_id,
        session_id: recording.session_id,
        visitor_id: recording.visitor_id,
        page_url: recording.page_url,
        page_path: recording.page_path,
        initial_snapshot: recording.initial_snapshot,
        events,
        duration_ms: recording.duration_ms,
        duration_seconds: Math.round((recording.duration_ms || 0) / 1000),
        viewport_width: recording.viewport_width,
        viewport_height: recording.viewport_height,
        created_at: recording.created_at,
        expires_at: recording.expires_at,
        event_count: events.length
      });
    }

    if (req.method === 'DELETE') {
      const result = db.prepare(`
        DELETE FROM session_recordings
        WHERE recording_id = ? OR id = ?
      `).run(id, id);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Recording not found' });
      }

      return res.status(200).json({ success: true, deleted: result.changes });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Session recording operation error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

export default withAdminAuth(handler);
