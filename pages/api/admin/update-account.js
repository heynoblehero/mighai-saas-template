const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { withAdminAuth } = require('../../../lib/auth-middleware');
const { logSecurityEvent } = require('../../../lib/security');

const dbPath = path.join(process.cwd(), 'site_builder.db');

/**
 * Update admin account information (username, email, password)
 * Requires current password for verification
 * POST /api/admin/update-account
 */
async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user.id; // From withAdminAuth middleware
  const {
    currentPassword,
    newUsername,
    newEmail,
    newPassword,
  } = req.body;

  // Validation: Current password is required for any change
  if (!currentPassword) {
    return res.status(400).json({
      success: false,
      error: 'Current password is required to make changes'
    });
  }

  // Validate at least one field is being updated
  if (!newUsername && !newEmail && !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Please provide at least one field to update'
    });
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Step 1: Verify current password
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      await logSecurityEvent('account_update_failed', 'medium', {
        userId: user.id,
        email: user.email,
        reason: 'Invalid current password'
      });

      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Step 2: Validate new password if provided
    if (newPassword) {
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 8 characters long'
        });
      }

      // Check password complexity (at least one letter and one number)
      const hasLetter = /[a-zA-Z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);

      if (!hasLetter || !hasNumber) {
        return res.status(400).json({
          success: false,
          error: 'Password must contain at least one letter and one number'
        });
      }
    }

    // Step 3: Check username uniqueness if changing
    if (newUsername && newUsername !== user.username) {
      const existingUsername = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM users WHERE username = ? AND id != ?',
          [newUsername, userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken'
        });
      }
    }

    // Step 4: Check email uniqueness if changing
    if (newEmail && newEmail !== user.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      const existingEmail = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [newEmail, userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use'
        });
      }
    }

    // Step 5: Build update query dynamically
    const updates = [];
    const params = [];

    if (newUsername && newUsername !== user.username) {
      updates.push('username = ?');
      params.push(newUsername);
    }

    if (newEmail && newEmail !== user.email) {
      updates.push('email = ?');
      params.push(newEmail);
    }

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No changes detected'
      });
    }

    params.push(userId);

    // Step 6: Execute update in transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          params,
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });
      throw error;
    }

    // Step 7: Log security event
    const changes = [];
    if (newUsername && newUsername !== user.username) changes.push('username');
    if (newEmail && newEmail !== user.email) changes.push('email');
    if (newPassword) changes.push('password');

    await logSecurityEvent('account_updated', 'low', {
      userId: user.id,
      email: user.email,
      changedFields: changes.join(', ')
    });

    // Step 8: Invalidate all sessions if password changed
    if (newPassword) {
      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM user_sessions WHERE user_id = ?',
          [userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await logSecurityEvent('sessions_invalidated', 'medium', {
        userId: user.id,
        email: user.email,
        reason: 'Password changed'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      passwordChanged: !!newPassword,
      changedFields: changes
    });

  } catch (error) {
    console.error('Account update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update account'
    });
  } finally {
    db.close();
  }
}

module.exports = withAdminAuth(handler);
