/**
 * Internal API: List Plans
 * GET /api/internal/plans
 */

import { withInternalAuth } from '@/lib/internal-auth';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'site_builder.db');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = new Database(dbPath);

    const plans = db.prepare(`
      SELECT
        id, name, api_limit, page_view_limit, price,
        lemonsqueezy_product_id, lemonsqueezy_variant_id,
        is_active, created_at, updated_at
      FROM plans
      ORDER BY price ASC
    `).all();

    db.close();

    return res.status(200).json({
      plans: plans.map(p => ({
        id: p.id,
        name: p.name,
        limits: {
          api_calls: p.api_limit,
          page_views: p.page_view_limit
        },
        price: p.price,
        is_active: !!p.is_active,
        payment_ids: {
          product_id: p.lemonsqueezy_product_id,
          variant_id: p.lemonsqueezy_variant_id
        },
        created_at: p.created_at,
        updated_at: p.updated_at
      }))
    });

  } catch (error) {
    console.error('[Internal API] List plans error:', error);
    return res.status(500).json({ error: 'Failed to fetch plans', message: error.message });
  }
}

export default withInternalAuth(handler);
