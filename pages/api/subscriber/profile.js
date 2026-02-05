import sqlite3 from 'sqlite3';
import path from 'path';

function getDb() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'site_builder.db');
  return new sqlite3.Database(dbPath);
}

export default async function handler(req, res) {
  // Check authentication
  if (!req.session?.passport?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getDb();

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT u.id, u.email, u.username, u.role, u.plan_id, u.subscription_status,
                u.api_calls_used, u.page_views_used, u.current_period_start, u.current_period_end,
                u.lemonsqueezy_customer_id, u.lemonsqueezy_subscription_id,
                u.created_at, u.updated_at,
                p.name as plan_name, p.api_limit, p.page_view_limit, p.price
         FROM users u
         LEFT JOIN plans p ON u.plan_id = p.id
         WHERE u.id = ?`,
        [req.session.passport.user],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      db.close();
      return res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.created_at,
        plan: {
          id: user.plan_id,
          name: user.plan_name,
          apiLimit: user.api_limit,
          pageViewLimit: user.page_view_limit,
          price: user.price,
        },
        subscription: {
          status: user.subscription_status,
          customerId: user.lemonsqueezy_customer_id,
          subscriptionId: user.lemonsqueezy_subscription_id,
          periodStart: user.current_period_start,
          periodEnd: user.current_period_end,
        },
        usage: {
          apiCalls: user.api_calls_used || 0,
          apiLimit: user.api_limit || 0,
          pageViews: user.page_views_used || 0,
          pageViewLimit: user.page_view_limit || 0,
        },
      });
    }

    if (req.method === 'PUT') {
      const { username, email } = req.body;
      const updates = [];
      const params = [];

      if (username !== undefined) {
        updates.push('username = ?');
        params.push(username);
      }

      if (email !== undefined) {
        // Check if email is already taken
        const existingUser = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, user.id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (existingUser) {
          db.close();
          return res.status(400).json({ error: 'Email already in use' });
        }

        updates.push('email = ?');
        params.push(email);
      }

      if (updates.length === 0) {
        db.close();
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = datetime("now")');
      params.push(user.id);

      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          params,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      db.close();
      return res.json({ success: true, message: 'Profile updated' });
    }

    db.close();
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    db.close();
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
