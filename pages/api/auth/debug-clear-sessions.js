const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'site_builder.db');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = new sqlite3.Database(dbPath);
    
    // Clear all sessions
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM user_sessions', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    db.close();
    
    res.status(200).json({ message: 'All sessions cleared' });
  } catch (error) {
    console.error('Failed to clear sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}