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
        `SELECT u.id, u.plan_id, u.subscription_status,
                u.lemonsqueezy_customer_id, u.lemonsqueezy_subscription_id,
                u.current_period_start, u.current_period_end,
                p.name as plan_name, p.api_limit, p.page_view_limit, p.price,
                p.lemonsqueezy_product_id, p.lemonsqueezy_variant_id
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

    // Get all available plans
    const plans = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, api_limit, page_view_limit, price,
                lemonsqueezy_product_id, lemonsqueezy_variant_id
         FROM plans WHERE is_active = 1 ORDER BY price ASC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    db.close();

    res.json({
      currentPlan: {
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
      availablePlans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        apiLimit: p.api_limit,
        pageViewLimit: p.page_view_limit,
        price: p.price,
        isCurrent: p.id === user.plan_id,
      })),
    });
  } catch (error) {
    db.close();
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
