const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'site_builder.db');

// Generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Telegram
async function sendTelegramOTP(botToken, chatId, otp, actionType) {
  const actionMessages = {
    'login': '🔐 Admin Login Verification',
    'database_change': '🗄️ Database Modification',
    'page_change': '📄 Page Modification',
    'route_change': '🛣️ Route Modification'
  };

  const message = `
${actionMessages[actionType] || '🔒 Admin Action Verification'}

Your verification code is: *${otp}*

This code will expire in 5 minutes.

⚠️ If you did not initiate this action, please secure your account immediately.
  `;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send Telegram OTP:', error);
    throw error;
  }
}

// Store OTP in database
async function storeOTP(userId, otp, method, actionType, actionData = null) {
  const db = new sqlite3.Database(dbPath);

  try {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO admin_2fa_sessions (user_id, otp_code, method, action_type, action_data, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, otp, method, actionType, actionData ? JSON.stringify(actionData) : null, expiresAt.toISOString()],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return { success: true };
  } finally {
    db.close();
  }
}

// Verify OTP
async function verifyOTP(userId, otp, actionType) {
  const db = new sqlite3.Database(dbPath);

  try {
    const session = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM admin_2fa_sessions
         WHERE user_id = ? AND otp_code = ? AND action_type = ? AND used = 0 AND expires_at > datetime('now')
         ORDER BY created_at DESC LIMIT 1`,
        [userId, otp, actionType],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!session) {
      return { success: false, error: 'Invalid or expired OTP' };
    }

    // Mark OTP as used
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE admin_2fa_sessions SET used = 1 WHERE id = ?',
        [session.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return {
      success: true,
      session: {
        ...session,
        action_data: session.action_data ? JSON.parse(session.action_data) : null
      }
    };
  } finally {
    db.close();
  }
}

// Get 2FA settings for a user
async function get2FASettings(userId) {
  const db = new sqlite3.Database(dbPath);

  try {
    const settings = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM admin_2fa_settings WHERE user_id = ? AND is_enabled = 1',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    return settings;
  } finally {
    db.close();
  }
}

// Send OTP based on user's 2FA settings
async function sendOTP(userId, actionType, actionData = null) {
  const settings = await get2FASettings(userId);

  if (!settings) {
    return { success: false, error: '2FA not enabled' };
  }

  // Check if 2FA is required for this action type
  const requirementMap = {
    'login': settings.require_on_login,
    'database_change': settings.require_on_database_changes,
    'page_change': settings.require_on_page_changes,
    'route_change': settings.require_on_route_changes
  };

  if (!requirementMap[actionType]) {
    return { success: true, required: false };
  }

  const otp = generateOTP();

  // Send OTP via appropriate method
  if (settings.method === 'telegram' || settings.method === 'both') {
    try {
      await sendTelegramOTP(
        settings.telegram_bot_token,
        settings.telegram_chat_id,
        otp,
        actionType
      );
    } catch (error) {
      console.error('Failed to send Telegram OTP:', error);
      return { success: false, error: 'Failed to send OTP via Telegram' };
    }
  }

  if (settings.method === 'email' || settings.method === 'both') {
    // Email OTP sending is already handled by emailService
    // This is a placeholder for future integration
  }

  // Store OTP in database
  await storeOTP(userId, otp, settings.method, actionType, actionData);

  return {
    success: true,
    required: true,
    method: settings.method
  };
}

module.exports = {
  sendOTP,
  verifyOTP,
  get2FASettings
};
