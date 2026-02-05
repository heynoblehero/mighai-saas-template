/**
 * Internal API: Analytics Summary
 * GET /api/internal/analytics/summary
 *
 * Returns basic analytics about subscribers and usage
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

    // Total subscribers
    const totalSubscribers = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role = 'subscriber'"
    ).get();

    // Subscribers by status
    const byStatus = db.prepare(`
      SELECT subscription_status, COUNT(*) as count
      FROM users
      WHERE role = 'subscriber'
      GROUP BY subscription_status
    `).all();

    // Subscribers by plan
    const byPlan = db.prepare(`
      SELECT p.name as plan_name, p.id as plan_id, COUNT(u.id) as count
      FROM plans p
      LEFT JOIN users u ON p.id = u.plan_id AND u.role = 'subscriber'
      GROUP BY p.id
      ORDER BY p.price ASC
    `).all();

    // New subscribers today
    const today = new Date().toISOString().split('T')[0];
    const newToday = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'subscriber' AND date(created_at) = date(?)
    `).get(today);

    // New subscribers this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const newThisWeek = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'subscriber' AND created_at >= ?
    `).get(weekAgo);

    // New subscribers this month
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const newThisMonth = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'subscriber' AND created_at >= ?
    `).get(monthAgo);

    // Total API usage
    const apiUsage = db.prepare(`
      SELECT SUM(api_calls_used) as total
      FROM users
      WHERE role = 'subscriber'
    `).get();

    // Recent signups (last 10)
    const recentSignups = db.prepare(`
      SELECT u.id, u.email, u.name, u.created_at, p.name as plan_name
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      WHERE u.role = 'subscriber'
      ORDER BY u.created_at DESC
      LIMIT 10
    `).all();

    db.close();

    return res.status(200).json({
      summary: {
        total_subscribers: totalSubscribers.count,
        new_today: newToday.count,
        new_this_week: newThisWeek.count,
        new_this_month: newThisMonth.count,
        total_api_calls: apiUsage.total || 0
      },
      by_status: byStatus.reduce((acc, row) => {
        acc[row.subscription_status || 'unknown'] = row.count;
        return acc;
      }, {}),
      by_plan: byPlan.map(p => ({
        plan_id: p.plan_id,
        plan_name: p.plan_name,
        subscriber_count: p.count
      })),
      recent_signups: recentSignups.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        plan: u.plan_name,
        signed_up_at: u.created_at
      }))
    });

  } catch (error) {
    console.error('[Internal API] Analytics summary error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics', message: error.message });
  }
}

export default withInternalAuth(handler);
