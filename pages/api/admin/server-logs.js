import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.NODE_ENV === 'production'
  ? '/tmp/site_builder.db'
  : path.join(process.cwd(), '..', 'mighai (copy)', 'site_builder.db');

export default async function handler(req, res) {
  if (!req.session || !req.session.passport || !req.session.passport.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = new sqlite3.Database(dbPath);

  if (req.method === 'GET') {
    const { log_type, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM server_logs WHERE 1=1';
    const params = [];

    if (log_type) {
      query += ' AND log_type = ?';
      params.push(log_type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, logs) => {
      if (err) {
        console.error('Error fetching server logs:', err);
        db.close();
        return res.status(500).json({ error: 'Failed to fetch logs' });
      }

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM server_logs WHERE 1=1';
      const countParams = [];

      if (log_type) {
        countQuery += ' AND log_type = ?';
        countParams.push(log_type);
      }

      db.get(countQuery, countParams, (countErr, countResult) => {
        db.close();

        if (countErr) {
          console.error('Error counting server logs:', countErr);
          return res.status(500).json({ error: 'Failed to count logs' });
        }

        const parsedLogs = logs.map(log => ({
          ...log,
          context: log.context ? JSON.parse(log.context) : null
        }));

        res.status(200).json({
          logs: parsedLogs,
          total: countResult.total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        });
      });
    });

  } else if (req.method === 'POST') {
    // Add a server log
    const { log_type, message, context, source } = req.body;

    if (!log_type || !message) {
      db.close();
      return res.status(400).json({ error: 'log_type and message are required' });
    }

    const validTypes = ['info', 'error', 'warning', 'debug'];
    if (!validTypes.includes(log_type)) {
      db.close();
      return res.status(400).json({ error: 'Invalid log_type' });
    }

    db.run(
      `INSERT INTO server_logs (log_type, message, context, source)
       VALUES (?, ?, ?, ?)`,
      [log_type, message, JSON.stringify(context || {}), source || 'system'],
      function(err) {
        db.close();

        if (err) {
          console.error('Error creating server log:', err);
          return res.status(500).json({ error: 'Failed to create log' });
        }

        res.status(201).json({
          success: true,
          id: this.lastID
        });
      }
    );

  } else {
    db.close();
    res.status(405).json({ error: 'Method not allowed' });
  }
}
