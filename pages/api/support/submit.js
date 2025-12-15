const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const emailService = require('../../../services/emailService');

const dbPath = path.join(process.cwd(), 'site_builder.db');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, subject, message, priority = 'Normal' } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Create support_messages table if it doesn't exist
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS support_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          priority TEXT DEFAULT 'Normal',
          status TEXT DEFAULT 'open',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Insert support message
    const messageId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO support_messages (name, email, subject, message, priority) VALUES (?, ?, ?, ?, ?)',
        [name, email, subject, message, priority],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Send admin notification
    try {
      await emailService.sendAdminNotification('support_request', {
        userEmail: email,
        userName: name,
        subject: subject,
        message: message,
        priority: priority,
        messageId: messageId
      });
    } catch (notificationError) {
      console.error('Failed to send support notification:', notificationError);
    }

    res.status(201).json({ 
      message: 'Support request submitted successfully',
      id: messageId 
    });

  } catch (error) {
    console.error('Support submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    db.close();
  }
}