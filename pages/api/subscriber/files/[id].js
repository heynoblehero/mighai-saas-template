// pages/api/subscriber/files/[id].js
// Download or delete subscriber's file with data isolation
import { withSubscriberAuth } from '../../../../lib/subscriber-auth';
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'site_builder.db');

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function handler(req, res) {
  const { id } = req.query;
  const { email } = req.subscriber;
  const db = new sqlite3.Database(dbPath);

  try {
    // Get file - CRITICAL: Ensure file belongs to this subscriber
    const file = await dbGet(db,
      'SELECT * FROM storage_files WHERE id = ? AND uploaded_by = ?',
      [id, email]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (req.method === 'GET') {
      // Download file
      const filePath = path.join(process.cwd(), file.file_path);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }

      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
      res.setHeader('Content-Length', file.file_size);

      fs.createReadStream(filePath).pipe(res);
    } else if (req.method === 'DELETE') {
      // Delete file from database
      await dbRun(db, 'DELETE FROM storage_files WHERE id = ?', [id]);

      // Delete file from disk
      const filePath = path.join(process.cwd(), file.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling file operation:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    db.close();
  }
}

export default withSubscriberAuth(handler);
