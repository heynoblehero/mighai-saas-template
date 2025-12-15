const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database setup - use the same database as server.js
const dbPath = process.env.NODE_ENV === 'production'
  ? '/tmp/site_builder.db'
  : '/home/ishaan/Projects/mighai (copy)/site_builder.db';
const db = new sqlite3.Database(dbPath);

// Configuration constants
const SECURITY_CONFIG = {
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  LOGIN_ATTEMPT_WINDOW: 15 * 60 * 1000, // 15 minutes
  OTP_MAX_ATTEMPTS: 3,
  OTP_LOCKOUT_DURATION: 60 * 60 * 1000, // 1 hour
  PROGRESSIVE_DELAY_BASE: 1000, // 1 second base delay
  IP_BLOCK_THRESHOLD: 20, // Block IP after 20 failed attempts
  IP_BLOCK_DURATION: 24 * 60 * 60 * 1000, // 24 hours
};

// Helper function to extract IP address (handles proxies)
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip']; // Cloudflare

  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
}

// Helper function to create device fingerprint
function createDeviceFingerprint(req) {
  const parser = new UAParser(req.headers['user-agent']);
  const result = parser.getResult();

  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    result.browser.name || '',
    result.os.name || '',
    result.device.type || 'desktop',
  ];

  const fingerprint = crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');

  return {
    fingerprint,
    browser: result.browser.name,
    os: result.os.name,
    device: result.device.type || 'desktop',
  };
}

// Log login attempt
function logLoginAttempt(email, ip, userAgent, attemptType, success, failureReason = null, deviceFingerprint = null) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO login_attempts (email, ip_address, user_agent, attempt_type, success, failure_reason, device_fingerprint)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, ip, userAgent, attemptType, success ? 1 : 0, failureReason, deviceFingerprint],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Log security event
function logSecurityEvent(eventType, severity, data) {
  return new Promise((resolve, reject) => {
    const eventData = JSON.stringify(data);
    db.run(
      `INSERT INTO security_events (event_type, severity, user_id, email, ip_address, user_agent, device_fingerprint, event_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventType, severity, data.userId || null, data.email || null, data.ip || null, data.userAgent || null, data.deviceFingerprint || null, eventData],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Check if account is locked
function isAccountLocked(email) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT locked_until, failed_login_attempts FROM users WHERE email = ?`,
      [email],
      (err, user) => {
        if (err) return reject(err);
        if (!user) return resolve({ locked: false, attempts: 0 });

        if (user.locked_until) {
          const lockExpiry = new Date(user.locked_until);
          const now = new Date();

          if (lockExpiry > now) {
            const minutesRemaining = Math.ceil((lockExpiry - now) / 1000 / 60);
            return resolve({
              locked: true,
              attempts: user.failed_login_attempts,
              minutesRemaining,
            });
          } else {
            // Lock expired, reset the account
            db.run(
              `UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE email = ?`,
              [email],
              (err) => {
                if (err) console.error('Error unlocking account:', err);
              }
            );
            return resolve({ locked: false, attempts: 0 });
          }
        }

        resolve({ locked: false, attempts: user.failed_login_attempts || 0 });
      }
    );
  });
}

