import db from '../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../lib/config';



function getUser(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    
    const decoded = jwt.verify(token, config.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get chat messages for current user
    const user = getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const messages = db.prepare(`
        SELECT * FROM support_messages 
        WHERE user_id = ? 
        ORDER BY created_at ASC
      `).all(user.userId);

      return res.status(200).json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  if (req.method === 'POST') {
    // Send new message
    const user = getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      // Check if support_messages table exists, create if not
      db.prepare(`
        CREATE TABLE IF NOT EXISTS support_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          sender_type TEXT DEFAULT 'customer',
          is_read BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // Insert new message
      const result = db.prepare(`
        INSERT INTO support_messages (user_id, message, sender_type, is_read)
        VALUES (?, ?, 'customer', FALSE)
      `).run(user.userId, message.trim());

      const newMessage = db.prepare(`
        SELECT * FROM support_messages WHERE id = ?
      `).get(result.lastInsertRowid);

      // Get user details for notification
      const userDetails = db.prepare('SELECT * FROM users WHERE id = ?').get(user.userId);

      // Send Telegram notification for new support request
      try {
        const { default: telegramNotifier } = await import('../../../lib/telegram.js');
        await telegramNotifier.sendNotification('supportRequest', {
          email: userDetails?.email || 'Unknown',
          subject: 'New Support Message',
          message: message.trim()
        });
      } catch (telegramError) {
        console.error('Failed to send Telegram notification:', telegramError);
        // Don't fail the support message if Telegram notification fails
      }

      const response = { 
        success: true, 
        message: newMessage 
      };
      
      console.log('API sending response:', response);
      return res.status(200).json(response);
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}