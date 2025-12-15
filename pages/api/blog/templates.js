import db from '../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../lib/config';



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
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method === 'GET') {
    try {
      // Initialize blog_templates table if it doesn't exist
      try {
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
      } catch (initError) {
        console.error('Failed to create blog_templates table:', initError);
      }

      const templates = db.prepare(`
        SELECT * FROM blog_templates 
        ORDER BY created_at DESC
      `).all();
      
      res.status(200).json(templates);
    } catch (error) {
      console.error('Failed to fetch blog templates:', error);
      res.status(500).json({ error: 'Failed to fetch blog templates' });
    }
  }
  
  else if (req.method === 'POST') {
    const {
      name,
      title_pattern,
      content_template,
      excerpt_template = '',
      slug_pattern,
      seo_title_pattern = '',
      seo_description_pattern = '',
      seo_keywords_pattern = '',
      is_active = true
    } = req.body;
    
    if (!name || !title_pattern || !content_template || !slug_pattern) {
      return res.status(400).json({ 
        error: 'Name, title pattern, content template, and slug pattern are required' 
      });
    }

    try {
      const result = db.prepare(`
        INSERT INTO blog_templates (
          name, title_pattern, content_template, excerpt_template, 
          slug_pattern, seo_title_pattern, seo_description_pattern, 
          seo_keywords_pattern, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, title_pattern, content_template, excerpt_template,
        slug_pattern, seo_title_pattern, seo_description_pattern,
        seo_keywords_pattern, is_active
      );

      const newTemplate = db.prepare('SELECT * FROM blog_templates WHERE id = ?').get(result.lastInsertRowid);
      
      res.status(201).json({ success: true, template: newTemplate });
    } catch (error) {
      console.error('Failed to create blog template:', error);
      res.status(500).json({ error: 'Failed to create blog template' });
    }
  }
  
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}