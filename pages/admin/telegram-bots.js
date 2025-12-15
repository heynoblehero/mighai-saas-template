import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function TelegramBots() {
  const [bots, setBots] = useState([]);
  const [showAddBot, setShowAddBot] = useState(false);
  const [editingBot, setEditingBot] = useState(null);
  const [viewingMessages, setViewingMessages] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [botForm, setBotForm] = useState({
    name: '',
    botToken: '',
    chatId: '',
    enabledEvents: {
      // Support Events
      supportRequest: { enabled: false, timing: 'immediate' },
      supportReply: { enabled: false, timing: 'immediate' },
      
      // User Events
      newSignup: { enabled: false, timing: 'immediate' },
      newSubscription: { enabled: false, timing: 'immediate' },
      subscriptionCancelled: { enabled: false, timing: 'immediate' },
      
      // System Events
      systemError: { enabled: false, timing: 'immediate' },
      deploymentComplete: { enabled: false, timing: 'immediate' },
      platformUpdate: { enabled: false, timing: 'immediate' },
      
      // Analytics Reports
      dailyReport: { enabled: false, timing: '09:00' },
      weeklyReport: { enabled: false, timing: 'monday-09:00' },
      monthlyReport: { enabled: false, timing: '1st-09:00' },
      
      // Performance Alerts
      highCpuUsage: { enabled: false, timing: 'immediate' },
      highMemoryUsage: { enabled: false, timing: 'immediate' },
      apiRateLimit: { enabled: false, timing: 'immediate' }
    }
  });

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/admin/telegram-bots');
      const data = await response.json();
      if (data.success) {
        setBots(data.bots);
      }
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    }
  };

  const fetchMessages = async (botId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/telegram-bots/${botId}/messages`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
        setViewingMessages(botId);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveBot = async () => {
    if (!botForm.name || !botForm.botToken || !botForm.chatId) {
      setError('All fields are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const url = editingBot ? `/api/admin/telegram-bots/${editingBot.id}` : '/api/admin/telegram-bots';
      const method = editingBot ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botForm),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(editingBot ? 'Bot updated successfully!' : 'Bot added successfully!');
        setShowAddBot(false);
        setEditingBot(null);
        setBotForm({
          name: '',
          botToken: '',
          chatId: '',
          enabledEvents: {
            supportRequest: { enabled: false, timing: 'immediate' },
            supportReply: { enabled: false, timing: 'immediate' },
            newSignup: { enabled: false, timing: 'immediate' },
            newSubscription: { enabled: false, timing: 'immediate' },
            subscriptionCancelled: { enabled: false, timing: 'immediate' },
            systemError: { enabled: false, timing: 'immediate' },
            deploymentComplete: { enabled: false, timing: 'immediate' },
            platformUpdate: { enabled: false, timing: 'immediate' },
            dailyReport: { enabled: false, timing: '09:00' },
            weeklyReport: { enabled: false, timing: 'monday-09:00' },
            monthlyReport: { enabled: false, timing: '1st-09:00' },
            highCpuUsage: { enabled: false, timing: 'immediate' },
            highMemoryUsage: { enabled: false, timing: 'immediate' },
            apiRateLimit: { enabled: false, timing: 'immediate' }
          }
        });
        fetchBots();
      } else {
        setError(data.error || 'Failed to save bot');
      }
    } catch (err) {
      setError('Failed to save bot: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testBot = async (bot) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/telegram-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: bot.bot_token,
          chatId: bot.chat_id,
          message: `Test message from ${bot.name}! 🚀`
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`Test message sent successfully to ${bot.name}! ✅`);
      } else {
        setError(`Failed to send test message to ${bot.name}: ${data.error}`);
      }
    } catch (err) {
      setError(`Test failed for ${bot.name}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteBot = async (botId) => {
    if (!confirm('Are you sure you want to delete this bot?')) return;

    try {
      const response = await fetch(`/api/admin/telegram-bots/${botId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setMessage('Bot deleted successfully!');
        fetchBots();
      } else {
        setError(data.error || 'Failed to delete bot');
      }
    } catch (err) {
      setError('Failed to delete bot: ' + err.message);
    }
  };

  const editBot = (bot) => {
    setBotForm({
      name: bot.name,
      botToken: bot.bot_token,
      chatId: bot.chat_id,
      enabledEvents: bot.enabled_events ? JSON.parse(bot.enabled_events) : {}
    });
    setEditingBot(bot);
    setShowAddBot(true);
  };

  const updateEventSetting = (eventKey, field, value) => {
    setBotForm(prev => ({
      ...prev,
      enabledEvents: {
        ...prev.enabledEvents,
        [eventKey]: {
          ...prev.enabledEvents[eventKey],
          [field]: value
        }
      }
    }));
  };

  const eventCategories = [
    {
      name: 'Support Events',
      events: {
        supportRequest: 'New Support Request',
        supportReply: 'Support Message Reply'
      }
    },
    {
      name: 'User Events', 
      events: {
        newSignup: 'New User Signup',
        newSubscription: 'New Subscription',
        subscriptionCancelled: 'Subscription Cancelled'
      }
    },
    {
      name: 'System Events',
      events: {
        systemError: 'System Error',
        deploymentComplete: 'Deployment Complete',
        platformUpdate: 'Platform Update'
      }
    },
    {
      name: 'Analytics Reports',
      events: {
        dailyReport: 'Daily Analytics Report',
        weeklyReport: 'Weekly Analytics Report',
        monthlyReport: 'Monthly Analytics Report'
      }
    },
    {
      name: 'Performance Alerts',
      events: {
        highCpuUsage: 'High CPU Usage',
        highMemoryUsage: 'High Memory Usage',
        apiRateLimit: 'API Rate Limit Hit'
      }
    }
  ];

  return (
    <AdminLayout title="Telegram Bots">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Telegram Bots</h1>
            <p className="text-slate-400 mt-1">Manage multiple Telegram bots and their event subscriptions</p>
          </div>
          <button
            onClick={() => {
              setShowAddBot(true);
              setEditingBot(null);
              setBotForm({
                name: '',
                botToken: '',
                chatId: '',
                enabledEvents: {
                  supportRequest: { enabled: false, timing: 'immediate' },
                  supportReply: { enabled: false, timing: 'immediate' },
                  newSignup: { enabled: false, timing: 'immediate' },
                  newSubscription: { enabled: false, timing: 'immediate' },
                  subscriptionCancelled: { enabled: false, timing: 'immediate' },
                  systemError: { enabled: false, timing: 'immediate' },
                  deploymentComplete: { enabled: false, timing: 'immediate' },
                  platformUpdate: { enabled: false, timing: 'immediate' },
                  dailyReport: { enabled: false, timing: '09:00' },
                  weeklyReport: { enabled: false, timing: 'monday-09:00' },
                  monthlyReport: { enabled: false, timing: '1st-09:00' },
                  highCpuUsage: { enabled: false, timing: 'immediate' },
                  highMemoryUsage: { enabled: false, timing: 'immediate' },
                  apiRateLimit: { enabled: false, timing: 'immediate' }
                }
              });
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Add New Bot
          </button>
        </div>

        {/* Status Messages */}
        {message && (
          <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
            <div className="text-green-400">{message}</div>
          </div>
        )}
        {error && (
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
            <div className="text-red-400">{error}</div>
          </div>
        )}

        {/* Bots List */}
        <div className="grid gap-6">
          {bots.map((bot) => (
            <div key={bot.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-200">{bot.name}</h3>
                  <div className="text-sm text-slate-400 mt-1">
                    <p>Chat ID: {bot.chat_id}</p>
                    <p>Status: <span className={bot.status === 'active' ? 'text-green-400' : 'text-red-400'}>{bot.status}</span></p>
                    <p>Messages Sent: {bot.total_messages || 0}</p>
                    {bot.last_used && <p>Last Used: {new Date(bot.last_used).toLocaleString()}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => testBot(bot)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => fetchMessages(bot.id)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Messages
                  </button>
                  <button
                    onClick={() => editBot(bot)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteBot(bot.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Show enabled events */}
              <div>
                <h4 className="font-medium text-slate-300 mb-2">Subscribed Events:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(bot.enabled_events ? JSON.parse(bot.enabled_events) : {})
                    .filter(([key, config]) => config.enabled)
                    .map(([eventKey, config]) => (
                      <span
                        key={eventKey}
                        className="bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-sm"
                      >
                        {eventKey} ({config.timing})
                      </span>
                    ))}
                  {Object.entries(bot.enabled_events ? JSON.parse(bot.enabled_events) : {})
                    .filter(([key, config]) => config.enabled).length === 0 && (
                    <span className="text-slate-500 text-sm">No events subscribed</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {bots.length === 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <div className="text-slate-400 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                </svg>
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Bots Configured</h3>
                <p className="text-slate-400">Add your first Telegram bot to start receiving notifications</p>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Bot Modal */}
        {showAddBot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-100">
                  {editingBot ? 'Edit Bot' : 'Add New Bot'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddBot(false);
                    setEditingBot(null);
                    setError('');
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Configuration */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Bot Name</label>
                    <input
                      type="text"
                      value={botForm.name}
                      onChange={(e) => setBotForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter bot name..."
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Bot Token</label>
                    <input
                      type="password"
                      value={botForm.botToken}
                      onChange={(e) => setBotForm(prev => ({ ...prev, botToken: e.target.value }))}
                      placeholder="Bot token from @BotFather..."
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Chat ID</label>
                    <input
                      type="text"
                      value={botForm.chatId}
                      onChange={(e) => setBotForm(prev => ({ ...prev, chatId: e.target.value }))}
                      placeholder="Your Telegram user ID..."
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Event Subscriptions */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Event Subscriptions</h3>
                  <div className="space-y-6">
                    {eventCategories.map((category, categoryIndex) => (
                      <div key={categoryIndex} className="bg-slate-700/50 rounded-lg p-4">
                        <h4 className="font-medium text-slate-300 mb-3">{category.name}</h4>
                        <div className="space-y-3">
                          {Object.entries(category.events).map(([eventKey, eventName]) => {
                            const eventConfig = botForm.enabledEvents[eventKey] || { enabled: false, timing: 'immediate' };
                            const isReport = eventKey.includes('Report');
                            
                            return (
                              <div key={eventKey} className="flex items-center justify-between p-3 bg-slate-600/30 rounded-lg">
                                <label className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    checked={eventConfig.enabled || false}
                                    onChange={(e) => updateEventSetting(eventKey, 'enabled', e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-emerald-500"
                                  />
                                  <span className="text-slate-200 font-medium">{eventName}</span>
                                </label>
                                
                                {eventConfig.enabled && (
                                  <div className="flex items-center space-x-3">
                                    {isReport ? (
                                      <select
                                        value={eventConfig.timing}
                                        onChange={(e) => updateEventSetting(eventKey, 'timing', e.target.value)}
                                        className="px-3 py-1 bg-slate-600 border border-slate-500 rounded text-slate-200 text-sm"
                                      >
                                        {eventKey === 'dailyReport' && (
                                          <>
                                            <option value="09:00">09:00 Daily</option>
                                            <option value="12:00">12:00 Daily</option>
                                            <option value="18:00">18:00 Daily</option>
                                            <option value="21:00">21:00 Daily</option>
                                          </>
                                        )}
                                        {eventKey === 'weeklyReport' && (
                                          <>
                                            <option value="monday-09:00">Monday 09:00</option>
                                            <option value="sunday-18:00">Sunday 18:00</option>
                                            <option value="friday-17:00">Friday 17:00</option>
                                          </>
                                        )}
                                        {eventKey === 'monthlyReport' && (
                                          <>
                                            <option value="1st-09:00">1st of month 09:00</option>
                                            <option value="last-18:00">Last day 18:00</option>
                                          </>
                                        )}
                                      </select>
                                    ) : (
                                      <select
                                        value={eventConfig.timing}
                                        onChange={(e) => updateEventSetting(eventKey, 'timing', e.target.value)}
                                        className="px-3 py-1 bg-slate-600 border border-slate-500 rounded text-slate-200 text-sm"
                                      >
                                        <option value="immediate">Immediate</option>
                                        <option value="batch-hourly">Batch Hourly</option>
                                        <option value="batch-daily">Batch Daily</option>
                                      </select>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAddBot(false);
                      setEditingBot(null);
                      setError('');
                    }}
                    className="px-6 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveBot}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    {loading ? 'Saving...' : (editingBot ? 'Update Bot' : 'Add Bot')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages Modal */}
        {viewingMessages && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-100">Message History</h2>
                <button
                  onClick={() => setViewingMessages(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-slate-300">{msg.event_type}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          msg.status === 'sent' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                        }`}>
                          {msg.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(msg.sent_at).toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-slate-400 whitespace-pre-wrap">{msg.message}</div>
                  </div>
                ))}

                {messages.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    No messages found for this bot
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}