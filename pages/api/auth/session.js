import sqlite3 from 'sqlite3';
import path from 'path';

function getDb() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'site_builder.db');
  return new sqlite3.Database(dbPath);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if user is logged in via session
  if (!req.session?.passport?.user) {
    return res.json({
      authenticated: false,
      user: null,
    });
  }

  const db = getDb();

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT u.id, u.email, u.username, u.role, u.plan_id, u.subscription_status,
                p.name as plan_name, p.api_limit, p.page_view_limit
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

    db.close();

    if (!user) {
      return res.json({
        authenticated: false,
        user: null,
      });
    }

    // Don't expose sensitive data
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        plan: {
          id: user.plan_id,
          name: user.plan_name,
          apiLimit: user.api_limit,
          pageViewLimit: user.page_view_limit,
        },
        subscriptionStatus: user.subscription_status,
      },
    });
  } catch (error) {
    db.close();
    console.error('Session check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
