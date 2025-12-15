import { getSession } from '../../../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session token from cookies
    const sessionToken = req.cookies?.session_token;
    
    console.log('Debug: Cookies received:', req.cookies);
    console.log('Debug: Session token:', sessionToken);
    
    if (!sessionToken) {
      console.log('Debug: No session token found');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate session
    const session = await getSession(sessionToken);
    
    console.log('Debug: Session found:', session ? 'YES' : 'NO');
    
    if (!session) {
      console.log('Debug: Invalid session');
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // Return the authenticated user
    console.log('Debug: Returning user:', session.user);
    return res.status(200).json({ user: session.user });
    
  } catch (error) {
    console.error('Failed to get user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}