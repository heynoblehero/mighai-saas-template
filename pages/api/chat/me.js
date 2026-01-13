import db from '../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../lib/config';

// Check for JWT token (logged-in subscribers)
function getJwtUser(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(token, config.JWT_SECRET);
    return decoded;
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
    return chatUser || null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // First check for JWT (registered subscribers take priority)
    const jwtUser = getJwtUser(req);
    if (jwtUser) {
      // Get user details from database
      const user = db.prepare('SELECT id, email, username, subscription_status FROM users WHERE id = ?').get(jwtUser.userId);
      if (user) {
        return res.status(200).json({
          user: {
            id: user.id,
            email: user.email,
            name: user.username,
            type: 'subscriber',
            subscriptionStatus: user.subscription_status
          }
        });
      }
    }

    // Then check for chat token (anonymous users)
    const chatUser = getChatUser(req);
    if (chatUser) {
      return res.status(200).json({
        user: {
          id: chatUser.id,
          email: chatUser.email,
          name: chatUser.name,
          type: 'guest'
        }
      });
    }

    // No authenticated user found
    return res.status(200).json({ user: null });
  } catch (error) {
    console.error('Error checking user:', error);
    return res.status(500).json({ error: 'Failed to check user status' });
  }
}
