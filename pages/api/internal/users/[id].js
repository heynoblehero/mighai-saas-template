/**
 * Internal API: Get/Update User by ID
 * GET /api/internal/users/:id - Get user details
 * PATCH /api/internal/users/:id - Update user (subscription_status, plan_id)
 */

import { withInternalAuth } from '@/lib/internal-auth';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'site_builder.db');

async function handler(req, res) {
  const { id } = req.query;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (req.method === 'GET') {
    return getUser(req, res, id);
  } else if (req.method === 'PATCH') {
    return updateUser(req, res, id);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getUser(req, res, id) {
  try {
    const db = new Database(dbPath);

    const user = db.prepare(`
      SELECT
        u.id, u.email, u.username, u.name, u.role,
        u.plan_id, u.subscription_status, u.api_calls_used, u.page_views_used,
        u.created_at, u.last_successful_login,
        u.lemonsqueezy_customer_id, u.lemonsqueezy_subscription_id,
        p.name as plan_name, p.api_limit, p.page_view_limit, p.price as plan_price
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      WHERE u.id = ?
    `).get(id);

    db.close();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      plan: {
        id: user.plan_id,
        name: user.plan_name,
        api_limit: user.api_limit,
        page_view_limit: user.page_view_limit,
        price: user.plan_price
      },
      subscription: {
        status: user.subscription_status,
        customer_id: user.lemonsqueezy_customer_id,
        subscription_id: user.lemonsqueezy_subscription_id
      },
      usage: {
        api_calls: user.api_calls_used,
        page_views: user.page_views_used
      },
      created_at: user.created_at,
      last_login: user.last_successful_login
    });

  } catch (error) {
    console.error('[Internal API] Get user error:', error);
    return res.status(500).json({ error: 'Failed to fetch user', message: error.message });
  }
}

async function updateUser(req, res, id) {
  const { subscription_status, plan_id, api_calls_used, page_views_used } = req.body;

  // Validate subscription_status if provided
  const validStatuses = ['active', 'inactive', 'cancelled', 'paused', 'past_due'];
  if (subscription_status && !validStatuses.includes(subscription_status)) {
    return res.status(400).json({
      error: 'Invalid subscription_status',
      message: `Must be one of: ${validStatuses.join(', ')}`
    });
  }

  try {
    const db = new Database(dbPath);

    // Check user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }

    // If plan_id provided, verify it exists
    if (plan_id) {
      const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(plan_id);
      if (!plan) {
        db.close();
        return res.status(400).json({ error: 'Invalid plan_id', message: 'Plan not found' });
      }
    }

    // Build update query
    const updates = [];
    const params = [];

    if (subscription_status !== undefined) {
      updates.push('subscription_status = ?');
      params.push(subscription_status);
    }
    if (plan_id !== undefined) {
      updates.push('plan_id = ?');
      params.push(plan_id);
    }
    if (api_calls_used !== undefined) {
      updates.push('api_calls_used = ?');
      params.push(api_calls_used);
    }
    if (page_views_used !== undefined) {
      updates.push('page_views_used = ?');
      params.push(page_views_used);
    }

    if (updates.length === 0) {
      db.close();
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    db.close();

    return res.status(200).json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('[Internal API] Update user error:', error);
    return res.status(500).json({ error: 'Failed to update user', message: error.message });
  }
}

export default withInternalAuth(handler);
