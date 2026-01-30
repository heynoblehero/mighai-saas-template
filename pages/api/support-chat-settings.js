import db from '../../lib/database';

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
  show_search_in_chat: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Format settings from database row
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
  if (req.method === 'GET') {
    // Get current support chat settings (public endpoint)
    try {
      const settings = db.prepare('SELECT * FROM support_chat_settings WHERE id = 1').get();
      return res.status(200).json(formatSettings(settings));
    } catch (error) {
      console.error('Error fetching support chat settings:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
