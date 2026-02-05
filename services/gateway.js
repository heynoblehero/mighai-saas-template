/**
 * Simplified Gateway Middleware Service
 * Handles single-route proxying to admin's backend with access control
 */

const { createProxyMiddleware } = require('http-proxy-middleware');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Config cache
let configCache = null;
let configLastLoaded = 0;
const CONFIG_CACHE_TTL = 5000; // 5 seconds

class Gateway {
  constructor(db) {
    this.db = db;
    this.proxy = null;
    this.currentPort = null;
  }

  /**
   * Create the Express middleware
   */
  middleware() {
    return async (req, res, next) => {
      try {
        // Load config
        const config = await this.loadConfig();

        if (!config || !config.gateway_path) {
          return next();
        }

        // Check if request matches gateway path
        if (!req.path.startsWith(config.gateway_path)) {
          return next();
        }

        // Check access control
        if (config.gateway_access === 'subscribers') {
          const user = await this.authenticateRequest(req);
          if (!user) {
            return res.status(401).json({
              error: 'Subscribers only',
              message: 'This endpoint requires authentication. Please log in or provide an API key.'
            });
          }

          // Inject user headers
          req.headers['x-user-id'] = String(user.id);
          req.headers['x-user-email'] = user.email || '';
          req.headers['x-user-name'] = user.name || '';
          req.headers['x-user-plan-id'] = String(user.plan_id || 1);
          req.headers['x-subscription-status'] = user.subscription_status || 'inactive';
        }

        // Add request ID for tracing
        req.headers['x-request-id'] = crypto.randomUUID();

        // Strip the gateway path prefix
        req.url = req.url.substring(config.gateway_path.length) || '/';

        // Get or recreate proxy if port changed
        const targetPort = config.gateway_port || 5000;
        if (!this.proxy || this.currentPort !== targetPort) {
          this.proxy = this.createProxy(targetPort);
          this.currentPort = targetPort;
        }

        // Proxy the request
        return this.proxy(req, res, next);

      } catch (error) {
        console.error('[Gateway] Error:', error);
        return res.status(500).json({
          error: 'Gateway error',
          message: error.message
        });
      }
    };
  }

  /**
   * Create the HTTP proxy middleware
   */
  createProxy(port) {
    return createProxyMiddleware({
      target: `http://localhost:${port}`,
      changeOrigin: true,
      ws: true,
      logLevel: 'warn',
      onError: (err, req, res) => {
        console.error('[Gateway] Proxy error:', err.message);
        if (!res.headersSent) {
          res.status(502).json({
            error: 'Backend unavailable',
            message: 'No service is running on the configured port. Start your backend in the terminal.'
          });
        }
      },
      onProxyReq: (proxyReq, req) => {
        // Remove cookies to prevent session leakage
        proxyReq.removeHeader('cookie');
      }
    });
  }

  /**
   * Load gateway config from database (with caching)
   */
  async loadConfig() {
    const now = Date.now();
    if (configCache && now - configLastLoaded < CONFIG_CACHE_TTL) {
      return configCache;
    }

    return new Promise((resolve) => {
      this.db.get('SELECT * FROM backend_config WHERE id = 1', (err, row) => {
        if (err) {
          console.error('[Gateway] Failed to load config:', err);
          return resolve(configCache); // Use cached on error
        }

        configCache = row;
        configLastLoaded = now;
        resolve(row);
      });
    });
  }

  /**
   * Force reload config
   */
  async reloadConfig() {
    configLastLoaded = 0;
    return this.loadConfig();
  }

  /**
   * Authenticate the request (for subscribers-only access)
   */
  async authenticateRequest(req) {
    // Method 1: Check Passport session
    if (req.user) {
      return req.user;
    }

    // Method 2: Check API key (X-API-Key header or Bearer sk_sub_*)
    const apiKeyResult = await this.validateApiKey(req);
    if (apiKeyResult) {
      return apiKeyResult;
    }

    // Method 3: Check session token cookie
    const sessionToken = req.cookies?.session_token;
    if (sessionToken) {
      const sessionResult = await this.validateSession(sessionToken);
      if (sessionResult) {
        return sessionResult;
      }
    }

    // Method 4: Check JWT in Authorization header
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && !authHeader.startsWith('Bearer sk_sub_')) {
      const token = authHeader.substring(7);
      const jwtResult = await this.validateJwt(token);
      if (jwtResult) {
        return jwtResult;
      }
    }

    return null;
  }

  /**
   * Validate API key
   */
  async validateApiKey(req) {
    let apiKey = req.headers?.['x-api-key'];

    if (!apiKey) {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer sk_sub_')) {
        apiKey = authHeader.substring(7);
      }
    }

    if (!apiKey || !apiKey.startsWith('sk_sub_')) {
      return null;
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    return new Promise((resolve) => {
      this.db.get(
        `SELECT ak.id as key_id, ak.user_id, ak.is_active, ak.expires_at,
                u.id, u.email, u.name, u.role, u.subscription_status, u.plan_id
         FROM subscriber_api_keys ak
         JOIN users u ON ak.user_id = u.id
         WHERE ak.key_hash = ?`,
        [keyHash],
        (err, row) => {
          if (err || !row) return resolve(null);
          if (!row.is_active) return resolve(null);
          if (row.expires_at && new Date(row.expires_at) < new Date()) return resolve(null);

          // Update last used
          this.db.run('UPDATE subscriber_api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [row.key_id]);

          resolve({
            id: row.user_id,
            email: row.email,
            name: row.name,
            role: row.role,
            subscription_status: row.subscription_status,
            plan_id: row.plan_id
          });
        }
      );
    });
  }

  /**
   * Validate session token
   */
  async validateSession(sessionToken) {
    return new Promise((resolve) => {
      this.db.get(
        'SELECT * FROM user_sessions WHERE id = ? AND expires_at > datetime("now")',
        [sessionToken],
        (err, row) => {
          if (err || !row) return resolve(null);

          try {
            const userData = JSON.parse(row.user_data);
            resolve(userData);
          } catch {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Validate JWT token
   */
  async validateJwt(token) {
    try {
      const secret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, secret);

      return new Promise((resolve) => {
        this.db.get(
          'SELECT id, email, name, role, subscription_status, plan_id FROM users WHERE id = ?',
          [decoded.userId || decoded.id],
          (err, row) => {
            if (err || !row) return resolve(null);
            resolve(row);
          }
        );
      });
    } catch {
      return null;
    }
  }
}

// Singleton instance
let gatewayInstance = null;

module.exports = {
  /**
   * Create and return the gateway middleware
   */
  middleware: (db) => {
    if (!gatewayInstance) {
      gatewayInstance = new Gateway(db);
    }
    return gatewayInstance.middleware();
  },

  /**
   * Force reload config
   */
  reloadConfig: () => {
    if (gatewayInstance) {
      return gatewayInstance.reloadConfig();
    }
  },

  /**
   * Get the gateway instance
   */
  getInstance: () => gatewayInstance
};
