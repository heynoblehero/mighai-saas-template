/**
 * Internal API Authentication Middleware
 * Protects localhost-only endpoints for user's backend to call
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'site_builder.db');

/**
 * Middleware to protect internal API routes
 * - Only allows requests from localhost
 * - Requires valid internal API token
 */
export function withInternalAuth(handler) {
  return async (req, res) => {
    try {
      // Check 1: Request must come from localhost
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                 req.socket?.remoteAddress ||
                 req.connection?.remoteAddress;

      const localIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];
      const isLocal = localIps.some(localIp => ip?.includes(localIp));

      if (!isLocal) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Internal API is only accessible from localhost'
        });
      }

      // Check 2: Must have valid internal API token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Missing Authorization header with Bearer token'
        });
      }

      const token = authHeader.substring(7);

      // Get the internal API token from the database
      const db = new Database(dbPath);
      const config = db.prepare('SELECT internal_api_token FROM backend_config WHERE id = 1').get();
      db.close();

      if (!config || !config.internal_api_token) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Backend not configured. Please configure the backend in admin panel.'
        });
      }

      if (token !== config.internal_api_token) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided internal API token is invalid'
        });
      }

      // Authentication successful
      return handler(req, res);

    } catch (error) {
      console.error('[Internal API] Auth error:', error);
      return res.status(500).json({
        error: 'Authentication error',
        message: error.message
      });
    }
  };
}

export default { withInternalAuth };
