import db from '../../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get published blog posts
    const posts = db.prepare(`
      SELECT 
        id,
        title,
        slug,
        excerpt,
        content,
        featured_image,
        created_at,
        updated_at
      FROM blog_posts
      WHERE is_published = 1
      ORDER BY created_at DESC
      LIMIT 50
    `).all();

    // Get site base URL from environment or default
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Generate RSS feed
    const rssItems = posts.map(post => {
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      const pubDate = new Date(post.created_at).toUTCString();
      
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${post.excerpt || post.content.substring(0, 200) + '...'}]]></description>
      <pubDate>${pubDate}</pubDate>
      ${post.featured_image ? `<enclosure url="${post.featured_image}" type="image/jpeg"/>` : ''}
    </item>`;
    }).join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Latest blog posts</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/blog/rss" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.status(200).send(rss);

  } catch (error) {
    console.error('Failed to generate RSS feed:', error);
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
}
