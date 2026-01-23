import db from '../../../../lib/database';
import { withAdminAuth } from '../../../../lib/auth-middleware';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      page = 1,
      limit = 20,
      page_path,
      start_date,
      end_date,
      session_id
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const offset = (pageNum - 1) * limitNum;

    // Build query with filters
    let whereClause = 'WHERE expires_at > datetime("now")';
    const params = [];

    if (page_path) {
      whereClause += ' AND page_path = ?';
      params.push(page_path);
    }

    if (session_id) {
      whereClause += ' AND session_id = ?';
      params.push(session_id);
    }

    if (start_date) {
      whereClause += ' AND created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND created_at <= ?';
      params.push(end_date + ' 23:59:59');
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM session_recordings ${whereClause}
    `).get(...params);

    const total = countResult?.total || 0;

    // Get recordings (without full events data for performance)
    const recordings = db.prepare(`
      SELECT
        id,
        recording_id,
        session_id,
        visitor_id,
        page_url,
        page_path,
        duration_ms,
        viewport_width,
        viewport_height,
        created_at,
        expires_at
      FROM session_recordings
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    // Get unique pages for filter dropdown
    const pages = db.prepare(`
      SELECT DISTINCT page_path, COUNT(*) as count
      FROM session_recordings
      WHERE expires_at > datetime('now')
      GROUP BY page_path
      ORDER BY count DESC
      LIMIT 50
    `).all();

    return res.status(200).json({
      recordings: recordings.map(r => ({
        ...r,
        duration_seconds: Math.round((r.duration_ms || 0) / 1000)
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      },
      filters: {
        pages: pages.map(p => ({ path: p.page_path, count: p.count }))
      }
    });
  } catch (error) {
    console.error('Failed to list session recordings:', error);
    return res.status(500).json({ error: 'Failed to list recordings' });
  }
}

export default withAdminAuth(handler);
