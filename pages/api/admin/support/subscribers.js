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

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get subscriber conversations only (users with active subscription)
    const conversations = db.prepare(`
      SELECT
        sm.user_id,
        u.email,
        u.name as username,
        u.subscription_status,
        (SELECT message FROM support_messages WHERE user_id = sm.user_id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM support_messages WHERE user_id = sm.user_id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM support_messages WHERE user_id = sm.user_id AND sender_type = 'customer' AND is_read = 0) as unread_count,
        1 as is_subscriber
      FROM support_messages sm
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE u.subscription_status = 'active'
      GROUP BY sm.user_id
      ORDER BY last_message_time DESC
    `).all();

    return res.status(200).json(conversations);
  } catch (error) {
    console.error('Failed to fetch subscriber conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch subscriber conversations' });
  }
}
