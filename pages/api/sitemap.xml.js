import db from '../../lib/database';

function generateSiteMap(posts, plans) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yoursite.com';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Static pages -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/subscribe/signup</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- Blog posts -->
  ${posts
    .map((post) => {
      return `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at || post.created_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${post.featured_image ? `
    <image:image>
      <image:loc>${post.featured_image}</image:loc>
      <image:title>${post.title}</image:title>
    </image:image>` : ''}
  </url>`;
    })
    .join('')}
  
  <!-- Pricing/Plans -->
  ${plans
    .map((plan) => {
      return `
  <url>
    <loc>${baseUrl}/dashboard/upgrade?plan=${plan.id}</loc>
    <lastmod>${new Date(plan.updated_at).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join('')}
</urlset>`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
    } catch (error) {
      // Table might already exist
    }

    // Get all published blog posts
    const posts = db.prepare(`
      SELECT slug, title, featured_image, created_at, updated_at 
      FROM blog_posts 
      WHERE is_published = TRUE 
      ORDER BY created_at DESC
    `).all();

    // Get all active plans
    const plans = db.prepare(`
      SELECT id, updated_at 
      FROM plans 
      WHERE is_active = 1
    `).all();

    const sitemap = generateSiteMap(posts, plans);

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Failed to generate sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
}