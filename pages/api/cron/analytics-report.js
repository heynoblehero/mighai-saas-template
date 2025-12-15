import db from '../../../lib/database.js';
import telegramNotifier from '../../../lib/telegram.js';

export default async function handler(req, res) {
  // Simple authentication - you can improve this with proper API keys
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'default-cron-secret'}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type } = req.query; // 'daily', 'weekly', or 'monthly'

  try {
    let analyticsData;

    switch (type) {
      case 'daily':
        analyticsData = await generateDailyReport();
        break;
      case 'weekly':
        analyticsData = await generateWeeklyReport();
        break;
      case 'monthly':
        analyticsData = await generateMonthlyReport();
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Send the analytics report
    const result = await telegramNotifier.sendNotification(`${type}Report`, analyticsData);

    res.status(200).json({ 
      success: true, 
      message: `${type} report sent`,
      result
    });

  } catch (error) {
    console.error(`Error generating ${type} report:`, error);
    res.status(500).json({ error: `Failed to generate ${type} report` });
  }
}

async function generateDailyReport() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const startDate = yesterday.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  return generateReport(startDate, endDate);
}

async function generateWeeklyReport() {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);

  const startDate = lastWeek.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  return generateReport(startDate, endDate);
}

async function generateMonthlyReport() {
  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setMonth(today.getMonth() - 1);

  const startDate = lastMonth.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  return generateReport(startDate, endDate);
}

async function generateReport(startDate, endDate) {
  try {
    // Get user statistics
    const newSignups = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= ? AND created_at < ?
      AND role = 'subscriber'
    `).get(startDate, endDate)?.count || 0;

    const totalUsers = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE role = 'subscriber'
    `).get()?.count || 0;

    const freeUsers = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE role = 'subscriber' 
      AND (subscription_status IS NULL OR subscription_status = 'free')
    `).get()?.count || 0;

    const paidUsers = totalUsers - freeUsers;

    // Get subscription statistics (if you have a subscriptions table)
    let newSubscriptions = 0;
    let totalRevenue = 0;
    let mrr = 0;

    try {
      newSubscriptions = db.prepare(`
        SELECT COUNT(*) as count FROM subscriptions 
        WHERE created_at >= ? AND created_at < ?
        AND status = 'active'
      `).get(startDate, endDate)?.count || 0;

      const revenueQuery = db.prepare(`
        SELECT SUM(amount) as total FROM subscriptions 
        WHERE created_at >= ? AND created_at < ?
        AND status = 'active'
      `).get(startDate, endDate);
      
      totalRevenue = revenueQuery?.total || 0;

      const mrrQuery = db.prepare(`
        SELECT SUM(amount) as total FROM subscriptions 
        WHERE status = 'active'
        AND billing_cycle = 'monthly'
      `).get();
      
      mrr = mrrQuery?.total || 0;
    } catch (error) {
      console.log('Subscriptions table not found, using default values');
    }

    // Calculate growth rates (simplified)
    const userGrowth = newSignups > 0 ? Math.round((newSignups / Math.max(totalUsers - newSignups, 1)) * 100) : 0;
    const revenueGrowth = totalRevenue > 0 ? 15 : 0; // Placeholder calculation

    return {
      startDate,
      endDate,
      newSignups,
      activeUsers: totalUsers,
      freeUsers,
      paidUsers,
      newSubscriptions,
      totalRevenue: totalRevenue.toFixed(2),
      mrr: mrr.toFixed(2),
      userGrowth,
      revenueGrowth
    };

  } catch (error) {
    console.error('Error generating analytics data:', error);
    
    // Return basic data if database queries fail
    return {
      startDate,
      endDate,
      newSignups: 0,
      activeUsers: 0,
      freeUsers: 0,
      paidUsers: 0,
      newSubscriptions: 0,
      totalRevenue: '0.00',
      mrr: '0.00',
      userGrowth: 0,
      revenueGrowth: 0,
      note: 'Limited data available'
    };
  }
}