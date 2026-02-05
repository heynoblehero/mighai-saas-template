import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import sqlite3 from 'sqlite3';

export const config = {
  api: {
    bodyParser: false,
  },
};

const CUSTOM_FRONTEND_DIR = path.join(process.cwd(), 'custom-frontend');
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

// Dangerous file extensions that shouldn't be in a static frontend
const DANGEROUS_EXTENSIONS = ['.php', '.py', '.rb', '.pl', '.cgi', '.sh', '.bash', '.exe', '.dll'];

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

function clearDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function validateFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { valid: false, reason: `Dangerous file type: ${ext}` };
  }
  return { valid: true };
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

    if (req.method !== 'POST') {
      db.close();
      return res.status(405).json({ error: 'Method not allowed' });
    }

    await ensureTable(db);

    // Parse multipart form
    const form = formidable({
      maxFileSize: MAX_SIZE,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    // formidable v3 returns arrays for files
    const fileArray = files.file;
    const uploadedFile = Array.isArray(fileArray) ? fileArray[0] : fileArray;
    if (!uploadedFile) {
      db.close();
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify it's a zip file
    const fileName = uploadedFile.originalFilename || uploadedFile.newFilename || '';
    if (!fileName.endsWith('.zip')) {
      db.close();
      return res.status(400).json({ error: 'Please upload a ZIP file' });
    }

    // Clear existing frontend directory
    clearDirectory(CUSTOM_FRONTEND_DIR);

    // Extract zip file
    const extractedFiles = [];
    let hasIndexHtml = false;

    await new Promise((resolve, reject) => {
      fs.createReadStream(uploadedFile.filepath)
        .pipe(unzipper.Parse())
        .on('entry', async (entry) => {
          const fileName = entry.path;
          const type = entry.type;

          // Skip __MACOSX and hidden files
          if (fileName.startsWith('__MACOSX') || fileName.startsWith('.')) {
            entry.autodrain();
            return;
          }

          // Normalize path - handle case where files are in a subdirectory
          let normalizedPath = fileName;

          // Check if all files are in a single directory (common with build tools)
          const parts = fileName.split('/');
          if (parts.length > 1 && parts[0] && !parts[0].includes('.')) {
            // Files are in a subdirectory, strip it
            normalizedPath = parts.slice(1).join('/');
          }

          if (!normalizedPath) {
            entry.autodrain();
            return;
          }

          const destPath = path.join(CUSTOM_FRONTEND_DIR, normalizedPath);

          // Validate file
          const validation = validateFile(normalizedPath);
          if (!validation.valid) {
            entry.autodrain();
            console.warn(`Skipping dangerous file: ${normalizedPath}`);
            return;
          }

          if (type === 'Directory') {
            fs.mkdirSync(destPath, { recursive: true });
            entry.autodrain();
          } else {
            // Ensure parent directory exists
            fs.mkdirSync(path.dirname(destPath), { recursive: true });

            entry.pipe(fs.createWriteStream(destPath));
            extractedFiles.push(normalizedPath);

            if (normalizedPath === 'index.html') {
              hasIndexHtml = true;
            }
          }
        })
        .on('close', resolve)
        .on('error', reject);
    });

    // Clean up temp file
    fs.unlinkSync(uploadedFile.filepath);

    // Check if index.html exists
    if (!hasIndexHtml) {
      // Check if files were in a subdirectory we didn't detect
      const dirContents = fs.readdirSync(CUSTOM_FRONTEND_DIR);
      if (dirContents.length === 1 && fs.statSync(path.join(CUSTOM_FRONTEND_DIR, dirContents[0])).isDirectory()) {
        // Move contents up one level
        const subDir = path.join(CUSTOM_FRONTEND_DIR, dirContents[0]);
        const subContents = fs.readdirSync(subDir);
        for (const item of subContents) {
          fs.renameSync(path.join(subDir, item), path.join(CUSTOM_FRONTEND_DIR, item));
        }
        fs.rmdirSync(subDir);
        hasIndexHtml = fs.existsSync(path.join(CUSTOM_FRONTEND_DIR, 'index.html'));
      }
    }

    if (!hasIndexHtml) {
      clearDirectory(CUSTOM_FRONTEND_DIR);
      db.close();
      return res.status(400).json({ error: 'No index.html found in the uploaded files' });
    }

    // Get stats
    const { totalSize, fileCount } = getDirectoryStats(CUSTOM_FRONTEND_DIR);

    // Update database
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO frontend_config (id, is_enabled, uploaded_at, total_size, file_count)
         VALUES (1, 1, datetime('now'), ?, ?)`,
        [totalSize, fileCount],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    db.close();

    res.json({
      success: true,
      message: `Frontend uploaded successfully`,
      stats: {
        fileCount,
        totalSize,
        hasIndexHtml: true,
      },
    });
  } catch (error) {
    db.close();
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
}
