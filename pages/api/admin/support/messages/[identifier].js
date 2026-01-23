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

// Send email notification to customer
async function sendReplyNotification(customerEmail, customerName, replyMessage) {
  try {
    // Get email settings
    const emailSettings = db.prepare('SELECT * FROM email_settings WHERE id = 1').get();
    if (!emailSettings || !emailSettings.support_reply_notifications || !emailSettings.resend_api_key) {
      return; // Notifications disabled or not configured
    }

    // Get the template
    const template = db.prepare("SELECT * FROM email_templates WHERE name = 'Support Reply Notification'").get();
    if (!template) {
      console.log('Support Reply Notification template not found');
      return;
    }

    // Replace template variables
    const siteName = emailSettings.from_name || 'Mighai';
    const siteUrl = config.BASE_URL || 'http://localhost:3000';

    let htmlContent = template.html_content
      .replace(/\{\{USER_NAME\}\}/g, customerName || 'there')
      .replace(/\{\{REPLY_MESSAGE\}\}/g, replyMessage)
      .replace(/\{\{SITE_NAME\}\}/g, siteName)
      .replace(/\{\{SITE_URL\}\}/g, siteUrl);

    let textContent = template.text_content
      .replace(/\{\{USER_NAME\}\}/g, customerName || 'there')
      .replace(/\{\{REPLY_MESSAGE\}\}/g, replyMessage)
      .replace(/\{\{SITE_NAME\}\}/g, siteName)
      .replace(/\{\{SITE_URL\}\}/g, siteUrl);

    let subject = template.subject.replace(/\{\{SITE_NAME\}\}/g, siteName);

    // Send via Resend
    const { Resend } = await import('resend');
    const resend = new Resend(emailSettings.resend_api_key);

    await resend.emails.send({
      from: `${emailSettings.from_name} <${emailSettings.from_email}>`,
      to: customerEmail,
      subject: subject,
      html: htmlContent,
      text: textContent
    });

    console.log(`Support reply notification sent to ${customerEmail}`);
  } catch (error) {
    console.error('Failed to send reply notification:', error);
    // Don't throw - email failure shouldn't break the reply
  }
}

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const { identifier } = req.query;
  const { type } = req.query; // 'subscriber' or 'guest'

  // Determine if this is a subscriber or guest chat user
  let isGuest = type === 'guest';
  let userId = null;
  let chatUserId = null;
  let customerEmail = null;
  let customerName = null;

  if (isGuest || identifier.includes('@')) {
    // It's an email (guest user)
    const chatUser = db.prepare('SELECT id, email, name FROM chat_users WHERE email = ?').get(identifier);
    if (chatUser) {
      chatUserId = chatUser.id;
      customerEmail = chatUser.email;
      customerName = chatUser.name;
      isGuest = true;
    } else if (!isNaN(identifier)) {
      // Try as chat_user_id
      const chatUserById = db.prepare('SELECT id, email, name FROM chat_users WHERE id = ?').get(identifier);
      if (chatUserById) {
        chatUserId = chatUserById.id;
        customerEmail = chatUserById.email;
        customerName = chatUserById.name;
        isGuest = true;
      }
    }
  }

  if (!isGuest) {
    // It's a subscriber
    if (isNaN(identifier)) {
      // It's an email
      const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(identifier);
      if (user) {
        userId = user.id;
        customerEmail = user.email;
        customerName = user.name;
      }
    } else {
      userId = parseInt(identifier);
      const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId);
      if (user) {
        customerEmail = user.email;
        customerName = user.name;
      }
    }
  }

  if (!userId && !chatUserId) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (req.method === 'GET') {
    // Get all messages for this user
    try {
      let messages;
      let userInfo;

      if (isGuest) {
        messages = db.prepare(`
          SELECT * FROM support_messages
          WHERE chat_user_id = ?
          ORDER BY created_at ASC
        `).all(chatUserId);

        userInfo = db.prepare('SELECT id, email, name FROM chat_users WHERE id = ?').get(chatUserId);
        userInfo.subscription_status = 'guest';
      } else {
        messages = db.prepare(`
          SELECT * FROM support_messages
          WHERE user_id = ?
          ORDER BY created_at ASC
        `).all(userId);

        userInfo = db.prepare('SELECT id, email, name, subscription_status FROM users WHERE id = ?').get(userId);
      }

      return res.status(200).json({
        user: userInfo,
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
      let result;

      if (isGuest) {
        result = db.prepare(`
          INSERT INTO support_messages (chat_user_id, message, sender_type, is_read)
          VALUES (?, ?, 'admin', FALSE)
        `).run(chatUserId, message.trim());
      } else {
        result = db.prepare(`
          INSERT INTO support_messages (user_id, message, sender_type, is_read)
          VALUES (?, ?, 'admin', FALSE)
        `).run(userId, message.trim());
      }

      const newMessage = db.prepare(`
        SELECT * FROM support_messages WHERE id = ?
      `).get(result.lastInsertRowid);

      // Send email notification to customer
      if (customerEmail) {
        await sendReplyNotification(customerEmail, customerName, message.trim());
      }

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
