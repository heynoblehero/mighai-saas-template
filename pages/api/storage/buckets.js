const db = require('../../../lib/database');
const { initializeStorageTables } = require('../../../lib/storage-init');

// Initialize tables on first load
initializeStorageTables();

export default function handler(req, res) {
  // Check if user is authenticated
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const isAdmin = req.session.user.role === 'admin';

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

      return res.status(200).json(buckets);
    } catch (error) {
      console.error('Error fetching buckets:', error);
      return res.status(500).json({ error: 'Failed to fetch buckets' });
    }
  }

  // Only admins can create/update/delete buckets
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  if (req.method === 'POST') {
    // Create new bucket
    const { name, description, allowed_file_types, max_file_size, access_level } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Bucket name is required' });
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

      return res.status(201).json(bucket);
    } catch (error) {
      console.error('Error creating bucket:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Bucket with this name already exists' });
      }
      return res.status(500).json({ error: 'Failed to create bucket' });
    }
  }

  if (req.method === 'PUT') {
    // Update bucket
    const { id, name, description, allowed_file_types, max_file_size, access_level } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Bucket ID is required' });
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

      return res.status(200).json(bucket);
    } catch (error) {
      console.error('Error updating bucket:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Bucket with this name already exists' });
      }
      return res.status(500).json({ error: 'Failed to update bucket' });
    }
  }

  if (req.method === 'DELETE') {
    // Delete bucket
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Bucket ID is required' });
    }

    try {
      // Check if bucket has files
      const fileCount = db.prepare('SELECT COUNT(*) as count FROM storage_files WHERE bucket_id = ?').get(id);

      if (fileCount.count > 0) {
        return res.status(400).json({ error: 'Cannot delete bucket with files. Delete all files first.' });
      }

      const stmt = db.prepare('DELETE FROM storage_buckets WHERE id = ?');
      stmt.run(id);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting bucket:', error);
      return res.status(500).json({ error: 'Failed to delete bucket' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
