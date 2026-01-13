import db from '@/lib/database';
import jwt from 'jsonwebtoken';
import config from '@/lib/config';

// Middleware to verify admin access
function requireAdmin(req, res) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return { authenticated: false, error: 'No token provided' };
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return { authenticated: false, error: 'Admin access required' };
    }

    return { authenticated: true, user: decoded };
  } catch (error) {
    return { authenticated: false, error: 'Invalid token' };
  }
}

export default async function handler(req, res) {
  // Verify admin access
  const auth = requireAdmin(req, res);
  if (!auth.authenticated) {
    return res.status(401).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    // Get current support chat settings
    try {
      const settings = db.prepare(`
        SELECT * FROM support_chat_settings 
        WHERE id = 1
      `).get();

      if (!settings) {
        // Return default settings if none exist
        return res.status(200).json({
          id: 1,
          visibility: 'public',
          primary_color: '#3B82F6',
          secondary_color: '#10B981',
          button_text: 'Support Chat',
          position: 'bottom-right',
          is_enabled: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      // Convert is_enabled from integer to boolean for frontend
      settings.is_enabled = Boolean(settings.is_enabled);
      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error fetching support chat settings:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  if (req.method === 'POST') {
    // Update support chat settings
    const { visibility, primary_color, secondary_color, button_text, position, is_enabled } = req.body;

    // Validate required fields
    if (!visibility || !['public', 'subscribers_only'].includes(visibility)) {
      return res.status(400).json({ error: 'Invalid visibility setting' });
    }

    if (!position || !['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(position)) {
      return res.status(400).json({ error: 'Invalid position setting' });
    }

    if (typeof is_enabled !== 'boolean') {
      return res.status(400).json({ error: 'is_enabled must be a boolean' });
    }

    // Validate color formats
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (primary_color && !colorRegex.test(primary_color)) {
      return res.status(400).json({ error: 'Invalid primary color format' });
    }

    if (secondary_color && !colorRegex.test(secondary_color)) {
      return res.status(400).json({ error: 'Invalid secondary color format' });
    }

    try {
      // Check if settings exist, if not create the record
      const existing = db.prepare('SELECT id FROM support_chat_settings WHERE id = 1').get();
      
      if (existing) {
        // Update existing settings
        db.prepare(`
          UPDATE support_chat_settings 
          SET visibility = ?, primary_color = ?, secondary_color = ?, button_text = ?, 
              position = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = 1
        `).run(
          visibility,
          primary_color,
          secondary_color,
          button_text,
          position,
          is_enabled ? 1 : 0
        );
      } else {
        // Create new settings record
        db.prepare(`
          INSERT INTO support_chat_settings 
          (id, visibility, primary_color, secondary_color, button_text, position, is_enabled)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          1,
          visibility,
          primary_color,
          secondary_color,
          button_text,
          position,
          is_enabled ? 1 : 0
        );
      }

      // Return updated settings
      const updatedSettings = db.prepare(`
        SELECT * FROM support_chat_settings 
        WHERE id = 1
      `).get();

      updatedSettings.is_enabled = Boolean(updatedSettings.is_enabled);
      return res.status(200).json(updatedSettings);
    } catch (error) {
      console.error('Error updating support chat settings:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}