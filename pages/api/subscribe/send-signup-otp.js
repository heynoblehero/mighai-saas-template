const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const emailService = require('../../../services/emailService');
const {
  otpRateLimiter,
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

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    // Apply OTP rate limiting (5 per hour per email/IP combo)
    await runMiddleware(req, res, otpRateLimiter);
  } catch (error) {
    // Rate limit triggered
    return;
  }

  const db = new sqlite3.Database(dbPath);
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const deviceInfo = createDeviceFingerprint(req);

  try {
    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingUser) {
      // Log potential email enumeration attempt
      await logSecurityEvent('signup_existing_user_attempt', 'low', {
        email,
        username,
        ip,
        userAgent,
        deviceFingerprint: deviceInfo.fingerprint,
        reason: existingUser.username === username ? 'Username exists' : 'Email exists',
      });

      return res.status(400).json({
        error: existingUser.username === username ? 'Username already exists' : 'Email already registered',
        code: 'USER_EXISTS'
      });
    }

    // Check if email service is configured
    const isEmailConfigured = emailService.isConfigured();

    if (!isEmailConfigured) {
      // Email not configured - use default OTP 123456
      console.log('Email service not configured. Using default OTP: 123456');

      // Store default OTP in database
      try {
        await emailService.storeOTP(email, 'customer_signup', '123456', 15);
      } catch (otpError) {
        console.error('Failed to store default OTP:', otpError);
      }

      // Log event
      await logSecurityEvent('signup_default_otp', 'low', {
        email,
        username,
        ip,
        userAgent,
        deviceFingerprint: deviceInfo.fingerprint,
        reason: 'Email service not configured - using default OTP',
      });

      res.status(200).json({
        message: 'Email service not configured. Use OTP: 123456 to verify.',
        email: email,
        skipOTP: false,
        defaultOTP: true
      });
      return;
    }

    // Send OTP email
    try {
      const result = await emailService.sendOTP(email, 'customer_signup', 15);

      // Check if email was actually sent
      if (!result.emailSent) {
        // OTP generated but email not sent - use default OTP
        console.log('Email could not be sent. Using default OTP: 123456');

        // Store default OTP
        try {
          await emailService.storeOTP(email, 'customer_signup', '123456', 15);
        } catch (otpError) {
          console.error('Failed to store default OTP:', otpError);
        }

        await logSecurityEvent('signup_default_otp', 'low', {
          email,
          username,
          ip,
          userAgent,
          deviceFingerprint: deviceInfo.fingerprint,
          reason: 'Email template not found or sending failed - using default OTP',
        });

        res.status(200).json({
          message: 'Email could not be sent. Use OTP: 123456 to verify.',
          email: email,
          skipOTP: false,
          defaultOTP: true
        });
        return;
      }

      // Log OTP sent event
      await logSecurityEvent('signup_otp_sent', 'low', {
        email,
        username,
        ip,
        userAgent,
        deviceFingerprint: deviceInfo.fingerprint,
      });

      res.status(200).json({
        message: 'Verification code sent to your email',
        email: email,
        skipOTP: false
      });
    } catch (emailError) {
      console.error('Failed to send signup OTP:', emailError);

      // Log OTP send failure
      await logSecurityEvent('signup_otp_send_failed', 'medium', {
        email,
        username,
        ip,
        userAgent,
        error: emailError.message,
      });

      // Use default OTP if email fails
      try {
        await emailService.storeOTP(email, 'customer_signup', '123456', 15);
      } catch (otpError) {
        console.error('Failed to store default OTP:', otpError);
      }

      res.status(200).json({
        message: 'Email verification unavailable. Use OTP: 123456 to verify.',
        email: email,
        skipOTP: false,
        defaultOTP: true
      });
    }

  } catch (error) {
    console.error('Signup OTP error:', error);
    await logSecurityEvent('signup_otp_system_error', 'high', {
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