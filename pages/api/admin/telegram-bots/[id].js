import db from '../../../../lib/database.js';
import telegramNotifier from '../../../../lib/telegram.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
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
      const testResult = await telegramNotifier.sendTestMessage(botToken, chatId, `🔄 Bot "${name}" settings updated successfully!`);
      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Bot connection test failed: ' + testResult.error
        });
      }

      // Check if bot name already exists (excluding current bot)
      const existingBot = db.prepare('SELECT * FROM telegram_bots WHERE name = ? AND id != ?').get(name, id);
      if (existingBot) {
        return res.status(400).json({
          success: false,
          error: 'Bot name already exists'
        });
      }

      // Update bot
      db.prepare(`
        UPDATE telegram_bots 
        SET name = ?, bot_token = ?, chat_id = ?, enabled_events = ?
        WHERE id = ?
      `).run(name, botToken, chatId, JSON.stringify(enabledEvents || {}), id);

      // Reload bots in the notifier
      telegramNotifier.loadBots();

      res.status(200).json({
        success: true,
        message: 'Bot updated successfully'
      });

    } catch (error) {
      console.error('Error updating bot:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update bot'
      });
    }
  } 
  else if (req.method === 'DELETE') {
    try {
      // Check if bot exists
      const bot = db.prepare('SELECT * FROM telegram_bots WHERE id = ?').get(id);
      if (!bot) {
        return res.status(404).json({
          success: false,
          error: 'Bot not found'
        });
      }

      // Delete bot messages first
      db.prepare('DELETE FROM telegram_messages WHERE bot_id = ?').run(id);
      
      // Delete queued notifications for this bot
      db.prepare('DELETE FROM notification_queue WHERE bot_id = ?').run(id);
      
      // Delete the bot
      db.prepare('DELETE FROM telegram_bots WHERE id = ?').run(id);

      // Reload bots in the notifier
      telegramNotifier.loadBots();

      res.status(200).json({
        success: true,
        message: 'Bot deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting bot:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete bot'
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