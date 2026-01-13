import db from '../../../lib/database';
import { withAdminAuth } from '../../../lib/auth-middleware';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { page_path, type = 'clicks', start_date, end_date, limit = 10000 } = req.query;

    if (!page_path) {
      return res.status(400).json({ error: 'page_path is required' });
    }

    const startDate = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = end_date || new Date().toISOString();

    switch (type) {
      case 'clicks':
        return getClickData(page_path, startDate, endDate, parseInt(limit), res);
      case 'movements':
        return getMovementData(page_path, startDate, endDate, parseInt(limit), res);
      case 'scroll':
        return getScrollData(page_path, startDate, endDate, res);
      case 'summary':
        return getSummary(page_path, startDate, endDate, res);
      default:
        return res.status(400).json({ error: 'Invalid type. Use: clicks, movements, scroll, or summary' });
    }
  } catch (error) {
    console.error('Heatmap data error:', error);
    return res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
}

function getClickData(page_path, startDate, endDate, limit, res) {
  const clicks = db.prepare(`
    SELECT
      x, y, x_percent, y_percent,
      viewport_width, viewport_height, page_width, page_height,
      element_tag, element_id, element_class, element_text,
      created_at
    FROM heatmap_clicks
    WHERE page_path = ?
      AND created_at >= ?
      AND created_at <= ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(page_path, startDate, endDate, limit);

  // Aggregate clicks into grid cells for heatmap rendering
  const gridSize = 20; // 20px grid cells
  const heatmapGrid = {};

  clicks.forEach(click => {
    // Use percentage-based positioning for responsive display
    const xPercent = click.x_percent || (click.x / (click.page_width || 1920) * 100);
    const yPercent = click.y_percent || (click.y / (click.page_height || 1080) * 100);

    const gridX = Math.floor(xPercent / 2); // 2% grid cells
    const gridY = Math.floor(yPercent / 2);
    const key = `${gridX},${gridY}`;

    if (!heatmapGrid[key]) {
      heatmapGrid[key] = { x: gridX * 2, y: gridY * 2, count: 0 };
    }
    heatmapGrid[key].count++;
  });

  // Get element click stats
  const elementStats = {};
  clicks.forEach(click => {
    if (click.element_tag) {
      const key = click.element_id || click.element_class || click.element_tag;
      if (!elementStats[key]) {
        elementStats[key] = {
          tag: click.element_tag,
          id: click.element_id,
          class: click.element_class,
          text: click.element_text,
          count: 0
        };
      }
      elementStats[key].count++;
    }
  });

  return res.status(200).json({
    total_clicks: clicks.length,
    heatmap: Object.values(heatmapGrid),
    raw_clicks: clicks.slice(0, 1000), // Limit raw data
    element_stats: Object.values(elementStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    period: { start: startDate, end: endDate }
  });
}

function getMovementData(page_path, startDate, endDate, limit, res) {
  const movements = db.prepare(`
    SELECT points, viewport_width, viewport_height, created_at
    FROM heatmap_movements
    WHERE page_path = ?
      AND created_at >= ?
      AND created_at <= ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(page_path, startDate, endDate, limit);

  // Aggregate movement points into attention heatmap
  const attentionGrid = {};
  let totalPoints = 0;

  movements.forEach(m => {
    try {
      const points = JSON.parse(m.points);
      points.forEach(point => {
        const gridX = Math.floor(point.x / 20);
        const gridY = Math.floor(point.y / 20);
        const key = `${gridX},${gridY}`;

        if (!attentionGrid[key]) {
          attentionGrid[key] = { x: gridX * 20, y: gridY * 20, intensity: 0 };
        }
        attentionGrid[key].intensity++;
        totalPoints++;
      });
    } catch (e) {
      // Skip invalid JSON
    }
  });

  // Normalize intensities
  const maxIntensity = Math.max(...Object.values(attentionGrid).map(g => g.intensity), 1);
  Object.values(attentionGrid).forEach(g => {
    g.intensity = g.intensity / maxIntensity;
  });

  return res.status(200).json({
    total_sessions: movements.length,
    total_points: totalPoints,
    attention_map: Object.values(attentionGrid),
    period: { start: startDate, end: endDate }
  });
}

function getScrollData(page_path, startDate, endDate, res) {
  const scrollData = db.prepare(`
    SELECT max_scroll_percent, viewport_height, page_height
    FROM heatmap_scroll
    WHERE page_path = ?
      AND created_at >= ?
      AND created_at <= ?
  `).all(page_path, startDate, endDate);

  // Calculate scroll depth distribution
  const depthBuckets = {
    '0-25': 0,
    '25-50': 0,
    '50-75': 0,
    '75-100': 0
  };

  const foldViews = {};

  scrollData.forEach(s => {
    const depth = s.max_scroll_percent || 0;
    if (depth <= 25) depthBuckets['0-25']++;
    else if (depth <= 50) depthBuckets['25-50']++;
    else if (depth <= 75) depthBuckets['50-75']++;
    else depthBuckets['75-100']++;

    // Track fold views (how many users saw each fold)
    const foldsSeen = Math.ceil(depth / 100 * (s.page_height / (s.viewport_height || 800)));
    for (let i = 1; i <= foldsSeen; i++) {
      foldViews[i] = (foldViews[i] || 0) + 1;
    }
  });

  const totalSessions = scrollData.length;
  const avgScrollDepth = totalSessions > 0
    ? scrollData.reduce((sum, s) => sum + (s.max_scroll_percent || 0), 0) / totalSessions
    : 0;

  return res.status(200).json({
    total_sessions: totalSessions,
    avg_scroll_depth: Math.round(avgScrollDepth),
    depth_distribution: depthBuckets,
    fold_views: foldViews,
    period: { start: startDate, end: endDate }
  });
}

function getSummary(page_path, startDate, endDate, res) {
  // Get click count
  const clickStats = db.prepare(`
    SELECT COUNT(*) as total_clicks, COUNT(DISTINCT session_id) as unique_sessions
    FROM heatmap_clicks
    WHERE page_path = ?
      AND created_at >= ?
      AND created_at <= ?
  `).get(page_path, startDate, endDate);

  // Get movement sessions
  const movementStats = db.prepare(`
    SELECT COUNT(*) as total_recordings, COUNT(DISTINCT session_id) as unique_sessions
    FROM heatmap_movements
    WHERE page_path = ?
      AND created_at >= ?
      AND created_at <= ?
  `).get(page_path, startDate, endDate);

  // Get scroll stats
  const scrollStats = db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      AVG(max_scroll_percent) as avg_scroll_depth,
      MAX(max_scroll_percent) as max_scroll_depth
    FROM heatmap_scroll
    WHERE page_path = ?
      AND created_at >= ?
      AND created_at <= ?
  `).get(page_path, startDate, endDate);

  // Get top clicked elements
  const topElements = db.prepare(`
    SELECT
      element_tag, element_id, element_class, element_text,
      COUNT(*) as click_count
    FROM heatmap_clicks
    WHERE page_path = ?
      AND created_at >= ?
      AND created_at <= ?
      AND element_tag IS NOT NULL
    GROUP BY element_tag, element_id, element_class
    ORDER BY click_count DESC
    LIMIT 10
  `).all(page_path, startDate, endDate);

  return res.status(200).json({
    page_path,
    period: { start: startDate, end: endDate },
    clicks: {
      total: clickStats.total_clicks,
      unique_sessions: clickStats.unique_sessions
    },
    movements: {
      total_recordings: movementStats.total_recordings,
      unique_sessions: movementStats.unique_sessions
    },
    scroll: {
      total_sessions: scrollStats.total_sessions,
      avg_depth: Math.round(scrollStats.avg_scroll_depth || 0),
      max_depth: scrollStats.max_scroll_depth || 0
    },
    top_elements: topElements
  });
}

export default withAdminAuth(handler);
