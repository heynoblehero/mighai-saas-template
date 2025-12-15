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
  if (req.method === 'PUT') {
    const user = getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      db.prepare(`
        UPDATE support_messages 
        SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND sender_type = 'admin'
      `).run(user.userId);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}