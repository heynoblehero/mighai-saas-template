import db from './database.js';

class TelegramNotifier {
  constructor() {
    this.bots = new Map();
    this.loadBots();
  }

  loadBots() {
    try {
      // Create tables if they don't exist
      this.initializeTables();
      
      // Check if table exists before querying
      const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='telegram_bots'").get();
      
      if (!tableExists) {
        console.log('Telegram bots table does not exist, skipping load');
        this.bots.clear();
        return;
      }
      
      const bots = db.prepare("SELECT * FROM telegram_bots WHERE status = 'active'").all();
      this.bots.clear();
      
      for (const bot of bots) {
        this.bots.set(bot.id, {
          id: bot.id,
          name: bot.name,
          botToken: bot.bot_token,
          chatId: bot.chat_id,
          enabledEvents: bot.enabled_events ? JSON.parse(bot.enabled_events) : {},
          status: bot.status,
          lastUsed: bot.last_used
        });
      }
    } catch (error) {
      console.error('Error loading Telegram bots:', error);
      this.bots.clear();
    }
  }

  initializeTables() {
    try {
      // Create bots table
      db.prepare(`
        CREATE TABLE IF NOT EXISTS telegram_bots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          bot_token TEXT NOT NULL,
          chat_id TEXT NOT NULL,
          enabled_events TEXT DEFAULT '{}',
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_used DATETIME,
          total_messages INTEGER DEFAULT 0
        )
      `).run();

      // Create message history table
      db.prepare(`
        CREATE TABLE IF NOT EXISTS telegram_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bot_id INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'sent',
          response_data TEXT,
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (bot_id) REFERENCES telegram_bots (id)
        )
      `).run();

      // Create notification queue table
      db.prepare(`
        CREATE TABLE IF NOT EXISTS notification_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bot_id INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          data TEXT NOT NULL,
          timing TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (bot_id) REFERENCES telegram_bots (id)
        )
      `).run();
    } catch (error) {
      console.error('Error initializing Telegram tables:', error);
      throw error;
    }
  }

