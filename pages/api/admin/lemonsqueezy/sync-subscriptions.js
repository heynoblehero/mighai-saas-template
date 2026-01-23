import jwt from 'jsonwebtoken';
import config from '../../../../lib/config';
import db from '../../../../lib/database';
import { getSubscriptions } from '../../../../services/lemonsqueezyService';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if API key is configured
    if (!process.env.LEMONSQUEEZY_API_KEY) {
      return res.status(400).json({
        error: 'LemonSqueezy API key not configured',
        message: 'Please set LEMONSQUEEZY_API_KEY in your environment variables'
      });
    }

    const storeId = process.env.LEMONSQUEEZY_STORE_ID || null;

    // Fetch all subscriptions from LemonSqueezy
    const lsSubscriptions = await getSubscriptions({ storeId });

    // Get all plans with LemonSqueezy variant IDs
    const plans = db.prepare(`
      SELECT id, name, lemonsqueezy_variant_id
      FROM plans
      WHERE lemonsqueezy_variant_id IS NOT NULL
    `).all();

    // Create variant ID to plan mapping
    const variantToPlan = {};
    for (const plan of plans) {
      variantToPlan[plan.lemonsqueezy_variant_id] = plan;
    }

    const results = {
      processed: 0,
      updated: 0,
      created: 0,
      skipped: 0,
      errors: []
    };

    for (const subscription of lsSubscriptions) {
      results.processed++;

      try {
        // Find user by email
        const user = db.prepare('SELECT id, subscription_status, lemonsqueezy_subscription_id FROM users WHERE email = ?')
          .get(subscription.userEmail);

        if (!user) {
          results.skipped++;
          continue;
        }

        // Determine plan from variant ID
        const plan = variantToPlan[subscription.variantId];

        // Determine subscription status
        let newStatus = 'free';
        if (['active', 'on_trial'].includes(subscription.status)) {
          newStatus = plan ? plan.name.toLowerCase() : 'active';
        } else if (['cancelled', 'expired'].includes(subscription.status)) {
          newStatus = 'cancelled';
        } else if (['past_due', 'unpaid'].includes(subscription.status)) {
          newStatus = 'past_due';
        }

        // Check if update is needed
        const needsUpdate =
          user.subscription_status !== newStatus ||
          user.lemonsqueezy_subscription_id !== subscription.id;

        if (needsUpdate) {
          // Update user subscription info
          db.prepare(`
            UPDATE users
            SET subscription_status = ?,
                lemonsqueezy_subscription_id = ?,
                subscription_ends_at = ?
            WHERE id = ?
          `).run(
            newStatus,
            subscription.id,
            subscription.endsAt || subscription.renewsAt,
            user.id
          );

          results.updated++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        console.error('Error processing subscription:', subscription.id, error);
        results.errors.push({
          subscriptionId: subscription.id,
          email: subscription.userEmail,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sync completed. Processed: ${results.processed}, Updated: ${results.updated}, Skipped: ${results.skipped}`,
      results,
      syncedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error syncing subscriptions:', error);
    return res.status(500).json({
      error: 'Failed to sync subscriptions',
      message: error.message
    });
  }
}
