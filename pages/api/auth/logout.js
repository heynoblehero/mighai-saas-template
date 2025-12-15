import { deleteSession } from '../../../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session token from cookies
    const sessionToken = req.cookies?.session_token;
    
    if (sessionToken) {
      // Delete session from database
      await deleteSession(sessionToken);
    }

    // Clear session cookie
    res.setHeader('Set-Cookie', [
      'session_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
    ]);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Failed to logout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}