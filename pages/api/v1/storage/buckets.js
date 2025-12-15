const db = require('../../../../lib/database');
const { initializeStorageTables } = require('../../../../lib/storage-init');

// Initialize tables on first load
initializeStorageTables();

/**
 * API v1 - Storage Buckets Management
 *
 * Requires Basic Auth with admin username and password
 * Admin users only
 */

// Verify admin credentials from session or Basic Auth
function verifyApiAccess(req) {
  // Check if user is authenticated admin via session
  if (req.session?.user?.role === 'admin') {
    return { authorized: true, user: req.session.user };
  }

  // Check for Basic Auth header
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return { authorized: false, error: 'Missing Authorization header. Use Basic Auth with admin credentials.' };
  }

  try {
    // Decode Basic Auth credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (!username || !password) {
      return { authorized: false, error: 'Invalid Authorization format' };
    }

    // Verify credentials against database
    const bcrypt = require('bcryptjs');
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND role = ?').get(username, 'admin');

    if (!user) {
      return { authorized: false, error: 'Invalid admin credentials' };
    }

    // Verify password
    const passwordMatch = bcrypt.compareSync(password, user.password);

    if (!passwordMatch) {
      return { authorized: false, error: 'Invalid admin credentials' };
    }

    return { authorized: true, user: { role: 'admin', username: user.username, email: user.email } };
  } catch (error) {
    console.error('Auth error:', error);
    return { authorized: false, error: 'Authentication failed' };
  }
}

export default function handler(req, res) {
  const auth = verifyApiAccess(req);

  if (!auth.authorized) {
    return res.status(401).json({
      error: auth.error,
      message: 'API authentication required. Use Basic Auth with admin username and password.'
    });
  }

  if (req.method === 'GET') {
    // List all buckets
    try {
      const buckets = db.prepare(`
        SELECT
          id, name, slug, description, allowed_file_types,
          max_file_size, access_level, created_at, updated_at,
          (SELECT COUNT(*) FROM storage_files WHERE bucket_id = storage_buckets.id) as file_count
        FROM storage_buckets
        ORDER BY created_at DESC
      `).all();

      return res.status(200).json({
        success: true,
        data: buckets,
        count: buckets.length
      });
    } catch (error) {
      console.error('Error fetching buckets:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch buckets',
        message: error.message
      });
    }
  }

  if (req.method === 'POST') {
    // Create new bucket
    const { name, description, allowed_file_types, max_file_size, access_level } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Bucket name is required'
      });
    }

    try {
      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const stmt = db.prepare(`
        INSERT INTO storage_buckets (name, slug, description, allowed_file_types, max_file_size, access_level)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        name,
        slug,
        description || null,
        allowed_file_types ? JSON.stringify(allowed_file_types) : null,
        max_file_size || 10485760, // 10MB default
        access_level || 'private'
      );

      const bucket = db.prepare('SELECT * FROM storage_buckets WHERE id = ?').get(result.lastInsertRowid);

      return res.status(201).json({
        success: true,
        message: 'Bucket created successfully',
        data: {
          id: bucket.id,
          name: bucket.name,
          slug: bucket.slug,
          description: bucket.description,
          allowed_file_types: bucket.allowed_file_types ? JSON.parse(bucket.allowed_file_types) : null,
          max_file_size: bucket.max_file_size,
          access_level: bucket.access_level,
          created_at: bucket.created_at,
          upload_endpoint: `/api/storage/upload?bucket=${bucket.slug}`,
          files_endpoint: `/api/storage/files?bucket=${bucket.slug}`
        }
      });
    } catch (error) {
      console.error('Error creating bucket:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          success: false,
          error: 'Bucket already exists',
          message: 'A bucket with this name already exists'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to create bucket',
        message: error.message
      });
    }
  }

  if (req.method === 'PUT') {
    // Update bucket
    const { id, name, description, allowed_file_types, max_file_size, access_level } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Bucket ID is required'
      });
    }

    try {
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        updates.push('slug = ?');
        values.push(slug);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (allowed_file_types !== undefined) {
        updates.push('allowed_file_types = ?');
        values.push(JSON.stringify(allowed_file_types));
      }
      if (max_file_size !== undefined) {
        updates.push('max_file_size = ?');
        values.push(max_file_size);
      }
      if (access_level !== undefined) {
        updates.push('access_level = ?');
        values.push(access_level);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const stmt = db.prepare(`
        UPDATE storage_buckets
        SET ${updates.join(', ')}
        WHERE id = ?
      `);

      stmt.run(...values);

      const bucket = db.prepare('SELECT * FROM storage_buckets WHERE id = ?').get(id);

      return res.status(200).json({
        success: true,
        message: 'Bucket updated successfully',
        data: bucket
      });
    } catch (error) {
      console.error('Error updating bucket:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          success: false,
          error: 'Bucket name conflict',
          message: 'A bucket with this name already exists'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to update bucket',
        message: error.message
      });
    }
  }

  if (req.method === 'DELETE') {
    // Delete bucket
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Bucket ID is required'
      });
    }

    try {
      // Check if bucket has files
      const fileCount = db.prepare('SELECT COUNT(*) as count FROM storage_files WHERE bucket_id = ?').get(id);

      if (fileCount.count > 0) {
        return res.status(400).json({
          success: false,
          error: 'Bucket not empty',
          message: `Cannot delete bucket with ${fileCount.count} files. Delete all files first.`
        });
      }

      const stmt = db.prepare('DELETE FROM storage_buckets WHERE id = ?');
      const result = stmt.run(id);

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Bucket not found',
          message: 'No bucket found with the specified ID'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Bucket deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting bucket:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete bucket',
        message: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
    message: `HTTP ${req.method} is not supported on this endpoint`
  });
}
