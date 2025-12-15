import db from '../../../../../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const { id } = req.query;

  try {
    // Get bot info
    const bot = db.prepare('SELECT * FROM telegram_bots WHERE id = ?').get(id);
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }

    // Get message history
    const messages = db.prepare(`
      SELECT * FROM telegram_messages 
      WHERE bot_id = ? 
      ORDER BY sent_at DESC
      LIMIT 100
    `).all(id);

    res.status(200).json({
      success: true,
      messages,
      bot: {
        id: bot.id,
        name: bot.name
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
}