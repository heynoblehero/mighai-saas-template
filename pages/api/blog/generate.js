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

function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function processTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
}

function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = db.prepare('SELECT id FROM blog_posts WHERE slug = ?').get(slug);
    if (!existing) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method === 'POST') {
    const { template_id, data_array, preview_only = false } = req.body;
    
    if (!template_id || !data_array || !Array.isArray(data_array)) {
      return res.status(400).json({ 
        error: 'Template ID and data array are required' 
      });
    }

    try {
      // Get template
      const template = db.prepare('SELECT * FROM blog_templates WHERE id = ?').get(template_id);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const generatedPosts = [];
      const errors = [];

      for (let i = 0; i < data_array.length; i++) {
        const data = data_array[i];
        
        try {
          // Process templates with data
          const title = processTemplate(template.title_pattern, data);
          const content = processTemplate(template.content_template, data);
          const excerpt = template.excerpt_template ? processTemplate(template.excerpt_template, data) : '';
          const seo_title = template.seo_title_pattern ? processTemplate(template.seo_title_pattern, data) : title;
          const seo_description = template.seo_description_pattern ? processTemplate(template.seo_description_pattern, data) : excerpt;
          const seo_keywords = template.seo_keywords_pattern ? processTemplate(template.seo_keywords_pattern, data) : '';
          
          // Generate slug
          const baseSlug = generateSlug(processTemplate(template.slug_pattern, data));
          const slug = preview_only ? baseSlug : ensureUniqueSlug(baseSlug);

          const postData = {
            title,
            slug,
            content,
            excerpt,
            seo_title,
            seo_description,
            seo_keywords,
            is_programmatic: true,
            template_id: template_id,
            is_published: false
          };

          if (preview_only) {
            generatedPosts.push(postData);
          } else {
            // Insert into database
            const result = db.prepare(`
              INSERT INTO blog_posts (
                title, slug, content, excerpt, featured_image, 
                is_published, is_programmatic, template_id, 
                seo_title, seo_description, seo_keywords
              )
              VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)
            `).run(
              title, slug, content, excerpt, false, true, template_id,
              seo_title, seo_description, seo_keywords
            );

            const newPost = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(result.lastInsertRowid);
            generatedPosts.push(newPost);
          }
        } catch (error) {
          errors.push({
            row: i + 1,
            data: data,
            error: error.message
          });
        }
      }

      res.status(200).json({
        success: true,
        generated: generatedPosts.length,
        posts: generatedPosts,
        errors: errors,
        preview: preview_only
      });

    } catch (error) {
      console.error('Failed to generate blog posts:', error);
      res.status(500).json({ error: 'Failed to generate blog posts' });
    }
  }
  
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}