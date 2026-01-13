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

// Ensure tables exist with all needed columns
function ensureTables() {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ab_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experiment_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        page_path TEXT,
        status TEXT DEFAULT 'active',
        variants TEXT,
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

    // Try to add columns if they don't exist (for existing tables)
    try { db.prepare('ALTER TABLE ab_tests ADD COLUMN description TEXT').run(); } catch (e) {}
    try { db.prepare('ALTER TABLE ab_tests ADD COLUMN page_path TEXT').run(); } catch (e) {}
    try { db.prepare('ALTER TABLE ab_tests ADD COLUMN status TEXT DEFAULT "active"').run(); } catch (e) {}
    try { db.prepare('ALTER TABLE ab_tests ADD COLUMN variants TEXT').run(); } catch (e) {}
  } catch (error) {
    // Table might already exist
  }
}

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  ensureTables();

  if (req.method === 'GET') {
    // List all experiments
    try {
      const experiments = db.prepare(`
        SELECT * FROM ab_tests ORDER BY created_at DESC
      `).all();

      // Parse variants JSON and normalize response
      const parsedExperiments = experiments.map(exp => ({
        id: exp.id,
        experiment_id: exp.experiment_id,
        name: exp.name,
        description: exp.description || '',
        page_path: exp.page_path || '',
        status: exp.status || (exp.is_active ? 'active' : 'paused'),
        variants: exp.variants ? JSON.parse(exp.variants) : [
          { name: 'A', traffic_split: exp.variant_a_weight || 50, content: exp.variant_a_content || '' },
          { name: 'B', traffic_split: exp.variant_b_weight || 50, content: exp.variant_b_content || '' }
        ],
        is_active: exp.is_active,
        created_at: exp.created_at,
        updated_at: exp.updated_at
      }));

      return res.status(200).json(parsedExperiments);
    } catch (error) {
      console.error('Failed to fetch experiments:', error);
      return res.status(500).json({ error: 'Failed to fetch experiments' });
    }
  }

  if (req.method === 'POST') {
    // Create new experiment
    const { name, description, page_path, status, variants } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    try {
      const experimentId = `exp_${Date.now()}`;

      // Calculate weights from variants or use defaults
      const variantA = variants?.[0] || { traffic_split: 50, content: '' };
      const variantB = variants?.[1] || { traffic_split: 50, content: '' };

      const result = db.prepare(`
        INSERT INTO ab_tests (
          experiment_id, name, description, page_path, status, variants,
          variant_a_content, variant_b_content, variant_a_weight, variant_b_weight, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        experimentId,
        name,
        description || '',
        page_path || '',
        status || 'active',
        JSON.stringify(variants || []),
        variantA.content || '',
        variantB.content || '',
        variantA.traffic_split || 50,
        variantB.traffic_split || 50,
        status === 'active' ? 1 : 0
      );

      const newExperiment = db.prepare('SELECT * FROM ab_tests WHERE id = ?').get(result.lastInsertRowid);

      return res.status(201).json({
        id: newExperiment.id,
        experiment_id: newExperiment.experiment_id,
        name: newExperiment.name,
        description: newExperiment.description,
        page_path: newExperiment.page_path,
        status: newExperiment.status,
        variants: newExperiment.variants ? JSON.parse(newExperiment.variants) : [],
        created_at: newExperiment.created_at,
        updated_at: newExperiment.updated_at
      });
    } catch (error) {
      console.error('Failed to create experiment:', error);
      return res.status(500).json({ error: 'Failed to create experiment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
