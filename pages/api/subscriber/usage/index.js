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

  // Check authentication
  if (!req.session?.passport?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getDb();

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT u.id, u.api_calls_used, u.page_views_used,
                u.current_period_start, u.current_period_end,
                p.api_limit, p.page_view_limit, p.name as plan_name
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

    db.close();

    const apiCallsUsed = user.api_calls_used || 0;
    const pageViewsUsed = user.page_views_used || 0;
    const apiLimit = user.api_limit || 0;
    const pageViewLimit = user.page_view_limit || 0;

    res.json({
      plan: user.plan_name,
      period: {
        start: user.current_period_start,
        end: user.current_period_end,
      },
      apiCalls: {
        used: apiCallsUsed,
        limit: apiLimit,
        remaining: Math.max(0, apiLimit - apiCallsUsed),
        percentage: apiLimit > 0 ? Math.round((apiCallsUsed / apiLimit) * 100) : 0,
      },
      pageViews: {
        used: pageViewsUsed,
        limit: pageViewLimit,
        remaining: Math.max(0, pageViewLimit - pageViewsUsed),
        percentage: pageViewLimit > 0 ? Math.round((pageViewsUsed / pageViewLimit) * 100) : 0,
      },
    });
  } catch (error) {
    db.close();
    console.error('Usage error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
