import db from '../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../lib/config';



function getAdmin(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    
    const decoded = jwt.verify(token, config.JWT_SECRET);
    return decoded.role === 'admin' ? decoded : null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  // Initialize blog_posts table if it doesn't exist
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        featured_image TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        is_programmatic BOOLEAN DEFAULT FALSE,
        template_id INTEGER,
        seo_title TEXT,
        seo_description TEXT,
        seo_keywords TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Create programmatic blog templates table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS blog_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        title_pattern TEXT NOT NULL,
        content_template TEXT NOT NULL,
        excerpt_template TEXT,
        slug_pattern TEXT NOT NULL,
        seo_title_pattern TEXT,
        seo_description_pattern TEXT,
        seo_keywords_pattern TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Create data sources table for programmatic generation
    db.prepare(`
      CREATE TABLE IF NOT EXISTS blog_data_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        source_type TEXT NOT NULL, -- 'csv', 'json', 'api'
        source_data TEXT NOT NULL, -- file path or API URL
        mapping_config TEXT NOT NULL, -- JSON mapping configuration
        template_id INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        last_processed DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES blog_templates(id)
      )
    `).run();
  } catch (error) {
    console.error('Failed to create blog tables:', error);
  }

  if (req.method === 'GET') {
    try {
      const posts = db.prepare(`
        SELECT * FROM blog_posts 
        ORDER BY created_at DESC
      `).all();
      
      res.status(200).json(posts);
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
      res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  }
  
  else if (req.method === 'POST') {
    const admin = getAdmin(req);
    if (!admin) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const { 
      title, 
      slug, 
      content, 
      excerpt = '', 
      featured_image = '', 
      is_published = false,
      is_programmatic = false,
      template_id = null,
      seo_title = '',
      seo_description = '',
      seo_keywords = ''
    } = req.body;
    
    if (!title || !slug || !content) {
      return res.status(400).json({ error: 'Title, slug, and content are required' });
    }

    try {
      // Check if slug already exists
      const existingPost = db.prepare('SELECT id FROM blog_posts WHERE slug = ?').get(slug);
      if (existingPost) {
        return res.status(400).json({ error: 'Slug already exists. Please choose a different slug.' });
      }

      const result = db.prepare(`
        INSERT INTO blog_posts (title, slug, content, excerpt, featured_image, is_published, is_programmatic, template_id, seo_title, seo_description, seo_keywords)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(title, slug, content, excerpt, featured_image, is_published, is_programmatic, template_id, seo_title, seo_description, seo_keywords);

      const newPost = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(result.lastInsertRowid);
      
      res.status(201).json({ success: true, post: newPost });
    } catch (error) {
      console.error('Failed to create blog post:', error);
      res.status(500).json({ error: 'Failed to create blog post' });
    }
  }
  
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}