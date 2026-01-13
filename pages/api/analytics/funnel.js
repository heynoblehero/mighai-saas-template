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

  const { period = '30' } = req.query; // days
  const daysAgo = parseInt(period);

  try {
    // Define conversion funnel stages
    const funnelStages = {
      landing: 0,
      signup_page: 0,
      signup_complete: 0,
      first_login: 0,
      upgrade_page: 0,
      subscription_complete: 0
    };

    // Get landing page views
    const landingViews = db.prepare(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM page_views
      WHERE page_path = '/' 
        AND created_at >= datetime('now', '-${daysAgo} days')
    `).get();
    funnelStages.landing = landingViews.count;

    // Get signup page views
    const signupPageViews = db.prepare(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM page_views
      WHERE page_path LIKE '/subscribe/signup%'
        AND created_at >= datetime('now', '-${daysAgo} days')
    `).get();
    funnelStages.signup_page = signupPageViews.count;

    // Get completed signups (users created)
    const signupsComplete = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= datetime('now', '-${daysAgo} days')
    `).get();
    funnelStages.signup_complete = signupsComplete.count;

    // Get first logins (analytics events)
    const firstLogins = db.prepare(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM analytics_events
      WHERE event_type = 'login' 
        AND created_at >= datetime('now', '-${daysAgo} days')
    `).get();
    funnelStages.first_login = firstLogins.count || funnelStages.signup_complete;

    // Get upgrade page views
    const upgradePageViews = db.prepare(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM page_views
      WHERE page_path LIKE '/dashboard/upgrade%'
        AND created_at >= datetime('now', '-${daysAgo} days')
    `).get();
    funnelStages.upgrade_page = upgradePageViews.count;

    // Get completed subscriptions
    const subscriptionsComplete = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE subscription_status = 'active'
        AND subscription_start_date >= datetime('now', '-${daysAgo} days')
    `).get();
    funnelStages.subscription_complete = subscriptionsComplete.count;

    // Calculate conversion rates
    const conversionRates = {
      landing_to_signup_page: funnelStages.landing > 0 
        ? Math.round((funnelStages.signup_page / funnelStages.landing) * 100 * 100) / 100 
        : 0,
      signup_page_to_complete: funnelStages.signup_page > 0 
        ? Math.round((funnelStages.signup_complete / funnelStages.signup_page) * 100 * 100) / 100 
        : 0,
      signup_to_login: funnelStages.signup_complete > 0 
        ? Math.round((funnelStages.first_login / funnelStages.signup_complete) * 100 * 100) / 100 
        : 0,
      login_to_upgrade_page: funnelStages.first_login > 0 
        ? Math.round((funnelStages.upgrade_page / funnelStages.first_login) * 100 * 100) / 100 
        : 0,
      upgrade_page_to_subscription: funnelStages.upgrade_page > 0 
        ? Math.round((funnelStages.subscription_complete / funnelStages.upgrade_page) * 100 * 100) / 100 
        : 0,
      overall_conversion: funnelStages.landing > 0 
        ? Math.round((funnelStages.subscription_complete / funnelStages.landing) * 100 * 100) / 100 
        : 0
    };

    // Get drop-off points
    const dropOffs = {
      landing_to_signup: funnelStages.landing - funnelStages.signup_page,
      signup_page_to_complete: funnelStages.signup_page - funnelStages.signup_complete,
      signup_to_login: funnelStages.signup_complete - funnelStages.first_login,
      login_to_upgrade: funnelStages.first_login - funnelStages.upgrade_page,
      upgrade_to_subscription: funnelStages.upgrade_page - funnelStages.subscription_complete
    };

    // Get funnel by traffic source
    const funnelBySource = db.prepare(`
      SELECT 
        CASE 
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%facebook%' THEN 'Facebook'
          WHEN referrer LIKE '%twitter%' THEN 'Twitter'
          ELSE 'Other'
        END as source,
        COUNT(DISTINCT session_id) as visitors
      FROM page_views
      WHERE page_path = '/'
        AND created_at >= datetime('now', '-${daysAgo} days')
      GROUP BY source
      ORDER BY visitors DESC
    `).all();

    // Get time to conversion (in days)
    const timeToConversion = db.prepare(`
      SELECT 
        AVG(julianday(subscription_start_date) - julianday(created_at)) as avg_days
      FROM users
      WHERE subscription_status = 'active'
        AND subscription_start_date >= datetime('now', '-${daysAgo} days')
    `).get();

    res.status(200).json({
      period: `${daysAgo} days`,
      funnel: funnelStages,
      conversionRates,
      dropOffs,
      funnelBySource,
      avgTimeToConversion: timeToConversion.avg_days 
        ? Math.round(timeToConversion.avg_days * 10) / 10 
        : 0
    });

  } catch (error) {
    console.error('Failed to fetch funnel analytics:', error);
    res.status(500).json({ error: 'Failed to fetch funnel analytics' });
  }
}
