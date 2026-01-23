// pages/api/subscriber/files.js
// List subscriber's files with data isolation
import { withSubscriberAuth } from '../../../lib/subscriber-auth';
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'site_builder.db');

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.subscriber;
  const { bucket, limit = 100, offset = 0 } = req.query;
  const db = new sqlite3.Database(dbPath);

  try {
    let query = `
      SELECT f.id, f.original_name, f.file_path, f.file_size, f.mime_type,
             f.created_at, b.name as bucket_name, b.slug as bucket_slug
      FROM storage_files f
      JOIN storage_buckets b ON f.bucket_id = b.id
      WHERE f.uploaded_by = ?
    `;
    const params = [email];

    if (bucket) {
      query += ' AND b.slug = ?';
      params.push(bucket);
    }

    query += ' ORDER BY f.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const files = await dbAll(db, query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM storage_files f
      JOIN storage_buckets b ON f.bucket_id = b.id
      WHERE f.uploaded_by = ?
    `;
    const countParams = [email];
    if (bucket) {
      countQuery += ' AND b.slug = ?';
      countParams.push(bucket);
    }

    const countResult = await new Promise((resolve, reject) => {
      db.get(countQuery, countParams, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      files: files.map(f => ({
        id: f.id,
        name: f.original_name,
        size: f.file_size,
        mimeType: f.mime_type,
        bucket: f.bucket_name,
        bucketSlug: f.bucket_slug,
        createdAt: f.created_at,
        downloadUrl: `/api/subscriber/files/${f.id}`
      })),
      pagination: {
        total: countResult?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching subscriber files:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    db.close();
  }
}

export default withSubscriberAuth(handler);
