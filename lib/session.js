import sqlite3 from 'sqlite3';
import path from 'path';
import crypto from 'crypto';

const db3 = sqlite3.verbose();
const dbPath = path.join(process.cwd(), 'site_builder.db');

// Initialize sessions table
export function initSessionsTable() {
  const db = new db3.Database(dbPath);
  
  db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_data TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
  
  db.close();
}

// Create a new session
export async function createSession(user) {
  return new Promise((resolve, reject) => {
    const db = new db3.Database(dbPath);
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    db.run(
      'INSERT INTO user_sessions (id, user_id, user_data, expires_at) VALUES (?, ?, ?, ?)',
      [sessionId, user.id, JSON.stringify(user), expiresAt.toISOString()],
      function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(sessionId);
        }
      }
    );
  });
}

// Get session data
export async function getSession(sessionId) {
  return new Promise((resolve, reject) => {
    const db = new db3.Database(dbPath);
    
    db.get(
      'SELECT * FROM user_sessions WHERE id = ? AND expires_at > datetime("now")',
      [sessionId],
      (err, row) => {
        db.close();
        if (err) {
          reject(err);
        } else if (row) {
          resolve({
            id: row.id,
            user: JSON.parse(row.user_data),
            expiresAt: row.expires_at
          });
        } else {
          resolve(null);
        }
      }
    );
  });
}

// Delete session
export async function deleteSession(sessionId) {
  return new Promise((resolve, reject) => {
    const db = new db3.Database(dbPath);
    
    db.run(
      'DELETE FROM user_sessions WHERE id = ?',
      [sessionId],
      function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

// Clean up expired sessions
export async function cleanupExpiredSessions() {
  return new Promise((resolve, reject) => {
    const db = new db3.Database(dbPath);
    
    db.run(
      'DELETE FROM user_sessions WHERE expires_at <= datetime("now")',
      function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

