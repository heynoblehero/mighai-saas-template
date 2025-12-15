import db from '../../../lib/database.js';
import telegramNotifier from '../../../lib/telegram.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Initialize tables
      telegramNotifier.initializeTables();

      const bots = db.prepare('SELECT * FROM telegram_bots ORDER BY created_at DESC').all();
      
      res.status(200).json({
        success: true,
        bots
      });

    } catch (error) {
      console.error('Error fetching bots:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bots'
      });
    }
  } 
  else if (req.method === 'POST') {
    try {
      const { name, botToken, chatId, enabledEvents } = req.body;

      // Validate required fields
      if (!name || !botToken || !chatId) {
        return res.status(400).json({
          success: false,
          error: 'Name, bot token, and chat ID are required'
        });
      }

      // Test the bot connection first
      const testResult = await telegramNotifier.sendTestMessage(botToken, chatId, `🎉 Bot "${name}" successfully connected!`);
      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Bot connection test failed: ' + testResult.error
        });
      }

      // Initialize tables
      telegramNotifier.initializeTables();

      // Check if bot name already exists
      const existingBot = db.prepare('SELECT * FROM telegram_bots WHERE name = ?').get(name);
      if (existingBot) {
        return res.status(400).json({
          success: false,
          error: 'Bot name already exists'
        });
      }

      // Insert new bot
      const result = db.prepare(`
        INSERT INTO telegram_bots (name, bot_token, chat_id, enabled_events, status)
        VALUES (?, ?, ?, ?, 'active')
      `).run(name, botToken, chatId, JSON.stringify(enabledEvents || {}));

      // Reload bots in the notifier
      telegramNotifier.loadBots();

      res.status(200).json({
        success: true,
        message: 'Bot added successfully',
        botId: result.lastInsertRowid
      });

    } catch (error) {
      console.error('Error adding bot:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add bot'
      });
    }
  } 
  else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
}