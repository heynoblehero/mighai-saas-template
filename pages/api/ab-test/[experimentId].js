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
  const { experimentId } = req.query;
  const sessionId = req.query.session_id;

  // Route admin CRUD operations
  if (req.method === 'PUT') {
    return handlePut(req, res, experimentId);
  }

  if (req.method === 'DELETE') {
    return handleDelete(req, res, experimentId);
  }

  // GET - Return variant for user (public)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize ab_tests table if it doesn't exist
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS ab_tests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          experiment_id TEXT NOT NULL,
          name TEXT NOT NULL,
          variant_a_content TEXT,
          variant_b_content TEXT,
          variant_a_weight INTEGER DEFAULT 50,
          variant_b_weight INTEGER DEFAULT 50,
          is_active BOOLEAN DEFAULT TRUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(experiment_id)
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
    } catch (error) {
      // Tables might already exist
    }

    // Get experiment
    const experiment = db.prepare(`
      SELECT * FROM ab_tests 
      WHERE experiment_id = ? AND is_active = 1
    `).get(experimentId);

    if (!experiment) {
      // Return default variant if experiment doesn't exist
      return res.status(200).json({
        variant: 'A',
        content: null
      });
    }

    // Check if user already has an assignment
    let assignment = db.prepare(`
      SELECT * FROM ab_test_assignments 
      WHERE experiment_id = ? AND session_id = ?
    `).get(experimentId, sessionId);

    if (!assignment) {
      // Assign variant based on weights
      const totalWeight = experiment.variant_a_weight + experiment.variant_b_weight;
      const random = Math.random() * totalWeight;
      const variant = random < experiment.variant_a_weight ? 'A' : 'B';

      // Store assignment
      db.prepare(`
        INSERT INTO ab_test_assignments (experiment_id, session_id, variant)
        VALUES (?, ?, ?)
      `).run(experimentId, sessionId, variant);

      assignment = { variant };
    }

    // Return variant with content
    const content = assignment.variant === 'A' 
      ? experiment.variant_a_content 
      : experiment.variant_b_content;

    res.status(200).json({
      variant: assignment.variant,
      content: content
    });

  } catch (error) {
    console.error('Failed to get A/B test variant:', error);
    res.status(200).json({
      variant: 'A',
      content: null
    });
  }
}

// PUT - Update experiment (admin only)
async function handlePut(req, res, experimentId) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const { name, description, page_path, status, variants } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // Calculate weights from variants or use defaults
    const variantA = variants?.[0] || { traffic_split: 50, content: '' };
    const variantB = variants?.[1] || { traffic_split: 50, content: '' };

    // Try to update by id first, then by experiment_id
    let result = db.prepare(`
      UPDATE ab_tests SET
        name = ?,
        description = ?,
        page_path = ?,
        status = ?,
        variants = ?,
        variant_a_content = ?,
        variant_b_content = ?,
        variant_a_weight = ?,
        variant_b_weight = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR experiment_id = ?
    `).run(
      name,
      description || '',
      page_path || '',
      status || 'active',
      JSON.stringify(variants || []),
      variantA.content || '',
      variantB.content || '',
      variantA.traffic_split || 50,
      variantB.traffic_split || 50,
      status === 'active' ? 1 : 0,
      experimentId,
      experimentId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to update experiment:', error);
    return res.status(500).json({ error: 'Failed to update experiment' });
  }
}

// DELETE - Delete experiment (admin only)
async function handleDelete(req, res, experimentId) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  try {
    // Delete by id or experiment_id
    const result = db.prepare(`
      DELETE FROM ab_tests WHERE id = ? OR experiment_id = ?
    `).run(experimentId, experimentId);

    // Also delete assignments
    db.prepare(`
      DELETE FROM ab_test_assignments WHERE experiment_id = ?
    `).run(experimentId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to delete experiment:', error);
    return res.status(500).json({ error: 'Failed to delete experiment' });
  }
}
