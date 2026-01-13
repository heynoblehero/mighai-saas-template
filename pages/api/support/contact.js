import db from '../../../lib/database';

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

  if (req.method === 'POST') {
    // Send message from guest user (using email)
    const { email, message } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
      // Find or create chat user
      let chatUser = db.prepare('SELECT * FROM chat_users WHERE email = ?').get(email.trim().toLowerCase());

      if (!chatUser) {
        // Create new chat user
        const result = db.prepare(`
          INSERT INTO chat_users (email, session_token)
          VALUES (?, ?)
        `).run(email.trim().toLowerCase(), `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

        chatUser = db.prepare('SELECT * FROM chat_users WHERE id = ?').get(result.lastInsertRowid);
      }

      // Insert the message
      const result = db.prepare(`
        INSERT INTO support_messages (chat_user_id, message, sender_type, is_read)
        VALUES (?, ?, 'customer', FALSE)
      `).run(chatUser.id, message.trim());

      const newMessage = db.prepare('SELECT * FROM support_messages WHERE id = ?').get(result.lastInsertRowid);

      // Send Telegram notification
      try {
        const { default: telegramNotifier } = await import('../../../lib/telegram.js');
        await telegramNotifier.sendNotification('supportRequest', {
          email: email,
          subject: 'New Support Message (Guest)',
          message: message.trim()
        });
      } catch (telegramError) {
        console.error('Failed to send Telegram notification:', telegramError);
      }

      return res.status(200).json(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
