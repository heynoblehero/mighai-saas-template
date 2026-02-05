const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { withAdminAuth } = require('../../../lib/auth-middleware');

const dbPath = path.join(process.cwd(), 'site_builder.db');

async function handler(req, res) {
  // User is already authenticated by withAdminAuth middleware
  const userId = req.user.id;
  const db = new sqlite3.Database(dbPath);

  try {
    if (req.method === 'GET') {
      // Get 2FA settings for the current admin
      const settings = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM admin_2fa_settings WHERE user_id = ?',
          [userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!settings) {
        // Return default settings if none exist
        return res.status(200).json({
          success: true,
          settings: {
            is_enabled: false,
            method: 'email',
            telegram_bot_token: null,
            telegram_chat_id: null,
            require_on_login: true,
            require_on_database_changes: true,
            require_on_page_changes: true
          }
        });
      }

      // Don't expose the bot token in the response
      const { telegram_bot_token, ...safeSettings } = settings;
      res.status(200).json({
        success: true,
        settings: {
          ...safeSettings,
          telegram_bot_token_configured: !!telegram_bot_token
        }
      });

    } else if (req.method === 'POST' || req.method === 'PUT') {
      const {
        is_enabled,
        method,
        telegram_bot_token,
        telegram_chat_id,
        require_on_login,
        require_on_database_changes,
        require_on_page_changes
      } = req.body;

      // Validate Telegram settings if method includes telegram
      if ((method === 'telegram' || method === 'both') && is_enabled) {
        if (!telegram_bot_token || !telegram_chat_id) {
          return res.status(400).json({
            success: false,
            error: 'Telegram bot token and chat ID are required for Telegram 2FA'
          });
        }

        // Test Telegram bot connection
        try {
          const testResponse = await fetch(`https://api.telegram.org/bot${telegram_bot_token}/getMe`);
          const testData = await testResponse.json();

          if (!testData.ok) {
            return res.status(400).json({
              success: false,
              error: 'Invalid Telegram bot token'
            });
          }
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Failed to verify Telegram bot token'
          });
        }
      }

      // Check if settings exist
      const existingSettings = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM admin_2fa_settings WHERE user_id = ?',
          [userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingSettings) {
        // Update existing settings
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE admin_2fa_settings
             SET is_enabled = ?,
                 method = ?,
                 telegram_bot_token = ?,
                 telegram_chat_id = ?,
                 require_on_login = ?,
                 require_on_database_changes = ?,
                 require_on_page_changes = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ?`,
            [
              is_enabled ? 1 : 0,
              method,
              telegram_bot_token || null,
              telegram_chat_id || null,
              require_on_login !== false ? 1 : 0,
              require_on_database_changes !== false ? 1 : 0,
              require_on_page_changes !== false ? 1 : 0,
              userId
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      } else {
        // Insert new settings
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO admin_2fa_settings (
              user_id, is_enabled, method, telegram_bot_token, telegram_chat_id,
              require_on_login, require_on_database_changes, require_on_page_changes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              is_enabled ? 1 : 0,
              method,
              telegram_bot_token || null,
              telegram_chat_id || null,
              require_on_login !== false ? 1 : 0,
              require_on_database_changes !== false ? 1 : 0,
              require_on_page_changes !== false ? 1 : 0
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      res.status(200).json({
        success: true,
        message: '2FA settings updated successfully'
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('2FA settings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    db.close();
  }
}

export default withAdminAuth(handler);
