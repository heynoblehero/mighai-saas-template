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
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize tables if they don't exist
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS page_views (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          page_path TEXT NOT NULL,
          referrer TEXT,
          user_agent TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

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
    } catch (error) {
      // Tables might already exist
    }

    // Get blog post analytics
    const blogStats = db.prepare(`
      SELECT 
        COUNT(*) as total_posts,
        COUNT(CASE WHEN is_published = 1 THEN 1 END) as published_posts,
        COUNT(CASE WHEN is_programmatic = 1 THEN 1 END) as programmatic_posts,
        COUNT(CASE WHEN is_published = 1 AND is_programmatic = 1 THEN 1 END) as published_programmatic_posts
      FROM blog_posts
    `).get();

    // Get page view stats for last 30 days
    const pageViewStats = db.prepare(`
      SELECT 
        COUNT(*) as total_views,
        COUNT(DISTINCT ip_address) as unique_visitors
      FROM page_views 
      WHERE created_at >= datetime('now', '-30 days')
    `).get();

    // Get top blog posts by views
    const topBlogPosts = db.prepare(`
      SELECT 
        REPLACE(page_path, '/blog/', '') as slug,
        COUNT(*) as view_count
      FROM page_views 
      WHERE page_path LIKE '/blog/%' 
        AND page_path != '/blog' 
        AND created_at >= datetime('now', '-30 days')
      GROUP BY page_path
      ORDER BY view_count DESC
      LIMIT 10
    `).all();

    // Get blog post details for top posts
    const topPostsWithDetails = topBlogPosts.map(post => {
      const blogPost = db.prepare('SELECT title, is_programmatic FROM blog_posts WHERE slug = ?').get(post.slug);
      return {
        ...post,
        title: blogPost?.title || 'Unknown Post',
        is_programmatic: blogPost?.is_programmatic || false
      };
    });

    // Get daily view trends for last 30 days
    const dailyViews = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as views,
        COUNT(DISTINCT ip_address) as unique_visitors
      FROM page_views 
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();

    // Get referrer stats
    const topReferrers = db.prepare(`
      SELECT 
        CASE 
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%bing%' THEN 'Bing'
          WHEN referrer LIKE '%facebook%' THEN 'Facebook'
          WHEN referrer LIKE '%twitter%' THEN 'Twitter'
          ELSE 'Other'
        END as source,
        COUNT(*) as visits
      FROM page_views 
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY source
      ORDER BY visits DESC
    `).all();

    res.status(200).json({
      blogStats,
      pageViewStats,
      topBlogPosts: topPostsWithDetails,
      dailyViews,
      topReferrers
    });

  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}