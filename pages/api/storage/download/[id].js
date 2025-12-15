const db = require('../../../../lib/database');
const fs = require('fs');
const path = require('path');
const { checkFileAccess } = require('../../../../lib/file-security');

export default function handler(req, res) {
  const { id } = req.query;
  const isAdmin = req.session?.user?.role === 'admin';
  const user = req.session?.user;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Length', file.file_size);

    // Stream file to response
    const fileStream = fs.createReadStream(file.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    return res.status(500).json({ error: 'Failed to download file' });
  }
}
