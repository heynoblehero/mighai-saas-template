export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For now, return an empty array as no database is configured
    // In a real implementation, this would fetch from your database
    const subscribers = [];
    
    res.status(200).json(subscribers);
  } catch (error) {
    console.error('Failed to fetch subscribers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}