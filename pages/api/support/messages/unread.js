import db from '../../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../../lib/config';



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
    const user = getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const unreadCount = db.prepare(`
        SELECT COUNT(*) as count FROM support_messages 
        WHERE user_id = ? AND sender_type = 'admin' AND is_read = FALSE
      `).get(user.userId);

      return res.status(200).json({ count: unreadCount.count || 0 });
    } catch (error) {
      console.error('Error checking unread messages:', error);
      return res.status(500).json({ error: 'Failed to check unread messages' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}