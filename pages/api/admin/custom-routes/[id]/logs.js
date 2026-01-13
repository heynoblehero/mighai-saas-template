import sqlite3 from 'sqlite3';
import path from 'path';
import { DATABASE_URL } from '@/lib/config';
import { withAdminAuth } from '@/lib/auth-middleware.js';

// Extract the database path from the DATABASE_URL
const dbPath = DATABASE_URL.replace('sqlite:', '');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { limit = 50, offset = 0 } = req.query;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = new sqlite3.Database(dbPath);

  // Get logs for this route
  db.all(
    `SELECT * FROM api_route_logs
     WHERE route_id = ?
     ORDER BY executed_at DESC
     LIMIT ? OFFSET ?`,
    [id, parseInt(limit), parseInt(offset)],
    (err, logs) => {
      if (err) {
        console.error('Error fetching logs:', err);
        db.close();
        return res.status(500).json({ error: 'Failed to fetch logs' });
      }

      // Get total count
      db.get(
        'SELECT COUNT(*) as total FROM api_route_logs WHERE route_id = ?',
        [id],
        (countErr, countResult) => {
          db.close();

          if (countErr) {
            console.error('Error counting logs:', countErr);
            return res.status(500).json({ error: 'Failed to count logs' });
          }

          // Parse JSON fields
          const parsedLogs = logs.map(log => ({
            ...log,
            request_headers: JSON.parse(log.request_headers || '{}'),
            request_body: JSON.parse(log.request_body || '{}'),
            request_query: JSON.parse(log.request_query || '{}'),
            request_params: JSON.parse(log.request_params || '{}'),
            response_data: log.response_data ? JSON.parse(log.response_data) : null,
            console_logs: JSON.parse(log.console_logs || '[]')
          }));

          res.status(200).json({
            logs: parsedLogs,
            total: countResult.total,
            limit: parseInt(limit),
            offset: parseInt(offset)
          });
        }
      );
    }
  );
}

export default withAdminAuth(handler);
