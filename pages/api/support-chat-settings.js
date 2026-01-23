import db from '../../lib/database';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get current support chat settings (public endpoint)
    try {
      // Ensure table exists
      db.prepare(`
        CREATE TABLE IF NOT EXISTS support_chat_settings (
          id INTEGER PRIMARY KEY,
          visibility TEXT DEFAULT 'public',
          primary_color TEXT DEFAULT '#3B82F6',
          secondary_color TEXT DEFAULT '#10B981',
          button_text TEXT DEFAULT 'Support Chat',
          position TEXT DEFAULT 'bottom-right',
          is_enabled INTEGER DEFAULT 1,
          widget_icon TEXT DEFAULT 'chat',
          greeting_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

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

  return res.status(405).json({ error: 'Method not allowed' });
}