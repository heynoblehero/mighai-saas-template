import db from '../../../../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../../../../lib/config';

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

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  try {
    // Mark all customer messages for this user as read
    const result = db.prepare(`
      UPDATE support_messages
      SET is_read = 1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND sender_type = 'customer' AND is_read = 0
    `).run(userId);

    return res.status(200).json({
      success: true,
      messagesMarkedRead: result.changes
    });
  } catch (error) {
    console.error('Failed to mark messages as read:', error);
    return res.status(500).json({ error: 'Failed to mark messages as read' });
  }
}
