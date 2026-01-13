import db from '../../../../lib/database';

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

export default async function handler(req, res) {
  ensureTables();

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const decodedEmail = decodeURIComponent(email).toLowerCase().trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(decodedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (req.method === 'GET') {
    // Get messages for guest user by email
    try {
      const chatUser = db.prepare('SELECT * FROM chat_users WHERE email = ?').get(decodedEmail);

      if (!chatUser) {
        // No messages yet for this email
        return res.status(200).json([]);
      }

      const messages = db.prepare(`
        SELECT * FROM support_messages
        WHERE chat_user_id = ?
        ORDER BY created_at ASC
      `).all(chatUser.id);

      return res.status(200).json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  if (req.method === 'PUT') {
    // Mark messages as read for this guest
    try {
      const chatUser = db.prepare('SELECT * FROM chat_users WHERE email = ?').get(decodedEmail);

      if (chatUser) {
        db.prepare(`
          UPDATE support_messages
          SET is_read = TRUE, updated_at = datetime('now')
          WHERE chat_user_id = ? AND sender_type = 'admin' AND is_read = FALSE
        `).run(chatUser.id);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
