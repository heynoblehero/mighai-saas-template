import db from '../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../lib/config';

const JWT_SECRET = config.JWT_SECRET;

function getAdmin(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.role === 'admin' ? decoded : null;
  } catch (error) {
    return null;
  }
}

function ensureTables() {
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
}

function getDateFilter(period) {
  switch (period) {
    case '7d': return "datetime('now', '-7 days')";
    case '30d': return "datetime('now', '-30 days')";
    case '90d': return "datetime('now', '-90 days')";
    default: return "datetime('now', '-30 days')";
  }
}

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    ensureTables();

    const period = req.query.period || '30d';
    const dateFilter = getDateFilter(period);

    // Overview stats
    const pageViewStats = db.prepare(`
      SELECT
        COUNT(*) as total_views,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        COUNT(DISTINCT session_id) as total_sessions
      FROM page_views
      WHERE created_at >= ${dateFilter}
    `).get();

    // Session stats with bounce rate
    const sessionStats = db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN is_bounce = 1 THEN 1 END) as bounced_sessions,
        AVG(duration_seconds) as avg_duration,
        AVG(page_count) as avg_pages_per_session
      FROM analytics_sessions
      WHERE started_at >= ${dateFilter}
    `).get();

    const bounceRate = sessionStats.total_sessions > 0
      ? Math.round((sessionStats.bounced_sessions / sessionStats.total_sessions) * 100)
      : 0;

    // Engagement stats
    const engagementStats = db.prepare(`
      SELECT
        AVG(max_scroll_depth) as avg_scroll_depth,
        AVG(time_on_page) as avg_time_on_page
      FROM analytics_engagement
      WHERE created_at >= ${dateFilter}
    `).get();

    // Top pages
    const topPages = db.prepare(`
      SELECT
        page_path,
        COUNT(*) as views,
        COUNT(DISTINCT visitor_id) as unique_visitors
      FROM page_views
      WHERE created_at >= ${dateFilter}
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 10
    `).all();

    // Traffic sources
    const trafficSources = db.prepare(`
      SELECT
        CASE
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%bing%' THEN 'Bing'
          WHEN referrer LIKE '%facebook%' OR referrer LIKE '%fb.%' THEN 'Facebook'
          WHEN referrer LIKE '%twitter%' OR referrer LIKE '%t.co%' THEN 'Twitter'
          WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
          WHEN referrer LIKE '%youtube%' THEN 'YouTube'
          ELSE 'Other'
        END as source,
        COUNT(*) as visits,
        COUNT(DISTINCT visitor_id) as unique_visitors
      FROM page_views
      WHERE created_at >= ${dateFilter}
      GROUP BY source
      ORDER BY visits DESC
    `).all();

    // Daily trends
    const dailyTrends = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as views,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        COUNT(DISTINCT session_id) as sessions
      FROM page_views
      WHERE created_at >= ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    // Device breakdown (parse user agent)
    const deviceStats = db.prepare(`
      SELECT
        CASE
          WHEN user_agent LIKE '%Mobile%' OR user_agent LIKE '%Android%' OR user_agent LIKE '%iPhone%' THEN 'Mobile'
          WHEN user_agent LIKE '%Tablet%' OR user_agent LIKE '%iPad%' THEN 'Tablet'
          ELSE 'Desktop'
        END as device,
        COUNT(*) as visits
      FROM page_views
      WHERE created_at >= ${dateFilter}
      GROUP BY device
      ORDER BY visits DESC
    `).all();

    // Browser breakdown
    const browserStats = db.prepare(`
      SELECT
        CASE
          WHEN user_agent LIKE '%Chrome%' AND user_agent NOT LIKE '%Edg%' THEN 'Chrome'
          WHEN user_agent LIKE '%Firefox%' THEN 'Firefox'
          WHEN user_agent LIKE '%Safari%' AND user_agent NOT LIKE '%Chrome%' THEN 'Safari'
          WHEN user_agent LIKE '%Edg%' THEN 'Edge'
          ELSE 'Other'
        END as browser,
        COUNT(*) as visits
      FROM page_views
      WHERE created_at >= ${dateFilter}
      GROUP BY browser
      ORDER BY visits DESC
    `).all();

    // Real-time visitors (last 5 minutes)
    const realtimeVisitors = db.prepare(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM page_views
      WHERE created_at >= datetime('now', '-5 minutes')
    `).get();

    // Event counts by type
    const eventCounts = db.prepare(`
      SELECT
        event_type,
        COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= ${dateFilter}
      GROUP BY event_type
      ORDER BY count DESC
    `).all();

    res.status(200).json({
      overview: {
        totalViews: pageViewStats.total_views || 0,
        uniqueVisitors: pageViewStats.unique_visitors || 0,
        totalSessions: sessionStats.total_sessions || 0,
        bounceRate: bounceRate,
        avgSessionDuration: Math.round(sessionStats.avg_duration || 0),
        avgPagesPerSession: Math.round((sessionStats.avg_pages_per_session || 0) * 10) / 10,
        avgScrollDepth: Math.round(engagementStats.avg_scroll_depth || 0),
        avgTimeOnPage: Math.round(engagementStats.avg_time_on_page || 0),
        realtimeVisitors: realtimeVisitors.count || 0
      },
      topPages,
      trafficSources,
      dailyTrends,
      deviceStats,
      browserStats,
      eventCounts,
      period
    });

  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}