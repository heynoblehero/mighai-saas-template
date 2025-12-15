import db from '../../../lib/database.js';

// Initialize users table if it doesn't exist
const initializeTable = () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('Error initializing users table:', error);
  }
};

export default async function handler(req, res) {
  initializeTable();

  const workflowTrigger = getWorkflowTrigger();

  if (req.method === 'POST') {
    // Create user
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    try {
      const stmt = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
      const result = stmt.run(email, name || null);

      const user = {
        id: result.lastInsertRowid,
        email,
        name,
        created_at: new Date().toISOString()
      };


      res.status(201).json({
        success: true,
        user
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'User with this email already exists' });
      } else {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
      }
    }
  } else if (req.method === 'GET') {
    // Get users
    const { email } = req.query;

    try {
      if (email) {
        // Get specific user by email
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
      } else {
        // Get all users
        const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
        res.status(200).json(users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  } else if (req.method === 'PUT') {
    // Update user
    const { email, name, id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      const stmt = db.prepare('UPDATE users SET email = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const result = stmt.run(email, name, id);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);


      res.status(200).json({
        success: true,
        user: updatedUser
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  } else if (req.method === 'DELETE') {
    // Delete user
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const stmt = db.prepare('DELETE FROM users WHERE id = ?');
      stmt.run(id);


      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}