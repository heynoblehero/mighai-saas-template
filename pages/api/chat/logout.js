import db from '../../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the chat token from cookies
    const chatToken = req.cookies.chat_token;

    if (chatToken) {
      // Optionally invalidate the token in the database
      db.prepare(`
        UPDATE chat_users
        SET session_token = NULL
        WHERE session_token = ?
      `).run(chatToken);
    }

    // Clear the chat_token cookie
    res.setHeader('Set-Cookie', [
      'chat_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax'
    ]);

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Chat logout error:', error);
    return res.status(500).json({ error: 'Logout failed' });
  }
}
