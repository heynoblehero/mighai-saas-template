// pages/api/subscriber/upload.js
// File upload endpoint for authenticated subscribers
// Only allows uploads to buckets with access_level = 'user'

import { getSubscriberFromRequest } from '../../../lib/subscriber-auth';
const db = require('../../../lib/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  generateSecureFilename,
  validateFile,
  performBasicVirusScan
} = require('../../../lib/file-security');

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucketSlug = req.query.bucket || 'default';
    const bucketDir = path.join(uploadsDir, bucketSlug);

    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }

    cb(null, bucketDir);
  },
  filename: (req, file, cb) => {
    const secureFilename = generateSecureFilename(file.originalname);
    cb(null, secureFilename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (will be further restricted by bucket config)
  }
});

// Disable Next.js body parsing for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate subscriber
  const { user, error } = await getSubscriberFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: error || 'Authentication required' });
  }

  const bucketSlug = req.query.bucket;

  if (!bucketSlug) {
    return res.status(400).json({ error: 'Bucket slug is required (use ?bucket=<slug>)' });
  }

  // Get bucket configuration
  const bucket = db.prepare('SELECT * FROM storage_buckets WHERE slug = ?').get(bucketSlug);

  if (!bucket) {
    return res.status(404).json({ error: 'Bucket not found' });
  }

  // CRITICAL: Subscribers can ONLY upload to 'user' level buckets
  if (bucket.access_level !== 'user') {
    return res.status(403).json({
      error: 'Access denied. This bucket is not accessible to subscribers.',
      hint: 'Subscribers can only upload to buckets with access_level = "user"'
    });
  }

  // Use multer middleware
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(500).json({ error: 'File upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use form-data with field name "file"' });
    }

    try {
      // Validate file against bucket configuration
      const validation = validateFile(req.file, bucket);

      if (!validation.valid) {
        // Delete uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(415).json({ error: validation.errors.join(', ') });
      }

      // Perform basic virus scan
      const scanResult = await performBasicVirusScan(req.file.path);

      if (!scanResult.safe) {
        // Delete suspicious file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'File failed security scan' });
      }

      // Save file metadata to database with subscriber's email
      const stmt = db.prepare(`
        INSERT INTO storage_files (
          bucket_id, original_name, stored_name, file_path, mime_type,
          file_size, uploaded_by, access_level, virus_scanned, scan_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        bucket.id,
        req.file.originalname,
        req.file.filename,
        req.file.path,
        req.file.mimetype,
        req.file.size,
        user.email, // CRITICAL: Set to subscriber's email for data isolation
        bucket.access_level,
        1,
        scanResult.status
      );

      const fileRecord = db.prepare('SELECT * FROM storage_files WHERE id = ?').get(result.lastInsertRowid);

      return res.status(201).json({
        success: true,
        file: {
          id: fileRecord.id,
          name: fileRecord.original_name,
          mimeType: fileRecord.mime_type,
          size: fileRecord.file_size,
          downloadUrl: `/api/subscriber/files/${fileRecord.id}`,
          uploadedAt: fileRecord.created_at,
          bucket: bucketSlug
        }
      });
    } catch (error) {
      console.error('Error saving subscriber file:', error);

      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({ error: 'Failed to save file' });
    }
  });
}

export default handler;
