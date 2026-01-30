import db from '@/lib/database';
import jwt from 'jsonwebtoken';
import config from '@/lib/config';

// Middleware to verify admin access
function requireAdmin(req) {
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

// Default settings for new installations
const defaultSettings = {
  id: 1,
  visibility: 'public',
  primary_color: '#3B82F6',
  secondary_color: '#10B981',
  button_text: 'Support Chat',
  position: 'bottom-right',
  is_enabled: true,
  widget_icon: 'chat',
  greeting_message: '',
  background_color: '#FFFFFF',
  header_text_color: '#FFFFFF',
  customer_text_color: '#FFFFFF',
  admin_text_color: '#1F2937',
  border_radius: '12',
  font_family: 'system-ui',
  // Animation
  animation_type: 'slide_fade',
  animation_duration: 300,
  // Auto-popup
  auto_popup_enabled: false,
  auto_popup_trigger: 'time',
  auto_popup_delay: 5,
  auto_popup_scroll_percent: 50,
  auto_popup_once_per_session: true,
  // Team status
  show_team_status: true,
  business_hours_enabled: false,
  business_hours_start: '09:00',
  business_hours_end: '17:00',
  business_hours_timezone: 'UTC',
  business_hours_days: [1, 2, 3, 4, 5],
  online_text: 'Online now',
  away_text: 'Away',
  response_time_text: 'Typically replies within a few hours',
  // Sounds
  sounds_enabled: false,
  sound_new_message: true,
  sound_message_sent: true,
  sound_popup_open: false,
  sound_volume: 50,
  // Message status
  show_message_status: true,
  show_read_receipts: true,
  // Team logo
  team_logo_enabled: false,
  team_logo_url: null,
  // FAQ
  faq_enabled: false,
  faq_title: 'Frequently Asked Questions',
  faq_items: [],
  docs_links: [],
  show_search_in_chat: true
};

// Convert database row to API response format
function formatSettings(row) {
  if (!row) return defaultSettings;

  return {
    ...row,
    // Convert integers to booleans
    is_enabled: Boolean(row.is_enabled),
    auto_popup_enabled: Boolean(row.auto_popup_enabled),
    auto_popup_once_per_session: Boolean(row.auto_popup_once_per_session),
    show_team_status: Boolean(row.show_team_status),
    business_hours_enabled: Boolean(row.business_hours_enabled),
    sounds_enabled: Boolean(row.sounds_enabled),
    sound_new_message: Boolean(row.sound_new_message),
    sound_message_sent: Boolean(row.sound_message_sent),
    sound_popup_open: Boolean(row.sound_popup_open),
    show_message_status: Boolean(row.show_message_status),
    show_read_receipts: Boolean(row.show_read_receipts),
    team_logo_enabled: Boolean(row.team_logo_enabled),
    faq_enabled: Boolean(row.faq_enabled),
    show_search_in_chat: Boolean(row.show_search_in_chat),
    // Parse JSON fields
    business_hours_days: row.business_hours_days ? JSON.parse(row.business_hours_days) : [1, 2, 3, 4, 5],
    faq_items: row.faq_items ? JSON.parse(row.faq_items) : [],
    docs_links: row.docs_links ? JSON.parse(row.docs_links) : [],
    // Ensure defaults for optional fields
    background_color: row.background_color || '#FFFFFF',
    header_text_color: row.header_text_color || '#FFFFFF',
    customer_text_color: row.customer_text_color || '#FFFFFF',
    admin_text_color: row.admin_text_color || '#1F2937',
    border_radius: row.border_radius || '12',
    font_family: row.font_family || 'system-ui',
    animation_type: row.animation_type || 'slide_fade',
    animation_duration: row.animation_duration || 300,
    online_text: row.online_text || 'Online now',
    away_text: row.away_text || 'Away',
    response_time_text: row.response_time_text || 'Typically replies within a few hours',
    faq_title: row.faq_title || 'Frequently Asked Questions'
  };
}

export default async function handler(req, res) {
  // Verify admin access
  const auth = requireAdmin(req);
  if (!auth.authenticated) {
    return res.status(401).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      const settings = db.prepare('SELECT * FROM support_chat_settings WHERE id = 1').get();
      return res.status(200).json(formatSettings(settings));
    } catch (error) {
      console.error('Error fetching support chat settings:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  // Handle both POST and PUT for updates
  if (req.method === 'POST' || req.method === 'PUT') {
    const {
      // Existing fields
      visibility, primary_color, secondary_color, button_text, position, is_enabled,
      widget_icon, greeting_message, background_color, header_text_color,
      customer_text_color, admin_text_color, border_radius, font_family,
      // Animation
      animation_type, animation_duration,
      // Auto-popup
      auto_popup_enabled, auto_popup_trigger, auto_popup_delay,
      auto_popup_scroll_percent, auto_popup_once_per_session,
      // Team status
      show_team_status, business_hours_enabled, business_hours_start,
      business_hours_end, business_hours_timezone, business_hours_days,
      online_text, away_text, response_time_text,
      // Sounds
      sounds_enabled, sound_new_message, sound_message_sent, sound_popup_open, sound_volume,
      // Message status
      show_message_status, show_read_receipts,
      // Team logo
      team_logo_enabled, team_logo_url,
      // FAQ
      faq_enabled, faq_title, faq_items, docs_links, show_search_in_chat
    } = req.body;

    // Validate required fields
    if (visibility && !['public', 'subscribers_only'].includes(visibility)) {
      return res.status(400).json({ error: 'Invalid visibility setting' });
    }

    if (position && !['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(position)) {
      return res.status(400).json({ error: 'Invalid position setting' });
    }

    // Validate animation type
    if (animation_type && !['slide_fade', 'scale_bounce', 'fade', 'none'].includes(animation_type)) {
      return res.status(400).json({ error: 'Invalid animation type' });
    }

    // Validate auto-popup trigger
    if (auto_popup_trigger && !['time', 'scroll', 'exit_intent'].includes(auto_popup_trigger)) {
      return res.status(400).json({ error: 'Invalid auto-popup trigger' });
    }

    // Validate color formats
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const colorFields = { primary_color, secondary_color, background_color, header_text_color, customer_text_color, admin_text_color };

    for (const [field, value] of Object.entries(colorFields)) {
      if (value && !colorRegex.test(value)) {
        return res.status(400).json({ error: `Invalid ${field.replace(/_/g, ' ')} format` });
      }
    }

    try {
      const existing = db.prepare('SELECT id FROM support_chat_settings WHERE id = 1').get();

      const updateFields = {
        visibility: visibility || 'public',
        primary_color: primary_color || '#3B82F6',
        secondary_color: secondary_color || '#10B981',
        button_text: button_text || 'Support Chat',
        position: position || 'bottom-right',
        is_enabled: is_enabled ? 1 : 0,
        widget_icon: widget_icon || 'chat',
        greeting_message: greeting_message || null,
        background_color: background_color || '#FFFFFF',
        header_text_color: header_text_color || '#FFFFFF',
        customer_text_color: customer_text_color || '#FFFFFF',
        admin_text_color: admin_text_color || '#1F2937',
        border_radius: border_radius || '12',
        font_family: font_family || 'system-ui',
        // Animation
        animation_type: animation_type || 'slide_fade',
        animation_duration: animation_duration || 300,
        // Auto-popup
        auto_popup_enabled: auto_popup_enabled ? 1 : 0,
        auto_popup_trigger: auto_popup_trigger || 'time',
        auto_popup_delay: auto_popup_delay || 5,
        auto_popup_scroll_percent: auto_popup_scroll_percent || 50,
        auto_popup_once_per_session: auto_popup_once_per_session ? 1 : 0,
        // Team status
        show_team_status: show_team_status ? 1 : 0,
        business_hours_enabled: business_hours_enabled ? 1 : 0,
        business_hours_start: business_hours_start || '09:00',
        business_hours_end: business_hours_end || '17:00',
        business_hours_timezone: business_hours_timezone || 'UTC',
        business_hours_days: JSON.stringify(business_hours_days || [1, 2, 3, 4, 5]),
        online_text: online_text || 'Online now',
        away_text: away_text || 'Away',
        response_time_text: response_time_text || 'Typically replies within a few hours',
        // Sounds
        sounds_enabled: sounds_enabled ? 1 : 0,
        sound_new_message: sound_new_message !== false ? 1 : 0,
        sound_message_sent: sound_message_sent !== false ? 1 : 0,
        sound_popup_open: sound_popup_open ? 1 : 0,
        sound_volume: sound_volume || 50,
        // Message status
        show_message_status: show_message_status !== false ? 1 : 0,
        show_read_receipts: show_read_receipts !== false ? 1 : 0,
        // Team logo
        team_logo_enabled: team_logo_enabled ? 1 : 0,
        team_logo_url: team_logo_url || null,
        // FAQ
        faq_enabled: faq_enabled ? 1 : 0,
        faq_title: faq_title || 'Frequently Asked Questions',
        faq_items: JSON.stringify(faq_items || []),
        docs_links: JSON.stringify(docs_links || []),
        show_search_in_chat: show_search_in_chat !== false ? 1 : 0
      };

      if (existing) {
        db.prepare(`
          UPDATE support_chat_settings SET
            visibility = ?, primary_color = ?, secondary_color = ?, button_text = ?,
            position = ?, is_enabled = ?, widget_icon = ?, greeting_message = ?,
            background_color = ?, header_text_color = ?, customer_text_color = ?,
            admin_text_color = ?, border_radius = ?, font_family = ?,
            animation_type = ?, animation_duration = ?,
            auto_popup_enabled = ?, auto_popup_trigger = ?, auto_popup_delay = ?,
            auto_popup_scroll_percent = ?, auto_popup_once_per_session = ?,
            show_team_status = ?, business_hours_enabled = ?, business_hours_start = ?,
            business_hours_end = ?, business_hours_timezone = ?, business_hours_days = ?,
            online_text = ?, away_text = ?, response_time_text = ?,
            sounds_enabled = ?, sound_new_message = ?, sound_message_sent = ?,
            sound_popup_open = ?, sound_volume = ?,
            show_message_status = ?, show_read_receipts = ?,
            team_logo_enabled = ?, team_logo_url = ?,
            faq_enabled = ?, faq_title = ?, faq_items = ?, docs_links = ?, show_search_in_chat = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = 1
        `).run(
          updateFields.visibility, updateFields.primary_color, updateFields.secondary_color,
          updateFields.button_text, updateFields.position, updateFields.is_enabled,
          updateFields.widget_icon, updateFields.greeting_message, updateFields.background_color,
          updateFields.header_text_color, updateFields.customer_text_color, updateFields.admin_text_color,
          updateFields.border_radius, updateFields.font_family,
          updateFields.animation_type, updateFields.animation_duration,
          updateFields.auto_popup_enabled, updateFields.auto_popup_trigger, updateFields.auto_popup_delay,
          updateFields.auto_popup_scroll_percent, updateFields.auto_popup_once_per_session,
          updateFields.show_team_status, updateFields.business_hours_enabled, updateFields.business_hours_start,
          updateFields.business_hours_end, updateFields.business_hours_timezone, updateFields.business_hours_days,
          updateFields.online_text, updateFields.away_text, updateFields.response_time_text,
          updateFields.sounds_enabled, updateFields.sound_new_message, updateFields.sound_message_sent,
          updateFields.sound_popup_open, updateFields.sound_volume,
          updateFields.show_message_status, updateFields.show_read_receipts,
          updateFields.team_logo_enabled, updateFields.team_logo_url,
          updateFields.faq_enabled, updateFields.faq_title, updateFields.faq_items,
          updateFields.docs_links, updateFields.show_search_in_chat
        );
      } else {
        // Insert new record with all fields
        const columns = Object.keys(updateFields).join(', ');
        const placeholders = Object.keys(updateFields).map(() => '?').join(', ');
        db.prepare(`INSERT INTO support_chat_settings (id, ${columns}) VALUES (1, ${placeholders})`).run(
          ...Object.values(updateFields)
        );
      }

      const updatedSettings = db.prepare('SELECT * FROM support_chat_settings WHERE id = 1').get();
      return res.status(200).json(formatSettings(updatedSettings));
    } catch (error) {
      console.error('Error updating support chat settings:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
