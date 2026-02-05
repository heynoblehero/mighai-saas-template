import sqlite3 from 'sqlite3';
import path from 'path';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

function getDb() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'site_builder.db');
  return new sqlite3.Database(dbPath);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  if (!req.session?.passport?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ error: 'Plan ID required' });
  }

  const db = getDb();

  try {
    // Get user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [req.session.passport.user], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }

    // Get plan
    const plan = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM plans WHERE id = ?', [planId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!plan) {
      db.close();
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (!plan.lemonsqueezy_variant_id) {
      db.close();
      return res.status(400).json({ error: 'Plan not configured for payments' });
    }

    db.close();

    // Create Lemon Squeezy checkout
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;

    if (!storeId) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    const checkout = await createCheckout(storeId, plan.lemonsqueezy_variant_id, {
      checkoutOptions: {
        embed: false,
      },
      checkoutData: {
        email: user.email,
        custom: {
          user_id: user.id.toString(),
          plan_id: plan.id.toString(),
        },
      },
      productOptions: {
        redirectUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/dashboard?checkout=success`,
      },
    });

    if (!checkout.data?.data?.attributes?.url) {
      throw new Error('Failed to create checkout');
    }

    res.json({
      checkoutUrl: checkout.data.data.attributes.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
}