// Record failed login attempt and potentially lock account
function recordFailedLogin(email, ip, userAgent, attemptType, failureReason, deviceFingerprint) {
  return new Promise(async (resolve, reject) => {
    try {
      // Log the attempt
      await logLoginAttempt(email, ip, userAgent, attemptType, false, failureReason, deviceFingerprint);

      // Update user's failed attempts counter
      db.get(
        `SELECT id, failed_login_attempts FROM users WHERE email = ?`,
        [email],
        (err, user) => {
          if (err) return reject(err);
          if (!user) return resolve(); // User doesn't exist, just log attempt

          const newAttempts = (user.failed_login_attempts || 0) + 1;
          let lockedUntil = null;

          // Lock account if threshold exceeded
          if (newAttempts >= SECURITY_CONFIG.LOGIN_MAX_ATTEMPTS) {
            const lockDuration = SECURITY_CONFIG.LOGIN_LOCKOUT_DURATION;
            lockedUntil = new Date(Date.now() + lockDuration).toISOString();

            // Log security event
            logSecurityEvent('account_locked', 'high', {
              userId: user.id,
              email,
              ip,
              userAgent,
              deviceFingerprint,
              attempts: newAttempts,
              reason: 'Too many failed login attempts',
            }).catch(console.error);
          }

          db.run(
            `UPDATE users
             SET failed_login_attempts = ?,
                 last_failed_login = CURRENT_TIMESTAMP,
                 locked_until = ?
             WHERE email = ?`,
            [newAttempts, lockedUntil, email],
            (err) => {
              if (err) return reject(err);
              resolve({ locked: !!lockedUntil, attempts: newAttempts });
            }
          );
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

// Record successful login
function recordSuccessfulLogin(email, ip, userAgent, attemptType, deviceFingerprint) {
  return new Promise(async (resolve, reject) => {
    try {
      // Log the successful attempt
      await logLoginAttempt(email, ip, userAgent, attemptType, true, null, deviceFingerprint);

      // Reset failed attempts and update last login info
      db.run(
        `UPDATE users
         SET failed_login_attempts = 0,
             locked_until = NULL,
             last_successful_login = CURRENT_TIMESTAMP,
             last_login_ip = ?
         WHERE email = ?`,
        [ip, email],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

// Check IP-based rate limiting
function checkIpRateLimit(ip, attemptType, windowMinutes = 15) {
  return new Promise((resolve, reject) => {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    db.get(
      `SELECT COUNT(*) as count FROM login_attempts
       WHERE ip_address = ?
       AND attempt_type = ?
       AND success = 0
       AND attempted_at > ?`,
      [ip, attemptType, windowStart],
      (err, result) => {
        if (err) return reject(err);

        const failedAttempts = result.count || 0;
        const blocked = failedAttempts >= SECURITY_CONFIG.IP_BLOCK_THRESHOLD;

        if (blocked) {
          // Log security event for IP blocking
          logSecurityEvent('ip_blocked', 'critical', {
            ip,
            attemptType,
            failedAttempts,
            windowMinutes,
          }).catch(console.error);
        }

        resolve({
          blocked,
          attempts: failedAttempts,
          remaining: Math.max(0, SECURITY_CONFIG.IP_BLOCK_THRESHOLD - failedAttempts),
        });
      }
    );
  });
}

// Calculate progressive delay based on failed attempts
function calculateProgressiveDelay(attempts) {
  if (attempts <= 1) return 0;
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, etc.
  const delay = SECURITY_CONFIG.PROGRESSIVE_DELAY_BASE * Math.pow(2, attempts - 1);
  return Math.min(delay, 30000); // Cap at 30 seconds
}

// Middleware: Brute force protection for login endpoints
function bruteForceProtection(attemptType = 'admin') {
  return async (req, res, next) => {
    const email = req.body.email || req.body.username;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceInfo = createDeviceFingerprint(req);

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    try {
      // Check if IP is blocked
      const ipCheck = await checkIpRateLimit(ip, attemptType);
      if (ipCheck.blocked) {
        await logSecurityEvent('blocked_attempt', 'high', {
          email,
          ip,
          userAgent,
          deviceFingerprint: deviceInfo.fingerprint,
          reason: 'IP blocked due to excessive failures',
          attempts: ipCheck.attempts,
        });

        return res.status(429).json({
          error: 'Too many failed attempts from this IP address. Please try again later.',
          code: 'IP_BLOCKED',
          retryAfter: 3600, // 1 hour
        });
      }

      // Check if account is locked
      const lockStatus = await isAccountLocked(email);
      if (lockStatus.locked) {
        await logSecurityEvent('locked_account_attempt', 'medium', {
          email,
          ip,
          userAgent,
          deviceFingerprint: deviceInfo.fingerprint,
          minutesRemaining: lockStatus.minutesRemaining,
        });

        return res.status(423).json({
          error: `Account is locked due to too many failed login attempts. Please try again in ${lockStatus.minutesRemaining} minutes.`,
          code: 'ACCOUNT_LOCKED',
          minutesRemaining: lockStatus.minutesRemaining,
        });
      }

      // Calculate progressive delay
      const delay = calculateProgressiveDelay(lockStatus.attempts);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Attach security context to request
      req.securityContext = {
        ip,
        userAgent,
        deviceFingerprint: deviceInfo.fingerprint,
        deviceInfo,
        attemptType,
        currentAttempts: lockStatus.attempts,
        recordFailure: (failureReason) => recordFailedLogin(email, ip, userAgent, attemptType, failureReason, deviceInfo.fingerprint),
        recordSuccess: () => recordSuccessfulLogin(email, ip, userAgent, attemptType, deviceInfo.fingerprint),
        logEvent: (eventType, severity, data) => logSecurityEvent(eventType, severity, { ...data, ip, userAgent, deviceFingerprint: deviceInfo.fingerprint }),
      };

      next();
    } catch (error) {
      console.error('Brute force protection error:', error);
      // Don't block on errors, but log them
      req.securityContext = {
        ip,
        userAgent,
        deviceFingerprint: deviceInfo.fingerprint,
        deviceInfo,
        attemptType,
        currentAttempts: 0,
        recordFailure: () => Promise.resolve(),
        recordSuccess: () => Promise.resolve(),
        logEvent: () => Promise.resolve(),
      };
      next();
    }
  };
}

// Express-rate-limit configurations
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window per IP
  message: {
    error: 'Too many login attempts from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
});

const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 OTP requests per hour per IP
  message: {
    error: 'Too many OTP requests, please try again later.',
    code: 'OTP_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body.email || req.body.username || 'unknown';
    const ip = getClientIp(req);
    return `${email}:${ip}`;
  },
});

const otpVerifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 verification attempts per window
  message: {
    error: 'Too many verification attempts, please try again later.',
    code: 'VERIFY_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body.email || req.body.username || 'unknown';
    const ip = getClientIp(req);
    return `${email}:${ip}`;
  },
});

// Speed limiter for login endpoints (progressive delays)
const loginSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 3, // Allow 3 requests at full speed
  delayMs: (hits) => hits * 1000, // Add 1 second delay per request after delayAfter
  maxDelayMs: 10000, // Maximum delay of 10 seconds
  keyGenerator: (req) => getClientIp(req),
});

module.exports = {
  bruteForceProtection,
  loginRateLimiter,
  otpRateLimiter,
  otpVerifyRateLimiter,
  loginSpeedLimiter,
  getClientIp,
  createDeviceFingerprint,
  logLoginAttempt,
  logSecurityEvent,
  isAccountLocked,
  recordFailedLogin,
  recordSuccessfulLogin,
  checkIpRateLimit,
  SECURITY_CONFIG,
};
