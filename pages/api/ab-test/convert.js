import db from '../../../lib/database';

// Ensure tables exist
function ensureTables() {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    ensureTables();

    const { experiment_id, session_id, conversion_type, value } = req.body;

    if (!experiment_id || !session_id) {
      return res.status(400).json({ error: 'experiment_id and session_id are required' });
    }

    // Get user's variant assignment
    const assignment = db.prepare(`
      SELECT variant FROM ab_test_assignments
      WHERE experiment_id = ? AND session_id = ?
    `).get(experiment_id, session_id);

    if (!assignment) {
      return res.status(404).json({ error: 'No variant assignment found for this session' });
    }

    // Record conversion (ignore duplicates due to UNIQUE constraint)
    try {
      db.prepare(`
        INSERT INTO ab_test_conversions (experiment_id, session_id, variant, conversion_type, conversion_value)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        experiment_id,
        session_id,
        assignment.variant,
        conversion_type || 'conversion',
        value || 0
      );

      return res.status(200).json({
        success: true,
        variant: assignment.variant,
        conversion_type: conversion_type || 'conversion'
      });
    } catch (error) {
      // If it's a unique constraint error, the conversion was already recorded
      if (error.message?.includes('UNIQUE constraint')) {
        return res.status(200).json({
          success: true,
          message: 'Conversion already recorded',
          variant: assignment.variant
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to track conversion:', error);
    return res.status(500).json({ error: 'Failed to track conversion' });
  }
}
