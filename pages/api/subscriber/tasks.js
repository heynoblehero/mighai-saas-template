// pages/api/subscriber/tasks.js
// List subscriber's generated content/tasks with data isolation
import { withSubscriberAuth } from '../../../lib/subscriber-auth';
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'site_builder.db');

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

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

  const { id } = req.subscriber;
  const { status, limit = 50, offset = 0 } = req.query;
  const db = new sqlite3.Database(dbPath);

  try {
    let query = `
      SELECT id, task_type, task_name, status, input_data, output_data,
             created_at, completed_at, error_message
      FROM customer_tasks
      WHERE user_id = ?
    `;
    const params = [id];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const tasks = await dbAll(db, query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM customer_tasks WHERE user_id = ?';
    const countParams = [id];
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const countResult = await dbGet(db, countQuery, countParams);

    res.json({
      tasks: tasks.map(t => ({
        id: t.id,
        type: t.task_type,
        name: t.task_name,
        status: t.status,
        input: t.input_data ? JSON.parse(t.input_data) : null,
        output: t.output_data ? JSON.parse(t.output_data) : null,
        createdAt: t.created_at,
        completedAt: t.completed_at,
        error: t.error_message
      })),
      pagination: {
        total: countResult?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching subscriber tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    db.close();
  }
}

export default withSubscriberAuth(handler);
