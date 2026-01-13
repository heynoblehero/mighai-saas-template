import db from '../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../lib/config';

const JWT_SECRET = config.JWT_SECRET;

function getSubscriber(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    return (decoded.role === 'subscriber' || decoded.role === 'admin') ? decoded : null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  const user = getSubscriber(req);
  if (!user) {
    return res.status(401).json({ error: 'Subscriber authentication required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { period = '30d', usage_type } = req.query;

    // Calculate date range based on period
    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = "created_at >= datetime('now', '-7 days')";
        break;
      case '30d':
        dateFilter = "created_at >= datetime('now', '-30 days')";
        break;
      case '90d':
        dateFilter = "created_at >= datetime('now', '-90 days')";
        break;
      default:
        dateFilter = "created_at >= datetime('now', '-30 days')";
    }

    // Base query conditions
    let whereConditions = [`user_id = ? AND ${dateFilter}`];
    let params = [user.id];

    // Add usage type filter if specified
    if (usage_type) {
      whereConditions.push('usage_type = ?');
      params.push(usage_type);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get summary statistics
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COALESCE(SUM(estimated_cost), 0) as total_cost,
        COUNT(*) as total_requests
      FROM ai_usage_logs
      ${whereClause}
    `).get(params);

    // Get daily usage breakdown
    const dailyUsage = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        SUM(tokens_used) as tokens_used,
        SUM(estimated_cost) as estimated_cost,
        COUNT(*) as requests
      FROM ai_usage_logs
      ${whereClause}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 30
    `).all(params);

    // Get usage by type
    const usageByType = db.prepare(`
      SELECT 
        usage_type,
        SUM(tokens_used) as tokens_used,
        SUM(estimated_cost) as estimated_cost,
        COUNT(*) as requests
      FROM ai_usage_logs
      ${whereClause}
      GROUP BY usage_type
    `).all(params);

    // Get usage by provider
    const usageByProvider = db.prepare(`
      SELECT 
        provider,
        SUM(tokens_used) as tokens_used,
        SUM(estimated_cost) as estimated_cost,
        COUNT(*) as requests
      FROM ai_usage_logs
      ${whereClause}
      GROUP BY provider
      HAVING provider IS NOT NULL
    `).all(params);

    res.status(200).json({
      period,
      summary: {
        total_tokens: summary.total_tokens,
        total_cost: parseFloat(summary.total_cost),
        total_requests: summary.total_requests
      },
      daily_usage: dailyUsage,
      usage_by_type: usageByType,
      usage_by_provider: usageByProvider
    });

  } catch (error) {
    console.error('Failed to fetch AI usage analytics:', error);
    res.status(500).json({ error: 'Failed to fetch AI usage data' });
  }
}