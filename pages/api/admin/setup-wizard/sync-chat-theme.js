// pages/api/admin/setup-wizard/sync-chat-theme.js
// Syncs wizard branding colors to support chat settings
// Called when wizard completes to ensure chat widget matches SaaS theme

import { requireAdminAuth } from '../../../../lib/auth-middleware';
import { getWizardState } from '../../../../lib/setup-wizard-db';
import db from '../../../../lib/database';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireAdminAuth(req, res);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = authResult.user?.id || 1;

  try {
    // Get wizard state with branding colors
    const wizardState = getWizardState(userId);

    if (!wizardState) {
      return res.status(404).json({ error: 'Wizard state not found' });
    }

    const {
      primary_color = '#10B981',
      secondary_color = '#059669'
    } = wizardState;

    // Check if support_chat_settings record exists
    const existing = db.prepare('SELECT id FROM support_chat_settings WHERE id = 1').get();

    if (existing) {
      // Update existing settings with wizard colors
      db.prepare(`
        UPDATE support_chat_settings
        SET primary_color = ?,
            secondary_color = ?,
            header_text_color = '#FFFFFF',
            customer_text_color = '#FFFFFF',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run(primary_color, secondary_color);
    } else {
      // Create new settings with wizard colors
      db.prepare(`
        INSERT INTO support_chat_settings (
          id, visibility, primary_color, secondary_color, button_text,
          position, is_enabled, background_color, header_text_color,
          customer_text_color, admin_text_color, border_radius, font_family
        ) VALUES (1, 'public', ?, ?, 'Support Chat', 'bottom-right', 1,
                  '#FFFFFF', '#FFFFFF', '#FFFFFF', '#1F2937', '12', 'system-ui')
      `).run(primary_color, secondary_color);
    }

    return res.status(200).json({
      success: true,
      message: 'Chat widget theme synced with branding',
      colors: {
        primary: primary_color,
        secondary: secondary_color
      }
    });
  } catch (error) {
    console.error('Error syncing chat theme:', error);
    return res.status(500).json({ error: 'Failed to sync chat theme' });
  }
}

export default handler;
