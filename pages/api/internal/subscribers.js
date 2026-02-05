/**
 * Internal API: List Subscribers
 * GET /api/internal/subscribers
 *
 * Returns subscribers (non-admin users) with their plan info
 *
 * Query params:
 * - limit: Number of subscribers to return (default: 50)
 * - offset: Pagination offset (default: 0)
 * - plan_id: Filter by plan ID
 * - subscription_status: Filter by status (active, inactive, cancelled)
 */

import { withInternalAuth } from '@/lib/internal-auth';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'site_builder.db');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = new Database(dbPath);

    const {
      limit = 50,
      offset = 0,
      plan_id,
      subscription_status
    } = req.query;

    // Build query for subscribers only (non-admin)
    let sql = `
      SELECT
        u.id, u.email, u.username, u.name,
        u.plan_id, u.subscription_status, u.api_calls_used, u.page_views_used,
        u.created_at, u.last_successful_login,
        p.name as plan_name, p.price, p.api_limit, p.page_view_limit
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      WHERE u.role = 'subscriber'
    `;
    const params = [];

    if (plan_id) {
      sql += ' AND u.plan_id = ?';
      params.push(plan_id);
    }

    if (subscription_status) {
      sql += ' AND u.subscription_status = ?';
      params.push(subscription_status);
    }

    // Count total for pagination
    const countSql = sql.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = db.prepare(countSql).get(...params);

    // Add pagination
    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const subscribers = db.prepare(sql).all(...params);
    db.close();

    return res.status(200).json({
      subscribers: subscribers.map(u => ({
        id: u.id,
        email: u.email,
        username: u.username,
        name: u.name,
        plan: {
          id: u.plan_id,
          name: u.plan_name,
          price: u.price,
          api_limit: u.api_limit,
          page_view_limit: u.page_view_limit
        },
        subscription_status: u.subscription_status,
        usage: {
          api_calls: u.api_calls_used,
          page_views: u.page_views_used
        },
        created_at: u.created_at,
        last_login: u.last_successful_login
      })),
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('[Internal API] List subscribers error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscribers', message: error.message });
  }
}

export default withInternalAuth(handler);
