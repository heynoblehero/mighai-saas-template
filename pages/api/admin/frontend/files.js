import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import archiver from 'archiver';

const CUSTOM_FRONTEND_DIR = path.join(process.cwd(), 'custom-frontend');

function getDb() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'site_builder.db');
  return new sqlite3.Database(dbPath);
}

function ensureTable(db) {
  return new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS frontend_config (
      id INTEGER PRIMARY KEY,
      is_enabled BOOLEAN DEFAULT 1,
      uploaded_at DATETIME,
      total_size INTEGER DEFAULT 0,
      file_count INTEGER DEFAULT 0
    )`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getFileTree(dir, basePath = '') {
  const tree = [];

  if (!fs.existsSync(dir)) {
    return tree;
  }

  const items = fs.readdirSync(dir).sort();

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const relativePath = basePath ? `${basePath}/${item}` : item;
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      tree.push({
        name: item,
        path: relativePath,
        type: 'directory',
        children: getFileTree(itemPath, relativePath),
      });
    } else {
      tree.push({
        name: item,
        path: relativePath,
        type: 'file',
        size: stat.size,
        modified: stat.mtime,
      });
    }
  }

  return tree;
}

function getDirectoryStats(dir) {
  let totalSize = 0;
  let fileCount = 0;

  function walkDir(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        walkDir(itemPath);
      } else {
        totalSize += stat.size;
        fileCount++;
      }
    }
  }

  walkDir(dir);
  return { totalSize, fileCount };
}

export default async function handler(req, res) {
  // Check authentication
  if (!req.session?.passport?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getDb();

  try {
    // Get user and verify admin
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [req.session.passport.user], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user || user.role !== 'admin') {
      db.close();
      return res.status(403).json({ error: 'Admin access required' });
    }

    await ensureTable(db);

    if (req.method === 'GET') {
      // Check for download parameter
      if (req.query.download === 'true') {
        if (!fs.existsSync(CUSTOM_FRONTEND_DIR)) {
          db.close();
          return res.status(404).json({ error: 'No frontend files found' });
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=frontend-backup.zip');

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => {
          throw err;
        });
        archive.pipe(res);
        archive.directory(CUSTOM_FRONTEND_DIR, false);
        await archive.finalize();

        db.close();
        return;
      }

      // Get file tree and config
      const config = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM frontend_config WHERE id = 1', (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      const exists = fs.existsSync(CUSTOM_FRONTEND_DIR) &&
                    fs.existsSync(path.join(CUSTOM_FRONTEND_DIR, 'index.html'));

      const files = exists ? getFileTree(CUSTOM_FRONTEND_DIR) : [];
      const stats = exists ? getDirectoryStats(CUSTOM_FRONTEND_DIR) : { totalSize: 0, fileCount: 0 };

      db.close();

      res.json({
        exists,
        isEnabled: config?.is_enabled ?? false,
        uploadedAt: config?.uploaded_at,
        files,
        stats,
      });
    } else if (req.method === 'DELETE') {
      // Delete all frontend files
      if (fs.existsSync(CUSTOM_FRONTEND_DIR)) {
        fs.rmSync(CUSTOM_FRONTEND_DIR, { recursive: true, force: true });
      }

      // Update database
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE frontend_config SET is_enabled = 0, total_size = 0, file_count = 0 WHERE id = 1`,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      db.close();
      res.json({ success: true, message: 'Frontend files deleted' });
    } else if (req.method === 'PUT') {
      // Toggle enabled status
      const { enabled } = req.body;

      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE frontend_config SET is_enabled = ? WHERE id = 1`,
          [enabled ? 1 : 0],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      db.close();
      res.json({ success: true, enabled });
    } else {
      db.close();
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    db.close();
    console.error('Frontend files error:', error);
    res.status(500).json({ error: error.message });
  }
}
