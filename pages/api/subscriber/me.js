// pages/api/subscriber/me.js
// Get current subscriber's profile, plan details, and usage stats
import { withSubscriberAuth } from '../../../lib/subscriber-auth';
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'site_builder.db');

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, email } = req.subscriber;
  const db = new sqlite3.Database(dbPath);

  try {
    // Get subscriber with plan details
    const user = await dbGet(db, `
      SELECT u.id, u.username, u.email, u.created_at,
             u.api_calls_used, u.page_views_used,
             u.subscription_status, u.plan_id,
             p.name as plan_name, p.api_limit, p.page_view_limit, p.price
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.id
      WHERE u.id = ? AND u.role = 'subscriber'
    `, [id]);

    if (!user) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    // Get content counts
    const taskCount = await dbGet(db,
      'SELECT COUNT(*) as count FROM customer_tasks WHERE user_id = ?', [id]
    );
    const fileCount = await dbGet(db,
      'SELECT COUNT(*) as count FROM storage_files WHERE uploaded_by = ?', [email]
    );

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
      subscription: {
        status: user.subscription_status,
        planId: user.plan_id,
        planName: user.plan_name,
        price: user.price
      },
      usage: {
        apiCalls: { used: user.api_calls_used || 0, limit: user.api_limit || 0 },
        pageViews: { used: user.page_views_used || 0, limit: user.page_view_limit || 0 }
      },
      content: {
        tasks: taskCount?.count || 0,
        files: fileCount?.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching subscriber profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    db.close();
  }
}

export default withSubscriberAuth(handler);
