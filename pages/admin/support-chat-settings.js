import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import SupportWidget from '../../components/SupportWidget';

export default function SupportChatSettings() {
  const [settings, setSettings] = useState({
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
    team_logo_url: '',
    // FAQ
    faq_enabled: false,
    faq_title: 'Frequently Asked Questions',
    faq_items: [],
    docs_links: [],
    show_search_in_chat: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('appearance');

  // FAQ editing state
  const [editingFaq, setEditingFaq] = useState(null);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });

  // Docs editing state
  const [editingDoc, setEditingDoc] = useState(null);
  const [newDoc, setNewDoc] = useState({ title: '', url: '' });

  const fontOptions = [
    { value: 'system-ui', label: 'System Default' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Montserrat', label: 'Montserrat' }
  ];

  const presetIcons = [
    { value: 'chat', label: 'Chat', path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { value: 'help', label: 'Help', path: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { value: 'message', label: 'Message', path: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { value: 'support', label: 'Support', path: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' }
  ];

  const animationOptions = [
    { value: 'slide_fade', label: 'Slide & Fade' },
    { value: 'scale_bounce', label: 'Scale & Bounce' },
    { value: 'fade', label: 'Fade Only' },
    { value: 'none', label: 'No Animation' }
  ];

  const triggerOptions = [
    { value: 'time', label: 'Time Delay', desc: 'Open after X seconds' },
    { value: 'scroll', label: 'Scroll Position', desc: 'Open after scrolling X%' },
    { value: 'exit_intent', label: 'Exit Intent', desc: 'Open when mouse leaves window' }
  ];

  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
    'Asia/Kolkata', 'Australia/Sydney'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/support-chat-settings', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/support-chat-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day) => {
    const days = settings.business_hours_days || [];
    if (days.includes(day)) {
      handleChange('business_hours_days', days.filter(d => d !== day));
    } else {
      handleChange('business_hours_days', [...days, day].sort());
    }
  };

  // FAQ CRUD
  const addFaq = () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    const faqItems = [...(settings.faq_items || []), { ...newFaq, id: Date.now() }];
    handleChange('faq_items', faqItems);
    setNewFaq({ question: '', answer: '' });
  };

  const updateFaq = (id, updates) => {
    const faqItems = (settings.faq_items || []).map(f => f.id === id ? { ...f, ...updates } : f);
    handleChange('faq_items', faqItems);
    setEditingFaq(null);
  };

  const deleteFaq = (id) => {
    const faqItems = (settings.faq_items || []).filter(f => f.id !== id);
    handleChange('faq_items', faqItems);
  };

  // Docs CRUD
  const addDoc = () => {
    if (!newDoc.title.trim() || !newDoc.url.trim()) return;
    const docsLinks = [...(settings.docs_links || []), { ...newDoc, id: Date.now() }];
    handleChange('docs_links', docsLinks);
    setNewDoc({ title: '', url: '' });
  };

  const updateDoc = (id, updates) => {
    const docsLinks = (settings.docs_links || []).map(d => d.id === id ? { ...d, ...updates } : d);
    handleChange('docs_links', docsLinks);
    setEditingDoc(null);
  };

  const deleteDoc = (id) => {
    const docsLinks = (settings.docs_links || []).filter(d => d.id !== id);
    handleChange('docs_links', docsLinks);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'behavior', label: 'Behavior', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'team', label: 'Team Status', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
    { id: 'faq', label: 'FAQ & Docs', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h1 className="text-3xl font-bold text-slate-100">Support Chat Settings</h1>
          <p className="text-slate-400 mt-2">Configure the support chat widget appearance, behavior, and features</p>
        </div>

        {/* Tabs */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex border-b border-slate-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-8">
                {/* Status Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <label className="text-slate-200 font-medium">Enable Support Chat</label>
                    <p className="text-slate-400 text-sm">Toggle the support chat widget on/off</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.is_enabled}
                      onChange={(e) => handleChange('is_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Visibility */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Visibility</h3>
                  <div className="flex gap-4">
                    {['public', 'subscribers_only'].map(v => (
                      <label key={v} className={`flex-1 p-4 rounded-lg border cursor-pointer ${
                        settings.visibility === v ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600'
                      }`}>
                        <input
                          type="radio"
                          checked={settings.visibility === v}
                          onChange={() => handleChange('visibility', v)}
                          className="sr-only"
                        />
                        <span className="text-slate-200 font-medium">{v === 'public' ? 'Public' : 'Subscribers Only'}</span>
                        <p className="text-slate-400 text-sm mt-1">{v === 'public' ? 'Visible to all visitors' : 'Only logged-in users'}</p>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Theme Colors */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Theme Colors</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { key: 'primary_color', label: 'Primary' },
                      { key: 'secondary_color', label: 'Secondary' },
                      { key: 'background_color', label: 'Background' },
                      { key: 'header_text_color', label: 'Header Text' },
                      { key: 'customer_text_color', label: 'Customer Text' },
                      { key: 'admin_text_color', label: 'Admin Text' }
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-slate-300 text-sm mb-2">{label}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={settings[key]}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className="w-10 h-10 rounded border border-slate-600 bg-slate-700 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={settings[key]}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Position & Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Position</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {['bottom-right', 'bottom-left', 'top-right', 'top-left'].map(pos => (
                        <label key={pos} className={`p-3 rounded-lg border cursor-pointer text-center ${
                          settings.position === pos ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600'
                        }`}>
                          <input
                            type="radio"
                            checked={settings.position === pos}
                            onChange={() => handleChange('position', pos)}
                            className="sr-only"
                          />
                          <span className="text-slate-300 text-sm">{pos.replace('-', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Style</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-slate-300 text-sm mb-2">Border Radius: {settings.border_radius}px</label>
                        <input
                          type="range"
                          min="0"
                          max="24"
                          value={settings.border_radius}
                          onChange={(e) => handleChange('border_radius', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm mb-2">Font</label>
                        <select
                          value={settings.font_family}
                          onChange={(e) => handleChange('font_family', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                        >
                          {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Widget Icon */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Widget Icon</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {presetIcons.map(icon => (
                      <label key={icon.value} className={`flex flex-col items-center p-4 rounded-lg border cursor-pointer ${
                        settings.widget_icon === icon.value ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600'
                      }`}>
                        <input
                          type="radio"
                          checked={settings.widget_icon === icon.value}
                          onChange={() => handleChange('widget_icon', icon.value)}
                          className="sr-only"
                        />
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.primary_color }}>
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
                          </svg>
                        </div>
                        <span className="text-slate-300 text-sm mt-2">{icon.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Team Logo */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Team Logo</h3>
                  <div className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.team_logo_enabled}
                        onChange={(e) => handleChange('team_logo_enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-blue-600"
                      />
                      <span className="text-slate-300">Enable team logo in header</span>
                    </label>
                    {settings.team_logo_enabled && (
                      <input
                        type="text"
                        value={settings.team_logo_url || ''}
                        onChange={(e) => handleChange('team_logo_url', e.target.value)}
                        placeholder="Logo URL (e.g., /logo.png)"
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                      />
                    )}
                  </div>
                </div>

                {/* Button Text & Greeting */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-300 mb-2">Header Title</label>
                    <input
                      type="text"
                      value={settings.button_text}
                      onChange={(e) => handleChange('button_text', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-2">Greeting Message</label>
                    <input
                      type="text"
                      value={settings.greeting_message || ''}
                      onChange={(e) => handleChange('greeting_message', e.target.value)}
                      placeholder="Hi! How can we help?"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BEHAVIOR TAB */}
            {activeTab === 'behavior' && (
              <div className="space-y-8">
                {/* Animation */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Animation</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {animationOptions.map(opt => (
                      <label key={opt.value} className={`p-4 rounded-lg border cursor-pointer text-center ${
                        settings.animation_type === opt.value ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600'
                      }`}>
                        <input
                          type="radio"
                          checked={settings.animation_type === opt.value}
                          onChange={() => handleChange('animation_type', opt.value)}
                          className="sr-only"
                        />
                        <span className="text-slate-200">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className="block text-slate-300 text-sm mb-2">Duration: {settings.animation_duration}ms</label>
                    <input
                      type="range"
                      min="100"
                      max="800"
                      step="50"
                      value={settings.animation_duration}
                      onChange={(e) => handleChange('animation_duration', parseInt(e.target.value))}
                      className="w-full max-w-xs"
                    />
                  </div>
                </div>

                {/* Auto-Popup */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-200">Auto-Popup</h3>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.auto_popup_enabled}
                        onChange={(e) => handleChange('auto_popup_enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-blue-600"
                      />
                      <span className="text-slate-300">Enable</span>
                    </label>
                  </div>
                  {settings.auto_popup_enabled && (
                    <div className="space-y-4 p-4 bg-slate-700/30 rounded-lg">
                      <div className="grid grid-cols-3 gap-4">
                        {triggerOptions.map(opt => (
                          <label key={opt.value} className={`p-4 rounded-lg border cursor-pointer ${
                            settings.auto_popup_trigger === opt.value ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600'
                          }`}>
                            <input
                              type="radio"
                              checked={settings.auto_popup_trigger === opt.value}
                              onChange={() => handleChange('auto_popup_trigger', opt.value)}
                              className="sr-only"
                            />
                            <span className="text-slate-200 font-medium">{opt.label}</span>
                            <p className="text-slate-400 text-sm mt-1">{opt.desc}</p>
                          </label>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {settings.auto_popup_trigger === 'time' && (
                          <div>
                            <label className="block text-slate-300 text-sm mb-2">Delay (seconds)</label>
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={settings.auto_popup_delay}
                              onChange={(e) => handleChange('auto_popup_delay', parseInt(e.target.value))}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                            />
                          </div>
                        )}
                        {settings.auto_popup_trigger === 'scroll' && (
                          <div>
                            <label className="block text-slate-300 text-sm mb-2">Scroll Percentage</label>
                            <input
                              type="number"
                              min="10"
                              max="100"
                              value={settings.auto_popup_scroll_percent}
                              onChange={(e) => handleChange('auto_popup_scroll_percent', parseInt(e.target.value))}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                            />
                          </div>
                        )}
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.auto_popup_once_per_session}
                            onChange={(e) => handleChange('auto_popup_once_per_session', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 text-blue-600"
                          />
                          <span className="text-slate-300">Only once per session</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sounds */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-200">Sound Effects</h3>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.sounds_enabled}
                        onChange={(e) => handleChange('sounds_enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-blue-600"
                      />
                      <span className="text-slate-300">Enable</span>
                    </label>
                  </div>
                  {settings.sounds_enabled && (
                    <div className="space-y-4 p-4 bg-slate-700/30 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { key: 'sound_new_message', label: 'New Message' },
                          { key: 'sound_message_sent', label: 'Message Sent' },
                          { key: 'sound_popup_open', label: 'Popup Open' }
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings[key]}
                              onChange={(e) => handleChange(key, e.target.checked)}
                              className="w-4 h-4 rounded border-slate-600 text-blue-600"
                            />
                            <span className="text-slate-300">{label}</span>
                          </label>
                        ))}
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm mb-2">Volume: {settings.sound_volume}%</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.sound_volume}
                          onChange={(e) => handleChange('sound_volume', parseInt(e.target.value))}
                          className="w-full max-w-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Status */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Message Status</h3>
                  <div className="space-y-3 p-4 bg-slate-700/30 rounded-lg">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.show_message_status}
                        onChange={(e) => handleChange('show_message_status', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-blue-600"
                      />
                      <span className="text-slate-300">Show sent/delivered status (checkmarks)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.show_read_receipts}
                        onChange={(e) => handleChange('show_read_receipts', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-blue-600"
                      />
                      <span className="text-slate-300">Show read receipts (double checkmarks)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TEAM STATUS TAB */}
            {activeTab === 'team' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <label className="text-slate-200 font-medium">Show Team Status</label>
                    <p className="text-slate-400 text-sm">Display online/away status in widget</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.show_team_status}
                      onChange={(e) => handleChange('show_team_status', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.show_team_status && (
                  <>
                    {/* Business Hours */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-200">Business Hours</h3>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.business_hours_enabled}
                            onChange={(e) => handleChange('business_hours_enabled', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 text-blue-600"
                          />
                          <span className="text-slate-300">Enable scheduled hours</span>
                        </label>
                      </div>
                      {settings.business_hours_enabled && (
                        <div className="space-y-4 p-4 bg-slate-700/30 rounded-lg">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-slate-300 text-sm mb-2">Start Time</label>
                              <input
                                type="time"
                                value={settings.business_hours_start}
                                onChange={(e) => handleChange('business_hours_start', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 text-sm mb-2">End Time</label>
                              <input
                                type="time"
                                value={settings.business_hours_end}
                                onChange={(e) => handleChange('business_hours_end', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 text-sm mb-2">Timezone</label>
                              <select
                                value={settings.business_hours_timezone}
                                onChange={(e) => handleChange('business_hours_timezone', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                              >
                                {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-slate-300 text-sm mb-2">Days</label>
                            <div className="flex gap-2">
                              {dayNames.map((name, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => toggleDay(i)}
                                  className={`w-10 h-10 rounded-lg text-sm font-medium ${
                                    (settings.business_hours_days || []).includes(i)
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-700 text-slate-400'
                                  }`}
                                >
                                  {name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Text */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Status Messages</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-slate-300 text-sm mb-2">Online Text</label>
                          <input
                            type="text"
                            value={settings.online_text}
                            onChange={(e) => handleChange('online_text', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 text-sm mb-2">Away Text</label>
                          <input
                            type="text"
                            value={settings.away_text}
                            onChange={(e) => handleChange('away_text', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 text-sm mb-2">Response Time</label>
                          <input
                            type="text"
                            value={settings.response_time_text}
                            onChange={(e) => handleChange('response_time_text', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* FAQ & DOCS TAB */}
            {activeTab === 'faq' && (
              <div className="space-y-8">
                {/* FAQ Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-200">FAQ Section</h3>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.faq_enabled}
                        onChange={(e) => handleChange('faq_enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-blue-600"
                      />
                      <span className="text-slate-300">Enable FAQ</span>
                    </label>
                  </div>
                  {settings.faq_enabled && (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={settings.faq_title}
                        onChange={(e) => handleChange('faq_title', e.target.value)}
                        placeholder="FAQ Section Title"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                      />
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.show_search_in_chat}
                          onChange={(e) => handleChange('show_search_in_chat', e.target.checked)}
                          className="w-4 h-4 rounded border-slate-600 text-blue-600"
                        />
                        <span className="text-slate-300">Enable search in chat</span>
                      </label>

                      {/* FAQ Items */}
                      <div className="space-y-2">
                        {(settings.faq_items || []).map(faq => (
                          <div key={faq.id} className="p-4 bg-slate-700/30 rounded-lg">
                            {editingFaq === faq.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  defaultValue={faq.question}
                                  onBlur={(e) => updateFaq(faq.id, { question: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                                />
                                <textarea
                                  defaultValue={faq.answer}
                                  onBlur={(e) => updateFaq(faq.id, { answer: e.target.value })}
                                  rows={3}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditingFaq(null)}
                                  className="text-sm text-blue-400"
                                >
                                  Done
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-slate-200 font-medium">{faq.question}</p>
                                  <p className="text-slate-400 text-sm mt-1">{faq.answer}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => setEditingFaq(faq.id)} className="text-slate-400 hover:text-blue-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button type="button" onClick={() => deleteFaq(faq.id)} className="text-slate-400 hover:text-red-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add FAQ */}
                      <div className="p-4 bg-slate-700/30 rounded-lg space-y-2">
                        <input
                          type="text"
                          value={newFaq.question}
                          onChange={(e) => setNewFaq(prev => ({ ...prev, question: e.target.value }))}
                          placeholder="Question"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                        />
                        <textarea
                          value={newFaq.answer}
                          onChange={(e) => setNewFaq(prev => ({ ...prev, answer: e.target.value }))}
                          placeholder="Answer"
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                        />
                        <button
                          type="button"
                          onClick={addFaq}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Add FAQ
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Docs Links */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Documentation Links</h3>
                  <div className="space-y-2">
                    {(settings.docs_links || []).map(doc => (
                      <div key={doc.id} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                        {editingDoc === doc.id ? (
                          <>
                            <input
                              type="text"
                              defaultValue={doc.title}
                              onBlur={(e) => updateDoc(doc.id, { title: e.target.value })}
                              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                            />
                            <input
                              type="text"
                              defaultValue={doc.url}
                              onBlur={(e) => updateDoc(doc.id, { url: e.target.value })}
                              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                            />
                            <button type="button" onClick={() => setEditingDoc(null)} className="text-blue-400">Done</button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-slate-200">{doc.title}</span>
                            <span className="flex-1 text-slate-400 text-sm">{doc.url}</span>
                            <button type="button" onClick={() => setEditingDoc(doc.id)} className="text-slate-400 hover:text-blue-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button type="button" onClick={() => deleteDoc(doc.id)} className="text-slate-400 hover:text-red-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Add Doc Link */}
                    <div className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                      <input
                        type="text"
                        value={newDoc.title}
                        onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Link Title"
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                      />
                      <input
                        type="text"
                        value={newDoc.url}
                        onChange={(e) => setNewDoc(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="URL (e.g., /docs/getting-started)"
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={addDoc}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button & Message */}
            <div className="mt-8 pt-6 border-t border-slate-700 flex items-center justify-between">
              <div>
                {message && (
                  <div className={`px-4 py-2 rounded ${
                    message.type === 'success' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
                  }`}>
                    {message.text}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Preview</h2>
          <div className="flex justify-center">
            <div className="w-96">
              <SupportWidget previewMode={true} previewSettings={settings} />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
