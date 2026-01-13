import db from '../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../lib/config';

const JWT_SECRET = config.JWT_SECRET;

function getAdmin(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.role === 'admin' ? decoded : null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get revenue metrics
    const revenueMetrics = {
      totalRevenue: 0,
      monthlyRecurringRevenue: 0,
      annualRecurringRevenue: 0,
      activeSubscriptions: 0,
      churnRate: 0,
      averageRevenuePerUser: 0,
      lifetimeValue: 0
    };

    // Get active subscriptions with plan details
    const activeSubscriptions = db.prepare(`
      SELECT 
        u.id,
        u.email,
        u.subscription_status,
        u.subscription_start_date,
        u.subscription_end_date,
        p.id as plan_id,
        p.name as plan_name,
        p.price,
        p.billing_period
      FROM users u
      LEFT JOIN plans p ON u.subscription_plan_id = p.id
      WHERE u.subscription_status = 'active'
    `).all();

    revenueMetrics.activeSubscriptions = activeSubscriptions.length;

    // Calculate MRR and ARR
    let mrr = 0;
    let arr = 0;

    activeSubscriptions.forEach(sub => {
      if (sub.price) {
        if (sub.billing_period === 'monthly') {
          mrr += parseFloat(sub.price);
          arr += parseFloat(sub.price) * 12;
        } else if (sub.billing_period === 'yearly') {
          mrr += parseFloat(sub.price) / 12;
          arr += parseFloat(sub.price);
        }
      }
    });

    revenueMetrics.monthlyRecurringRevenue = Math.round(mrr * 100) / 100;
    revenueMetrics.annualRecurringRevenue = Math.round(arr * 100) / 100;

    // Calculate total revenue from payment_transactions if available
    let totalRevenue = 0;
    try {
      const paymentSum = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payment_transactions
        WHERE status = 'completed'
      `).get();
      totalRevenue = paymentSum?.total || 0;
    } catch (e) {
      // Table might not exist yet, fall back to estimate from current subscriptions
      // Estimate based on subscription duration * monthly rate
      const subEstimate = db.prepare(`
        SELECT SUM(
          CASE
            WHEN p.billing_period = 'monthly' THEN
              p.price * (1 + CAST((julianday('now') - julianday(u.subscription_start_date)) / 30 AS INTEGER))
            WHEN p.billing_period = 'yearly' THEN
              p.price * (1 + CAST((julianday('now') - julianday(u.subscription_start_date)) / 365 AS INTEGER))
            ELSE 0
          END
        ) as estimated_total
        FROM users u
        LEFT JOIN plans p ON u.subscription_plan_id = p.id
        WHERE u.subscription_status IN ('active', 'cancelled')
          AND u.subscription_start_date IS NOT NULL
      `).get();
      totalRevenue = subEstimate?.estimated_total || arr;
    }
    revenueMetrics.totalRevenue = Math.round(totalRevenue * 100) / 100;

    // Calculate ARPU
    if (activeSubscriptions.length > 0) {
      revenueMetrics.averageRevenuePerUser = Math.round((mrr / activeSubscriptions.length) * 100) / 100;
    }

    // Calculate churn rate (simplified)
    const totalUsersEver = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "subscriber"').get();
    const cancelledUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE subscription_status = "cancelled"').get();
    
    if (totalUsersEver.count > 0) {
      revenueMetrics.churnRate = Math.round((cancelledUsers.count / totalUsersEver.count) * 100 * 100) / 100;
    }

    // Calculate LTV (simplified: ARPU / Churn Rate)
    if (revenueMetrics.churnRate > 0) {
      revenueMetrics.lifetimeValue = Math.round((revenueMetrics.averageRevenuePerUser / (revenueMetrics.churnRate / 100)) * 100) / 100;
    }

    // Get revenue by plan
    const revenueByPlan = db.prepare(`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.billing_period,
        COUNT(u.id) as subscriber_count,
        SUM(CASE 
          WHEN p.billing_period = 'monthly' THEN p.price
          WHEN p.billing_period = 'yearly' THEN p.price / 12
          ELSE 0
        END) as monthly_revenue
      FROM plans p
      LEFT JOIN users u ON u.subscription_plan_id = p.id AND u.subscription_status = 'active'
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY monthly_revenue DESC
    `).all();

    // Get subscription growth over time (last 12 months)
    const subscriptionGrowth = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as new_subscribers
      FROM users
      WHERE role = 'subscriber' 
        AND created_at >= date('now', '-12 months')
      GROUP BY month
      ORDER BY month ASC
    `).all();

    // Get revenue trends (last 12 months) - simplified
    const revenueTrends = subscriptionGrowth.map(month => {
      const subsAtEndOfMonth = db.prepare(`
        SELECT COUNT(*) as count
        FROM users
        WHERE role = 'subscriber'
          AND created_at <= date(? || '-01', '+1 month')
          AND (subscription_status = 'active' OR subscription_end_date > date(? || '-01'))
      `).get(month.month, month.month);

      // Estimate revenue for that month
      const estimatedMRR = subsAtEndOfMonth.count * (revenueMetrics.averageRevenuePerUser || 0);

      return {
        month: month.month,
        revenue: Math.round(estimatedMRR * 100) / 100,
        subscribers: subsAtEndOfMonth.count
      };
    });

    // Get top customers by revenue
    const topCustomers = db.prepare(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.subscription_start_date,
        p.name as plan_name,
        p.price,
        p.billing_period,
        CASE 
          WHEN p.billing_period = 'monthly' THEN p.price
          WHEN p.billing_period = 'yearly' THEN p.price / 12
          ELSE 0
        END as monthly_value
      FROM users u
      LEFT JOIN plans p ON u.subscription_plan_id = p.id
      WHERE u.subscription_status = 'active'
      ORDER BY monthly_value DESC
      LIMIT 10
    `).all();

    res.status(200).json({
      metrics: revenueMetrics,
      revenueByPlan,
      subscriptionGrowth,
      revenueTrends,
      topCustomers,
      activeSubscriptions: activeSubscriptions.map(sub => ({
        id: sub.id,
        email: sub.email,
        plan: sub.plan_name,
        price: sub.price,
        billing_period: sub.billing_period,
        start_date: sub.subscription_start_date
      }))
    });

  } catch (error) {
    console.error('Failed to fetch revenue analytics:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
}
