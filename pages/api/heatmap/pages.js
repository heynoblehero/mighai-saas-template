import db from '../../../lib/database';
import { withAdminAuth } from '../../../lib/auth-middleware';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { start_date, end_date } = req.query;

    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = end_date || new Date().toISOString();

    // Get pages with click data
    const pages = db.prepare(`
      SELECT
        page_path,
        COUNT(*) as total_clicks,
        COUNT(DISTINCT session_id) as unique_sessions,
        MAX(created_at) as last_activity
      FROM heatmap_clicks
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY page_path
      ORDER BY total_clicks DESC
      LIMIT 100
    `).all(startDate, endDate);

    // Add scroll data
    const scrollData = db.prepare(`
      SELECT
        page_path,
        COUNT(*) as scroll_sessions,
        AVG(max_scroll_percent) as avg_scroll_depth
      FROM heatmap_scroll
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY page_path
    `).all(startDate, endDate);

    const scrollMap = {};
    scrollData.forEach(s => {
      scrollMap[s.page_path] = {
        scroll_sessions: s.scroll_sessions,
        avg_scroll_depth: Math.round(s.avg_scroll_depth || 0)
      };
    });

    // Merge data
    const result = pages.map(p => ({
      ...p,
      scroll_sessions: scrollMap[p.page_path]?.scroll_sessions || 0,
      avg_scroll_depth: scrollMap[p.page_path]?.avg_scroll_depth || 0
    }));

    return res.status(200).json({
      pages: result,
      period: { start: startDate, end: endDate }
    });
  } catch (error) {
    console.error('Heatmap pages error:', error);
    return res.status(500).json({ error: 'Failed to fetch heatmap pages' });
  }
}

export default withAdminAuth(handler);
