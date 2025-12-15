const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('../../../lib/config');
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

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Apply rate limiting and brute force protection
    await runMiddleware(req, res, loginRateLimiter);
    await runMiddleware(req, res, loginSpeedLimiter);
    await runMiddleware(req, res, bruteForceProtection('customer'));
  } catch (error) {
    // Rate limit or brute force protection triggered
    return;
  }

  const db = new sqlite3.Database(dbPath);
  const securityContext = req.securityContext;

  try {
    // Find user
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE email = ? AND role = ?',
        [email, 'subscriber'],
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
          email,
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

    // Password is correct - record successful login
    if (securityContext) {
      await securityContext.recordSuccess();
      await securityContext.logEvent('customer_login_success', 'low', {
        email: user.email,
        userId: user.id,
        browser: securityContext.deviceInfo.browser,
        os: securityContext.deviceInfo.os,
        device: securityContext.deviceInfo.device,
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        username: user.username
      },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.setHeader('Set-Cookie', `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

    // Return user info (without password)
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Subscriber login error:', error);
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