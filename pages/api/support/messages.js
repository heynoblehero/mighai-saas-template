import db from '../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../lib/config';

// Ensure tables exist
function ensureTables() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      chat_user_id INTEGER,
      message TEXT NOT NULL,
      sender_type TEXT DEFAULT 'customer',
      is_read BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS chat_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      session_token TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

// Check for JWT token (logged-in subscribers)
function getJwtUser(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(token, config.JWT_SECRET);
    return { ...decoded, type: 'subscriber' };
  } catch (error) {
    return null;
  }
}

// Check for chat token (anonymous email users)
function getChatUser(req) {
  try {
    const token = req.cookies.chat_token || req.headers['x-chat-token'];
    if (!token) return null;

    const chatUser = db.prepare('SELECT * FROM chat_users WHERE session_token = ?').get(token);
    if (chatUser) {
      return { ...chatUser, type: 'guest' };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Get user from either auth method
function getUser(req) {
  // Try JWT first (subscribers take priority)
  const jwtUser = getJwtUser(req);
  if (jwtUser) return jwtUser;

  // Then try chat token
  const chatUser = getChatUser(req);
  if (chatUser) return chatUser;

  return null;
}

export default async function handler(req, res) {
  ensureTables();

  if (req.method === 'GET') {
    // Get chat messages for current user
    const user = getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please provide your email to start chatting.' });
    }

    try {
      let messages;
      if (user.type === 'subscriber') {
        messages = db.prepare(`
          SELECT * FROM support_messages
          WHERE user_id = ?
          ORDER BY created_at ASC
        `).all(user.userId);
      } else {
        // Guest user - use chat_user_id
        messages = db.prepare(`
          SELECT * FROM support_messages
          WHERE chat_user_id = ?
          ORDER BY created_at ASC
        `).all(user.id);
      }

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
      return res.status(401).json({ error: 'Authentication required. Please provide your email to start chatting.' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      let result;
      let userEmail = 'Unknown';

      if (user.type === 'subscriber') {
        // Insert message for subscriber
        result = db.prepare(`
          INSERT INTO support_messages (user_id, message, sender_type, is_read)
          VALUES (?, ?, 'customer', FALSE)
        `).run(user.userId, message.trim());

        // Get subscriber email
        const userDetails = db.prepare('SELECT email FROM users WHERE id = ?').get(user.userId);
        userEmail = userDetails?.email || 'Unknown';
      } else {
        // Insert message for guest user
        result = db.prepare(`
          INSERT INTO support_messages (chat_user_id, message, sender_type, is_read)
          VALUES (?, ?, 'customer', FALSE)
        `).run(user.id, message.trim());

        userEmail = user.email || 'Unknown';
      }

      const newMessage = db.prepare(`
        SELECT * FROM support_messages WHERE id = ?
      `).get(result.lastInsertRowid);

      // Send Telegram notification for new support request
      try {
        const { default: telegramNotifier } = await import('../../../lib/telegram.js');
        await telegramNotifier.sendNotification('supportRequest', {
          email: userEmail,
          subject: `New Support Message (${user.type})`,
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

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}