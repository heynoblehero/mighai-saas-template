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
          widget_icon: 'chat',
          greeting_message: '',
          background_color: '#FFFFFF',
          header_text_color: '#FFFFFF',
          customer_text_color: '#FFFFFF',
          admin_text_color: '#1F2937',
          border_radius: '12',
          font_family: 'system-ui',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      // Convert is_enabled from integer to boolean for frontend
      settings.is_enabled = Boolean(settings.is_enabled);

      // Ensure new theme fields have defaults if not set
      settings.background_color = settings.background_color || '#FFFFFF';
      settings.header_text_color = settings.header_text_color || '#FFFFFF';
      settings.customer_text_color = settings.customer_text_color || '#FFFFFF';
      settings.admin_text_color = settings.admin_text_color || '#1F2937';
      settings.border_radius = settings.border_radius || '12';
      settings.font_family = settings.font_family || 'system-ui';

      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error fetching support chat settings:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  if (req.method === 'POST') {
    // Update support chat settings
    const {
      visibility, primary_color, secondary_color, button_text, position, is_enabled,
      widget_icon, greeting_message,
      // New theme fields
      background_color, header_text_color, customer_text_color, admin_text_color,
      border_radius, font_family
    } = req.body;

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
    const colorFields = { primary_color, secondary_color, background_color, header_text_color, customer_text_color, admin_text_color };

    for (const [field, value] of Object.entries(colorFields)) {
      if (value && !colorRegex.test(value)) {
        return res.status(400).json({ error: `Invalid ${field.replace(/_/g, ' ')} format` });
      }
    }

    // Validate border_radius (numeric string between 0-24)
    if (border_radius) {
      const radius = parseInt(border_radius);
      if (isNaN(radius) || radius < 0 || radius > 24) {
        return res.status(400).json({ error: 'Border radius must be between 0 and 24' });
      }
    }

    // Validate font_family
    const allowedFonts = ['system-ui', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat'];
    if (font_family && !allowedFonts.includes(font_family)) {
      return res.status(400).json({ error: 'Invalid font family' });
    }

    // Validate widget_icon (preset names or custom SVG starting with <svg)
    const presetIcons = ['chat', 'help', 'message', 'support'];
    if (widget_icon && !presetIcons.includes(widget_icon) && !widget_icon.startsWith('<svg')) {
      return res.status(400).json({ error: 'Invalid widget icon. Use preset name or custom SVG.' });
    }

    try {
      // Check if settings exist, if not create the record
      const existing = db.prepare('SELECT id FROM support_chat_settings WHERE id = 1').get();

      if (existing) {
        // Update existing settings
        db.prepare(`
          UPDATE support_chat_settings
          SET visibility = ?, primary_color = ?, secondary_color = ?, button_text = ?,
              position = ?, is_enabled = ?, widget_icon = ?, greeting_message = ?,
              background_color = ?, header_text_color = ?, customer_text_color = ?,
              admin_text_color = ?, border_radius = ?, font_family = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = 1
        `).run(
          visibility,
          primary_color,
          secondary_color,
          button_text,
          position,
          is_enabled ? 1 : 0,
          widget_icon || 'chat',
          greeting_message || null,
          background_color || '#FFFFFF',
          header_text_color || '#FFFFFF',
          customer_text_color || '#FFFFFF',
          admin_text_color || '#1F2937',
          border_radius || '12',
          font_family || 'system-ui'
        );
      } else {
        // Create new settings record
        db.prepare(`
          INSERT INTO support_chat_settings
          (id, visibility, primary_color, secondary_color, button_text, position, is_enabled,
           widget_icon, greeting_message, background_color, header_text_color,
           customer_text_color, admin_text_color, border_radius, font_family)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          1,
          visibility,
          primary_color,
          secondary_color,
          button_text,
          position,
          is_enabled ? 1 : 0,
          widget_icon || 'chat',
          greeting_message || null,
          background_color || '#FFFFFF',
          header_text_color || '#FFFFFF',
          customer_text_color || '#FFFFFF',
          admin_text_color || '#1F2937',
          border_radius || '12',
          font_family || 'system-ui'
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