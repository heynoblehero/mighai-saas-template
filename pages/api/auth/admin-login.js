const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const emailService = require('../../../services/emailService');
const telegramOTPService = require('../../../services/telegramOTPService');
const {
  bruteForceProtection,
  loginRateLimiter,
  loginSpeedLimiter,
  getClientIp,
  createDeviceFingerprint,
  logSecurityEvent,
} = require('../../../lib/security');

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

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Apply rate limiting
    await runMiddleware(req, res, loginRateLimiter);
    await runMiddleware(req, res, loginSpeedLimiter);

    // Temporarily set email in body for brute force protection
    if (!req.body.email) {
      req.body.email = username;
    }

    // Apply brute force protection
    await runMiddleware(req, res, bruteForceProtection('admin'));
  } catch (error) {
    // Rate limit or brute force protection triggered
    return; // Response already sent by middleware
  }

  const db = new sqlite3.Database(dbPath);
  const securityContext = req.securityContext;

  try {
    // Find user
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      // Record failed login - user not found
      if (securityContext) {
        await securityContext.recordFailure('User not found');
        await securityContext.logEvent('failed_login_attempt', 'low', {
          email: username,
          reason: 'User not found',
        });
      }
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Record failed login - invalid password
      if (securityContext) {
        await securityContext.recordFailure('Invalid password');
        await securityContext.logEvent('failed_login_attempt', 'medium', {
          email: user.email,
          userId: user.id,
          reason: 'Invalid password',
        });
      }
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      // Record failed login - not admin
      if (securityContext) {
        await securityContext.recordFailure('Non-admin access attempt');
        await securityContext.logEvent('unauthorized_access_attempt', 'high', {
          email: user.email,
          userId: user.id,
          reason: 'Non-admin tried to access admin login',
          role: user.role,
        });
      }
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    // Password is correct, record partial success (will complete after OTP)
    if (securityContext) {
      await securityContext.logEvent('admin_login_password_verified', 'low', {
        email: user.email,
        userId: user.id,
      });
    }

    // Check 2FA settings
    const twoFASettings = await telegramOTPService.get2FASettings(user.id);

    if (twoFASettings && twoFASettings.is_enabled && twoFASettings.require_on_login) {
      // Send OTP via configured method(s)
      try {
        const otpResult = await telegramOTPService.sendOTP(user.id, 'login');

        if (!otpResult.success) {
          throw new Error(otpResult.error);
        }

        // Return user info (without password) but don't create session yet
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json({
          message: 'OTP sent successfully',
          user: userWithoutPassword,
          twoFA: {
            enabled: true,
            method: twoFASettings.method
          }
        });
      } catch (otpError) {
        console.error('Failed to send 2FA OTP:', otpError);
        if (securityContext) {
          await securityContext.logEvent('otp_send_failure', 'medium', {
            email: user.email,
            userId: user.id,
            error: otpError.message,
          });
        }
        return res.status(500).json({
          error: 'Failed to send verification code',
          code: 'OTP_SEND_FAILED'
        });
      }
    } else {
      // Fallback to email OTP for backward compatibility
      try {
        await emailService.sendOTP(user.email, 'admin_login', 10);

        // Return user info (without password) but don't create session yet
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({
          message: 'OTP sent successfully',
          user: userWithoutPassword,
          twoFA: {
            enabled: false,
            method: 'email'
          }
        });
      } catch (emailError) {
        console.error('Failed to send OTP:', emailError);
        if (securityContext) {
          await securityContext.logEvent('otp_send_failure', 'medium', {
            email: user.email,
            userId: user.id,
            error: emailError.message,
          });
        }
        res.status(500).json({
          error: 'Failed to send verification code',
          code: 'OTP_SEND_FAILED'
        });
      }
    }

  } catch (error) {
    console.error('Admin login error:', error);
    if (securityContext) {
      await securityContext.logEvent('login_system_error', 'high', {
        error: error.message,
        stack: error.stack,
      });
    }
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    db.close();
  }
}

export default handler;