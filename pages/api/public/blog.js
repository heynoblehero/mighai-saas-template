import db from '../../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize blog_posts table if it doesn't exist
    db.prepare(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        featured_image TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Only return published posts for public API
    const posts = db.prepare(`
      SELECT id, title, slug, excerpt, featured_image, created_at 
      FROM blog_posts 
      WHERE is_published = TRUE 
      ORDER BY created_at DESC
    `).all();
    
    res.status(200).json(posts);
  } catch (error) {
    console.error('Failed to fetch published blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
}