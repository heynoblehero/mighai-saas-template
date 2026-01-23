import db from '../../../lib/database';

// Ensure tables exist
function ensureTables() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS session_recording_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      is_enabled INTEGER DEFAULT 0,
      retention_days INTEGER DEFAULT 7,
      mask_passwords INTEGER DEFAULT 1,
      mask_credit_cards INTEGER DEFAULT 1,
      mask_emails INTEGER DEFAULT 0,
      sampling_rate INTEGER DEFAULT 100,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Insert default settings if not exists
  const existing = db.prepare('SELECT id FROM session_recording_settings WHERE id = 1').get();
  if (!existing) {
    db.prepare(`
      INSERT INTO session_recording_settings (id, is_enabled, retention_days, mask_passwords, mask_credit_cards, mask_emails, sampling_rate)
      VALUES (1, 0, 7, 1, 1, 0, 100)
    `).run();
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    ensureTables();

    const settings = db.prepare(`
      SELECT is_enabled, mask_passwords, mask_credit_cards, mask_emails, sampling_rate
      FROM session_recording_settings
      WHERE id = 1
    `).get();

    if (!settings) {
      return res.status(200).json({
        is_enabled: false,
        mask_passwords: true,
        mask_credit_cards: true,
        mask_emails: false,
        sampling_rate: 100
      });
    }

    return res.status(200).json({
      is_enabled: settings.is_enabled === 1,
      mask_passwords: settings.mask_passwords === 1,
      mask_credit_cards: settings.mask_credit_cards === 1,
      mask_emails: settings.mask_emails === 1,
      sampling_rate: settings.sampling_rate || 100
    });
  } catch (error) {
    console.error('Failed to get session recording settings:', error);
    return res.status(500).json({ error: 'Failed to get settings' });
  }
}
