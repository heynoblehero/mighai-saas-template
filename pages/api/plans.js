import db from '../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all plans from database
    const plans = db.prepare(`
      SELECT 
        id,
        name,
        description,
        price,
        billing_period,
        features,
        is_popular,
        is_active,
        created_at,
        updated_at
      FROM plans
      WHERE is_active = 1
      ORDER BY price ASC
    `).all();

    // Parse JSON features if stored as string
    const parsedPlans = plans.map(plan => ({
      ...plan,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
      is_popular: Boolean(plan.is_popular),
      is_active: Boolean(plan.is_active)
    }));
    
    res.status(200).json(parsedPlans);
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
}