import db from '../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all subscribers (users with active subscriptions)
    const subscribers = db.prepare(`
      SELECT 
        id,
        email,
        name,
        role,
        subscription_status,
        subscription_plan_id,
        subscription_start_date,
        subscription_end_date,
        created_at
      FROM users
      WHERE role = 'subscriber' OR subscription_status = 'active'
      ORDER BY created_at DESC
    `).all();

    // Get plan details for each subscriber
    const subscribersWithPlans = subscribers.map(subscriber => {
      let plan = null;
      if (subscriber.subscription_plan_id) {
        plan = db.prepare('SELECT id, name, price FROM plans WHERE id = ?')
          .get(subscriber.subscription_plan_id);
      }
      
      return {
        ...subscriber,
        plan: plan || null
      };
    });
    
    res.status(200).json(subscribersWithPlans);
  } catch (error) {
    console.error('Failed to fetch subscribers:', error);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
}