import sqlite3pkg from 'sqlite3';
import path from 'path';
import emailService from '../../../services/emailService.js';
import telegramOTPService from '../../../services/telegramOTPService.js';
import { createSession } from '../../../lib/session.js';
import {
  otpVerifyRateLimiter,
  recordSuccessfulLogin,
  recordFailedLogin,
  getClientIp,
  createDeviceFingerprint,
  logSecurityEvent,
} from '../../../lib/security.js';

const sqlite3 = sqlite3pkg.verbose();
const dbPath = path.join(process.cwd(), 'site_builder.db');

// Helper to run middleware in Next.js API routes
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp, username, userId } = req.body;

  if ((!email && !userId) || !otp || !username) {
    return res.status(400).json({ error: 'Email/User ID, OTP, and username are required' });
  }

  try {
    // Apply OTP verification rate limiting
    await runMiddleware(req, res, otpVerifyRateLimiter);
  } catch (error) {
    // Rate limit triggered
    return;
  }

  const db = new sqlite3.Database(dbPath);
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const deviceInfo = createDeviceFingerprint(req);

  try {
    // Get user first to check 2FA settings
    const user = await new Promise((resolve, reject) => {
      const query = userId
        ? 'SELECT * FROM users WHERE id = ? AND username = ? AND role = ?'
        : 'SELECT * FROM users WHERE email = ? AND username = ? AND role = ?';
      const params = userId ? [userId, username, 'admin'] : [email, username, 'admin'];

      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      await logSecurityEvent('otp_verify_user_not_found', 'medium', {
        email: email || 'unknown',
        userId,
        username,
        ip,
        userAgent,
        deviceFingerprint: deviceInfo.fingerprint,
      });
      return res.status(401).json({
        error: 'User not found or invalid permissions',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user has 2FA enabled
    const twoFASettings = await telegramOTPService.get2FASettings(user.id);

    let isValidOTP = false;

    if (twoFASettings && twoFASettings.is_enabled && twoFASettings.require_on_login) {
      // Verify using Telegram 2FA system
      const verifyResult = await telegramOTPService.verifyOTP(user.id, otp, 'login');
      isValidOTP = verifyResult.success;
    } else {
      // Fallback to email OTP verification
      isValidOTP = await emailService.verifyOTP(user.email, otp, 'admin_login');
    }

    if (!isValidOTP) {
      // Record failed OTP verification
      await recordFailedLogin(user.email, ip, userAgent, 'otp', 'Invalid or expired OTP', deviceInfo.fingerprint);
      await logSecurityEvent('failed_otp_verification', 'medium', {
        email: user.email,
        userId: user.id,
        ip,
        userAgent,
        deviceFingerprint: deviceInfo.fingerprint,
      });
      return res.status(401).json({
        error: 'Invalid or expired OTP',
        code: 'INVALID_OTP'
      });
    }

    // OTP is valid - record successful login
    await recordSuccessfulLogin(user.email, ip, userAgent, 'admin', deviceInfo.fingerprint);
    await logSecurityEvent('admin_login_success', 'low', {
      email: user.email,
      userId: user.id,
      ip,
      userAgent,
      deviceFingerprint: deviceInfo.fingerprint,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      device: deviceInfo.device,
    });

    // Create secure session
    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const sessionToken = await createSession(sessionUser);

    // Set secure session cookie
    // Using SameSite=Lax to allow cookies on same-site navigations and prevent logout issues
    res.setHeader('Set-Cookie', [
      `session_token=${sessionToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    ]);

    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
      message: 'Admin login successful',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Admin OTP verification error:', error);
    await logSecurityEvent('otp_verification_system_error', 'high', {
      error: error.message,
      stack: error.stack,
      ip,
      userAgent,
    });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    db.close();
  }
}

export default handler;