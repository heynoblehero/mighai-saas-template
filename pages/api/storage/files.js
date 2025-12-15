const db = require('../../../lib/database');
const fs = require('fs');
const { checkFileAccess } = require('../../../lib/file-security');

export default function handler(req, res) {
  const { bucket } = req.query;
  const isAdmin = req.session?.user?.role === 'admin';
  const user = req.session?.user;

  if (req.method === 'GET') {
    // List files in bucket
    try {
      let query = `
        SELECT
          sf.*,
          sb.name as bucket_name,
          sb.slug as bucket_slug,
          sb.access_level as bucket_access_level
        FROM storage_files sf
        JOIN storage_buckets sb ON sf.bucket_id = sb.id
      `;

      const params = [];

      if (bucket) {
        query += ' WHERE sb.slug = ?';
        params.push(bucket);
      }

      query += ' ORDER BY sf.created_at DESC';

      const files = db.prepare(query).all(...params);

      // Filter files based on access permissions
      const accessibleFiles = files.filter(file =>
        checkFileAccess(file, user, isAdmin)
      ).map(file => ({
        id: file.id,
        originalName: file.original_name,
        mimeType: file.mime_type,
        size: file.file_size,
        uploadedBy: file.uploaded_by,
        accessLevel: file.access_level,
        bucketName: file.bucket_name,
        bucketSlug: file.bucket_slug,
        createdAt: file.created_at,
        url: `/api/storage/files/${file.id}/${file.original_name}`,
        downloadUrl: `/api/storage/download/${file.id}`
      }));

      return res.status(200).json(accessibleFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      return res.status(500).json({ error: 'Failed to fetch files' });
    }
  }

  if (req.method === 'DELETE') {
    // Delete file
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    try {
      const file = db.prepare('SELECT * FROM storage_files WHERE id = ?').get(id);

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check access permissions
      if (!checkFileAccess(file, user, isAdmin)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Delete file from filesystem
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }

      // Delete from database
      db.prepare('DELETE FROM storage_files WHERE id = ?').run(id);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      return res.status(500).json({ error: 'Failed to delete file' });
    }
  }

  if (req.method === 'PUT') {
    // Update file metadata (access level, etc.)
    const { id, access_level, metadata } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    try {
      const file = db.prepare('SELECT * FROM storage_files WHERE id = ?').get(id);

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Only admins or file owner can update
      if (!isAdmin && file.uploaded_by !== user?.email) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updates = [];
      const values = [];

      if (access_level !== undefined) {
        updates.push('access_level = ?');
        values.push(access_level);
      }

      if (metadata !== undefined) {
        updates.push('metadata = ?');
        values.push(JSON.stringify(metadata));
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.prepare(`
        UPDATE storage_files
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);

      const updatedFile = db.prepare('SELECT * FROM storage_files WHERE id = ?').get(id);

      return res.status(200).json({
        id: updatedFile.id,
        originalName: updatedFile.original_name,
        accessLevel: updatedFile.access_level,
        metadata: updatedFile.metadata ? JSON.parse(updatedFile.metadata) : null
      });
    } catch (error) {
      console.error('Error updating file:', error);
      return res.status(500).json({ error: 'Failed to update file' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
