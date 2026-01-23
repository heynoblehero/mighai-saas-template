import db from '../../../../lib/database';
import { withAdminAuth } from '../../../../lib/auth-middleware';

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

async function handler(req, res) {
  try {
    ensureTables();

    if (req.method === 'GET') {
      const settings = db.prepare(`
        SELECT is_enabled, retention_days, mask_passwords, mask_credit_cards, mask_emails, sampling_rate, updated_at
        FROM session_recording_settings
        WHERE id = 1
      `).get();

      if (!settings) {
        return res.status(200).json({
          is_enabled: false,
          retention_days: 7,
          mask_passwords: true,
          mask_credit_cards: true,
          mask_emails: false,
          sampling_rate: 100
        });
      }

      return res.status(200).json({
        is_enabled: settings.is_enabled === 1,
        retention_days: settings.retention_days || 7,
        mask_passwords: settings.mask_passwords === 1,
        mask_credit_cards: settings.mask_credit_cards === 1,
        mask_emails: settings.mask_emails === 1,
        sampling_rate: settings.sampling_rate || 100,
        updated_at: settings.updated_at
      });
    }

    if (req.method === 'PUT') {
      const {
        is_enabled,
        retention_days,
        mask_passwords,
        mask_credit_cards,
        mask_emails,
        sampling_rate
      } = req.body;

      db.prepare(`
        UPDATE session_recording_settings
        SET is_enabled = ?,
            retention_days = ?,
            mask_passwords = ?,
            mask_credit_cards = ?,
            mask_emails = ?,
            sampling_rate = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run(
        is_enabled ? 1 : 0,
        retention_days || 7,
        mask_passwords !== false ? 1 : 0,
        mask_credit_cards !== false ? 1 : 0,
        mask_emails ? 1 : 0,
        Math.min(100, Math.max(0, sampling_rate || 100))
      );

      const updated = db.prepare('SELECT * FROM session_recording_settings WHERE id = 1').get();

      return res.status(200).json({
        success: true,
        settings: {
          is_enabled: updated.is_enabled === 1,
          retention_days: updated.retention_days,
          mask_passwords: updated.mask_passwords === 1,
          mask_credit_cards: updated.mask_credit_cards === 1,
          mask_emails: updated.mask_emails === 1,
          sampling_rate: updated.sampling_rate
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Session recording settings error:', error);
    return res.status(500).json({ error: 'Failed to process settings' });
  }
}

export default withAdminAuth(handler);
