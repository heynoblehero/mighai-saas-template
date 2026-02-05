/**
 * Internal API: List Users
 * GET /api/internal/users
 *
 * Query params:
 * - limit: Number of users to return (default: 50)
 * - offset: Pagination offset (default: 0)
 * - role: Filter by role (admin, subscriber)
 * - plan_id: Filter by plan ID
 * - subscription_status: Filter by subscription status
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
      role,
      plan_id,
      subscription_status
    } = req.query;

    // Build query with optional filters
    let sql = `
      SELECT
        u.id, u.email, u.username, u.name, u.role,
        u.plan_id, u.subscription_status, u.api_calls_used, u.page_views_used,
        u.created_at, u.last_successful_login,
        p.name as plan_name, p.api_limit, p.page_view_limit
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      sql += ' AND u.role = ?';
      params.push(role);
    }

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

    const users = db.prepare(sql).all(...params);
    db.close();

    return res.status(200).json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        username: u.username,
        name: u.name,
        role: u.role,
        plan: {
          id: u.plan_id,
          name: u.plan_name,
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
    console.error('[Internal API] List users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users', message: error.message });
  }
}

export default withInternalAuth(handler);
