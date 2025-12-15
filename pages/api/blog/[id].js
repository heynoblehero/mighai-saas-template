import db from '../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../lib/config';

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
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(id);
      
      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      
      res.status(200).json(post);
    } catch (error) {
      console.error('Failed to fetch blog post:', error);
      res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  }
  
  else if (req.method === 'PUT') {
    const admin = getAdmin(req);
    if (!admin) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const { title, slug, content, excerpt = '', featured_image = '', is_published = false } = req.body;
    
    if (!title || !slug || !content) {
      return res.status(400).json({ error: 'Title, slug, and content are required' });
    }

    try {
      // Check if post exists
      const existingPost = db.prepare('SELECT id FROM blog_posts WHERE id = ?').get(id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      // Check if slug already exists (excluding current post)
      const duplicateSlug = db.prepare('SELECT id FROM blog_posts WHERE slug = ? AND id != ?').get(slug, id);
      if (duplicateSlug) {
        return res.status(400).json({ error: 'Slug already exists. Please choose a different slug.' });
      }

      db.prepare(`
        UPDATE blog_posts 
        SET title = ?, slug = ?, content = ?, excerpt = ?, featured_image = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title, slug, content, excerpt, featured_image, is_published, id);

      const updatedPost = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(id);
      
      res.status(200).json({ success: true, post: updatedPost });
    } catch (error) {
      console.error('Failed to update blog post:', error);
      res.status(500).json({ error: 'Failed to update blog post' });
    }
  }
  
  else if (req.method === 'DELETE') {
    const admin = getAdmin(req);
    if (!admin) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    try {
      const existingPost = db.prepare('SELECT id FROM blog_posts WHERE id = ?').get(id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      db.prepare('DELETE FROM blog_posts WHERE id = ?').run(id);
      
      res.status(200).json({ success: true, message: 'Blog post deleted successfully' });
    } catch (error) {
      console.error('Failed to delete blog post:', error);
      res.status(500).json({ error: 'Failed to delete blog post' });
    }
  }
  
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}