  async sendMessage(botId, text, parseMode = 'Markdown') {
    const bot = this.bots.get(botId);
    if (!bot) {
      console.log(`Telegram notification skipped - bot ${botId} not found`);
      return { success: false, error: 'Bot not found' };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${bot.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: bot.chatId,
          text: text,
          parse_mode: parseMode
        })
      });

      const result = await response.json();

      if (result.ok) {
        // Update bot usage stats
        db.prepare(`
          UPDATE telegram_bots 
          SET last_used = CURRENT_TIMESTAMP, total_messages = total_messages + 1 
          WHERE id = ?
        `).run(botId);

        return { success: true, result };
      } else {
        console.error('Telegram API error:', result);
        return { success: false, error: result.description };
      }
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTestMessage(botToken, chatId, message) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      const result = await response.json();
      return result.ok ? { success: true, result } : { success: false, error: result.description };
    } catch (error) {
      console.error('Error testing Telegram bot:', error);
      return { success: false, error: error.message };
    }
  }

  getBotsByEvent(eventType) {
    const subscribedBots = [];
    for (const [botId, bot] of this.bots) {
      if (bot.enabledEvents[eventType]?.enabled === true) {
        subscribedBots.push({
          botId,
          bot,
          timing: bot.enabledEvents[eventType]?.timing || 'immediate'
        });
      }
    }
    return subscribedBots;
  }

  async sendNotification(eventType, data) {
    // Refresh bots in case they were updated
    this.loadBots();

    const subscribedBots = this.getBotsByEvent(eventType);
    
    if (subscribedBots.length === 0) {
      return { success: false, error: 'No bots subscribed to this event' };
    }

    const results = [];
    const message = this.formatMessage(eventType, data);

    for (const { botId, bot, timing } of subscribedBots) {
      try {
        if (timing === 'immediate') {
          // Send immediately
          const result = await this.sendMessage(botId, message);
          
          // Log message to database
          await this.logMessage(botId, eventType, message, result.success ? 'sent' : 'failed', result);
          
          results.push({ botId, botName: bot.name, result });
        } else {
          // Queue for later processing
          await this.queueNotification(eventType, data, timing, botId);
          results.push({ botId, botName: bot.name, result: { success: true, queued: true } });
        }
      } catch (error) {
        console.error(`Error sending notification to bot ${botId}:`, error);
        results.push({ botId, botName: bot.name, result: { success: false, error: error.message } });
      }
    }

    return { success: true, results };
  }

  async logMessage(botId, eventType, message, status, response = null) {
    try {
      db.prepare(`
        INSERT INTO telegram_messages (bot_id, event_type, message, status, response_data)
        VALUES (?, ?, ?, ?, ?)
      `).run(botId, eventType, message, status, JSON.stringify(response));
    } catch (error) {
      console.error('Error logging message:', error);
    }
  }

  async queueNotification(eventType, data, timing, botId) {
    try {
      // Insert notification into queue with bot ID
      db.prepare(`
        INSERT INTO notification_queue (event_type, data, timing, bot_id)
        VALUES (?, ?, ?, ?)
      `).run(eventType, JSON.stringify(data), timing, botId);

      return { success: true, queued: true };
    } catch (error) {
      console.error('Error queueing notification:', error);
      return { success: false, error: error.message };
    }
  }

  formatMessage(eventType, data) {
    const formatters = {
      supportRequest: (data) => `🆘 **New Support Request**\n\n` +
        `**From:** ${data.email}\n` +
        `**Subject:** ${data.subject}\n` +
        `**Message:** ${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}\n\n` +
        `View in admin panel to respond.`,

      supportReply: (data) => `💬 **Support Reply Sent**\n\n` +
        `**To:** ${data.email}\n` +
        `**Subject:** ${data.subject}\n\n` +
        `Response has been sent successfully.`,

      newSignup: (data) => `👥 **New User Signup**\n\n` +
        `**User:** ${data.username}\n` +
        `**Email:** ${data.email}\n` +
        `**Plan:** ${data.plan || 'Free'}\n\n` +
        `Welcome to the platform! 🎉`,

      newSubscription: (data) => `💳 **New Subscription**\n\n` +
        `**User:** ${data.username}\n` +
        `**Plan:** ${data.plan}\n` +
        `**Amount:** $${data.amount}\n\n` +
        `Ka-ching! 💰`,

      subscriptionCancelled: (data) => `❌ **Subscription Cancelled**\n\n` +
        `**User:** ${data.username}\n` +
        `**Plan:** ${data.plan}\n` +
        `**Reason:** ${data.reason || 'Not specified'}\n\n` +
        `Consider reaching out to understand why.`,

      systemError: (data) => `🚨 **System Error Detected**\n\n` +
        `**Error:** ${data.error}\n` +
        `**Path:** ${data.path || 'Unknown'}\n` +
        `**Time:** ${new Date(data.timestamp).toLocaleString()}\n\n` +
        `Please investigate immediately!`,

      deploymentComplete: (data) => `🚀 **Deployment Complete**\n\n` +
        `**Version:** ${data.version || 'Latest'}\n` +
        `**Status:** ${data.status}\n` +
        `**Duration:** ${data.duration || 'Unknown'}\n\n` +
        `Platform is now updated and running! ✅`,

      platformUpdate: (data) => `🔄 **Platform Update**\n\n` +
        `**From:** ${data.fromVersion}\n` +
        `**To:** ${data.toVersion}\n` +
        `**Status:** ${data.status}\n\n` +
        `Update completed successfully! 🎯`,

      highCpuUsage: (data) => `⚡ **High CPU Usage Alert**\n\n` +
        `**Current Usage:** ${data.usage}%\n` +
        `**Threshold:** ${data.threshold}%\n` +
        `**Duration:** ${data.duration}\n\n` +
        `Server performance may be affected.`,

      highMemoryUsage: (data) => `🧠 **High Memory Usage Alert**\n\n` +
        `**Current Usage:** ${data.usage}%\n` +
        `**Threshold:** ${data.threshold}%\n` +
        `**Available:** ${data.available}\n\n` +
        `Consider scaling or optimization.`,

      apiRateLimit: (data) => `🚦 **API Rate Limit Hit**\n\n` +
        `**Endpoint:** ${data.endpoint}\n` +
        `**Client:** ${data.client}\n` +
        `**Limit:** ${data.limit} req/min\n\n` +
        `Traffic is being throttled.`,

      // Analytics reports will be formatted separately
      dailyReport: (data) => this.formatAnalyticsReport('Daily', data),
      weeklyReport: (data) => this.formatAnalyticsReport('Weekly', data),
      monthlyReport: (data) => this.formatAnalyticsReport('Monthly', data)
    };

    const formatter = formatters[eventType];
    if (formatter) {
      return formatter(data);
    } else {
      return `📢 **${eventType}**\n\n${JSON.stringify(data, null, 2)}`;
    }
  }

  formatAnalyticsReport(period, data) {
    return `📊 **${period} Analytics Report**\n\n` +
      `**Period:** ${data.startDate} - ${data.endDate}\n\n` +
      `**👥 Users:**\n` +
      `• New Signups: ${data.newSignups || 0}\n` +
      `• Total Active: ${data.activeUsers || 0}\n` +
      `• Free Users: ${data.freeUsers || 0}\n` +
      `• Paid Users: ${data.paidUsers || 0}\n\n` +
      `**💰 Revenue:**\n` +
      `• New Subscriptions: ${data.newSubscriptions || 0}\n` +
      `• Total Revenue: $${data.totalRevenue || 0}\n` +
      `• MRR: $${data.mrr || 0}\n\n` +
      `**📈 Growth:**\n` +
      `• User Growth: ${data.userGrowth > 0 ? '+' : ''}${data.userGrowth || 0}%\n` +
      `• Revenue Growth: ${data.revenueGrowth > 0 ? '+' : ''}${data.revenueGrowth || 0}%\n\n` +
      `Keep up the great work! 🎯`;
  }

  // Method to process queued notifications (to be called by cron job)
  async processQueue() {
    this.loadBots();

    if (this.bots.size === 0) {
      console.log('No active bots, skipping queue processing');
      return;
    }

    try {
      const queuedNotifications = db.prepare(`
        SELECT * FROM notification_queue 
        WHERE processed = FALSE
        ORDER BY created_at ASC
      `).all();

      for (const notification of queuedNotifications) {
        const data = JSON.parse(notification.data);
        const message = this.formatMessage(notification.event_type, data);
        
        const result = await this.sendMessage(notification.bot_id, message);
        
        if (result.success) {
          // Log message and mark as processed
          await this.logMessage(notification.bot_id, notification.event_type, message, 'sent', result);
          db.prepare('UPDATE notification_queue SET processed = TRUE WHERE id = ?').run(notification.id);
          console.log(`Processed notification ${notification.id} (${notification.event_type}) for bot ${notification.bot_id}`);
        } else {
          // Log failed message
          await this.logMessage(notification.bot_id, notification.event_type, message, 'failed', result);
          console.error(`Failed to process notification ${notification.id}:`, result.error);
        }

        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }
}

// Create singleton instance
const telegramNotifier = new TelegramNotifier();

// Export both the class and instance
export { TelegramNotifier };
export default telegramNotifier;