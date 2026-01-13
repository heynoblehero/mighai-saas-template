import db from '../../../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../../../lib/config';

const JWT_SECRET = config.JWT_SECRET;

function getAdmin(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.role === 'admin' ? decoded : null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const { identifier } = req.query;

  // identifier can be user_id (number) or email (string)
  let userId = identifier;
  if (isNaN(identifier)) {
    // It's an email, find the user_id
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(identifier);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    userId = user.id;
  }

  if (req.method === 'GET') {
    // Get all messages for this user
    try {
      const messages = db.prepare(`
        SELECT * FROM support_messages
        WHERE user_id = ?
        ORDER BY created_at ASC
      `).all(userId);

      // Get user info
      const user = db.prepare('SELECT id, email, name, subscription_status FROM users WHERE id = ?').get(userId);

      return res.status(200).json({
        user,
        messages
      });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  if (req.method === 'POST') {
    // Send admin reply
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      const result = db.prepare(`
        INSERT INTO support_messages (user_id, message, sender_type, is_read)
        VALUES (?, ?, 'admin', FALSE)
      `).run(userId, message.trim());

      const newMessage = db.prepare(`
        SELECT * FROM support_messages WHERE id = ?
      `).get(result.lastInsertRowid);

      return res.status(200).json({
        success: true,
        message: newMessage
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
