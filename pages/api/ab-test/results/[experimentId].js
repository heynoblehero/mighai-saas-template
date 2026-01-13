import db from '../../../../lib/database';
import { withAdminAuth } from '../../../../lib/auth-middleware';

function ensureTables() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ab_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      experiment_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      page_path TEXT,
      status TEXT DEFAULT 'active',
      variants TEXT,
      variant_a_weight INTEGER DEFAULT 50,
      variant_b_weight INTEGER DEFAULT 50,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS ab_test_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      experiment_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      variant TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(experiment_id, session_id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS ab_test_conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      experiment_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      variant TEXT NOT NULL,
      conversion_type TEXT NOT NULL,
      conversion_value REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(experiment_id, session_id, conversion_type)
    )
  `).run();
}

// Normal CDF approximation for z-score to p-value
function normalCDF(z) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

function calculateSignificance(variantA, variantB) {
  if (!variantA || !variantB || variantA.visitors === 0 || variantB.visitors === 0) {
    return null;
  }

  const conversionTypeA = Object.keys(variantA.conversions || {})[0];
  const conversionTypeB = Object.keys(variantB.conversions || {})[0];

  if (!conversionTypeA && !conversionTypeB) {
    return null;
  }

  const convA = variantA.conversions[conversionTypeA] || { count: 0 };
  const convB = variantB.conversions[conversionTypeB] || { count: 0 };

  const p1 = convA.count / variantA.visitors;
  const p2 = convB.count / variantB.visitors;
  const n1 = variantA.visitors;
  const n2 = variantB.visitors;

  if (n1 + n2 === 0) return null;

  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
  if (pooledP === 0 || pooledP === 1) return null;

  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));
  if (se === 0) return null;

  const z = (p1 - p2) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  const confidence = (1 - pValue) * 100;

  return {
    zScore: z.toFixed(3),
    pValue: pValue.toFixed(4),
    confidence: confidence.toFixed(1),
    isSignificant: confidence >= 95
  };
}

function determineWinner(results, significance) {
  if (!significance?.isSignificant) return null;

  const variants = Object.entries(results);
  if (variants.length < 2) return null;

  let bestVariant = null;
  let bestRate = -1;

  variants.forEach(([name, data]) => {
    const primaryConversion = Object.values(data.conversions || {})[0];
    const rate = primaryConversion ? primaryConversion.rate : 0;
    if (rate > bestRate) {
      bestRate = rate;
      bestVariant = name;
    }
  });

  return bestVariant;
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    ensureTables();

    const { experimentId } = req.query;

    // Get experiment details
    const experiment = db.prepare(`
      SELECT * FROM ab_tests WHERE id = ? OR experiment_id = ?
    `).get(experimentId, experimentId);

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const expId = experiment.experiment_id;

    // Get assignment counts per variant
    const assignments = db.prepare(`
      SELECT variant, COUNT(*) as count
      FROM ab_test_assignments
      WHERE experiment_id = ?
      GROUP BY variant
    `).all(expId);

    // Get conversion counts per variant and type
    const conversions = db.prepare(`
      SELECT variant, conversion_type, COUNT(*) as count, SUM(conversion_value) as total_value
      FROM ab_test_conversions
      WHERE experiment_id = ?
      GROUP BY variant, conversion_type
    `).all(expId);

    // Build results object
    const results = {};

    assignments.forEach(a => {
      results[a.variant] = {
        visitors: a.count,
        conversions: {},
        conversionRate: 0
      };
    });

    conversions.forEach(c => {
      if (results[c.variant]) {
        const rate = results[c.variant].visitors > 0
          ? (c.count / results[c.variant].visitors * 100)
          : 0;

        results[c.variant].conversions[c.conversion_type] = {
          count: c.count,
          value: c.total_value || 0,
          rate: parseFloat(rate.toFixed(2))
        };
      }
    });

    // Calculate overall conversion rate for each variant
    Object.keys(results).forEach(variant => {
      const totalConversions = Object.values(results[variant].conversions)
        .reduce((sum, c) => sum + c.count, 0);
      results[variant].conversionRate = results[variant].visitors > 0
        ? parseFloat((totalConversions / results[variant].visitors * 100).toFixed(2))
        : 0;
    });

    // Calculate statistical significance (compare first two variants)
    const variantNames = Object.keys(results);
    let significance = null;
    if (variantNames.length >= 2) {
      significance = calculateSignificance(
        results[variantNames[0]],
        results[variantNames[1]]
      );
    }

    const winner = determineWinner(results, significance);

    return res.status(200).json({
      experiment: {
        id: experiment.id,
        experiment_id: experiment.experiment_id,
        name: experiment.name,
        description: experiment.description,
        status: experiment.status,
        created_at: experiment.created_at
      },
      results,
      significance,
      winner,
      totalVisitors: assignments.reduce((sum, a) => sum + a.count, 0),
      totalConversions: conversions.reduce((sum, c) => sum + c.count, 0)
    });

  } catch (error) {
    console.error('Failed to fetch experiment results:', error);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
}

export default withAdminAuth(handler);
