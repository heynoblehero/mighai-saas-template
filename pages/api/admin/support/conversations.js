import db from '../../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../../lib/config';

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

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    ensureTables();

    // Get conversations from registered users (subscribers)
    const subscriberConversations = db.prepare(`
      SELECT
        sm.user_id as identifier,
        'subscriber' as user_type,
        u.email,
        u.name as username,
        u.subscription_status,
        (SELECT message FROM support_messages WHERE user_id = sm.user_id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM support_messages WHERE user_id = sm.user_id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM support_messages WHERE user_id = sm.user_id AND sender_type = 'customer' AND is_read = 0) as unread_count,
        1 as is_subscriber
      FROM support_messages sm
      INNER JOIN users u ON sm.user_id = u.id
      WHERE sm.user_id IS NOT NULL
      GROUP BY sm.user_id
    `).all();

    // Get conversations from guest users (chat_users)
    const guestConversations = db.prepare(`
      SELECT
        sm.chat_user_id as identifier,
        'guest' as user_type,
        cu.email,
        cu.name as username,
        'guest' as subscription_status,
        (SELECT message FROM support_messages WHERE chat_user_id = sm.chat_user_id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM support_messages WHERE chat_user_id = sm.chat_user_id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM support_messages WHERE chat_user_id = sm.chat_user_id AND sender_type = 'customer' AND is_read = 0) as unread_count,
        0 as is_subscriber
      FROM support_messages sm
      INNER JOIN chat_users cu ON sm.chat_user_id = cu.id
      WHERE sm.chat_user_id IS NOT NULL
      GROUP BY sm.chat_user_id
    `).all();

    // Combine and sort by last_message_time
    const allConversations = [...subscriberConversations, ...guestConversations]
      .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));

    return res.status(200).json(allConversations);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}
