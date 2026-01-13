import sqlite3 from 'sqlite3';
import path from 'path';
import { VM } from 'vm2';
import { DATABASE_URL } from '@/lib/config';
import { getSession } from '@/lib/session.js';
import { validateApiKeyAuth, updateApiKeyLastUsed } from '@/lib/api-keys.js';

// Extract the database path from the DATABASE_URL
const dbPath = DATABASE_URL.replace('sqlite:', '');

export default async function handler(req, res) {
  const { slug } = req.query;
  const db = new sqlite3.Database(dbPath);

  const startTime = Date.now();
  const consoleLogs = [];

  // Get the custom route
  db.get(
    'SELECT * FROM custom_api_routes WHERE slug = ? AND status = ?',
    [slug, 'active'],
    async (err, route) => {
      if (err) {
        console.error('Error fetching custom route:', err);
        db.close();
        return res.status(500).json({ error: 'Failed to fetch route' });
      }

      if (!route) {
        db.close();
        return res.status(404).json({ error: 'Route not found or inactive' });
      }

      // Check if method matches
      if (route.method !== req.method) {
        db.close();
        return res.status(405).json({
          error: `Method not allowed. This route expects ${route.method}`
        });
      }

      // Check plan-based access control
      const planAccess = route.plan_access || 'public';
      let userId = null;
      let authMethod = 'none';
      let apiKeyId = null;

      // Check for API key authentication first (for programmatic access)
      const apiKeyResult = await validateApiKeyAuth(req);
      if (apiKeyResult.authenticated) {
        userId = apiKeyResult.user.id;
        authMethod = 'api_key';
        apiKeyId = apiKeyResult.keyId;

        // Check if this route allows API key access
        if (!route.allow_api_key_access) {
          db.close();
          return res.status(403).json({
            error: 'API key access not enabled',
            message: 'This route does not allow API key authentication. Contact the admin to enable it.'
          });
        }

        // Check API credit limit for API key users
        const userCredits = await getUserApiCredits(db, userId);
        if (userCredits.api_limit > 0 && userCredits.api_calls_used >= userCredits.api_limit) {
          db.close();
          return res.status(429).json({
            error: 'API credit limit exceeded',
            used: userCredits.api_calls_used,
            limit: userCredits.api_limit,
            message: 'You have exhausted your API credits. Please upgrade your plan or contact support.'
          });
        }
      }

      // Fall back to session token authentication (for browser-based access)
      if (!userId) {
        const sessionToken = req.cookies?.session_token;
        if (sessionToken) {
          const session = await getSession(sessionToken);
          if (session && session.user) {
            userId = session.user.id;
            authMethod = 'session';
          }
        }
      }

      if (planAccess === 'any_subscriber' || planAccess === 'paid_only') {
        // Requires authentication
        if (!userId) {
          db.close();
          return res.status(401).json({
            error: 'Authentication required',
            message: 'This route requires authentication. Please log in or provide an API key.'
          });
        }

        // For paid_only, check if user has a paid plan
        if (planAccess === 'paid_only') {
          // Fetch user's plan
          const userPlan = await new Promise((resolve, reject) => {
            db.get(
              'SELECT plan_id FROM users WHERE id = ?',
              [userId],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          });

          if (!userPlan || userPlan.plan_id === 1) {
            db.close();
            return res.status(403).json({
              error: 'Paid subscription required',
              message: 'This route requires a paid subscription. Please upgrade your plan.',
              upgrade_url: '/dashboard/upgrade'
            });
          }
        }
      }

      // Check rate limiting if configured
      if (route.rate_limit_per_day) {
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Check usage in last 24 hours
        const checkQuery = userId
          ? `SELECT COUNT(*) as count
             FROM custom_route_usage
             WHERE route_id = ?
               AND user_id = ?
               AND called_at > datetime('now', '-1 day')`
          : `SELECT COUNT(*) as count
             FROM custom_route_usage
             WHERE route_id = ?
               AND ip_address = ?
               AND called_at > datetime('now', '-1 day')`;

        const checkParams = userId ? [route.id, userId] : [route.id, ipAddress];

        const usageCheck = await new Promise((resolve, reject) => {
          db.get(checkQuery, checkParams, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (usageCheck.count >= route.rate_limit_per_day) {
          db.close();
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: `You have exceeded the rate limit of ${route.rate_limit_per_day} calls per day.`,
            limit: route.rate_limit_per_day,
            used: usageCheck.count,
            resetIn: '24 hours'
          });
        }

        // Log this API call for rate limiting
        db.run(
          'INSERT INTO custom_route_usage (route_id, user_id, ip_address) VALUES (?, ?, ?)',
          [route.id, userId, ipAddress],
          (logErr) => {
            if (logErr) console.error('Error logging API usage:', logErr);
          }
        );
      }

      try {
        // Create a custom require function for this route's packages
        const routeDir = path.join(process.cwd(), 'custom-routes', `route-${route.id}`);
        const routePackageJson = path.join(routeDir, 'package.json');

        // Dynamically require createRequire to avoid webpack issues
        const Module = require('module');
        const customRequire = Module.createRequire(routePackageJson);

        // Pre-load installed packages for this route
        const installedModules = {};
        const packages = JSON.parse(route.packages || '[]');

        packages.forEach(pkg => {
          const modulePath = path.join(routeDir, 'node_modules', pkg);
          if (require('fs').existsSync(modulePath)) {
            try {
              installedModules[pkg] = customRequire(pkg);
              console.log(`[Custom Route] Pre-loaded ${pkg} successfully`);
            } catch (error) {
              console.error(`[Custom Route] Failed to pre-load ${pkg}:`, error.message);
            }
          }
        });

        // Create sandbox environment
        const sandbox = {
          req: {
            method: req.method,
            body: req.body,
            query: req.query,
            headers: req.headers,
            cookies: req.cookies
          },
          res: {
            status: (code) => {
              res.status(code);
              return {
                json: (data) => res.json(data),
                send: (data) => res.send(data)
              };
            },
            json: (data) => res.json(data),
            send: (data) => res.send(data)
          },
          console: {
            log: (...args) => {
              consoleLogs.push({
                type: 'log',
                message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
                timestamp: new Date().toISOString()
              });
              console.log('[Custom Route]', ...args);
            },
            error: (...args) => {
              consoleLogs.push({
                type: 'error',
                message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
                timestamp: new Date().toISOString()
              });
              console.error('[Custom Route]', ...args);
            },
            warn: (...args) => {
              consoleLogs.push({
                type: 'warn',
                message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
                timestamp: new Date().toISOString()
              });
              console.warn('[Custom Route]', ...args);
            }
          },
          require: (moduleName) => {
            // Check if module was pre-loaded
            if (installedModules[moduleName]) {
              return installedModules[moduleName];
            }

            // Fallback to main project node_modules
            try {
              return require(moduleName);
            } catch (error) {
              throw new Error(`Module '${moduleName}' not found. Install it by adding it to packages and clicking the Install button.`);
            }
          },
          JSON,
          Math,
          Date,
          String,
          Number,
          Boolean,
          Array,
          Object,
          setTimeout,
          clearTimeout,
          setInterval,
          clearInterval,
          process: {
            env: process.env
          }
        };

        // Create VM with timeout
        const vm = new VM({
          timeout: 10000, // 10 seconds timeout
          sandbox
        });

        // Execute the user's code
        const wrappedCode = `
          (async function() {
            ${route.code}
          })();
        `;

        await vm.run(wrappedCode);

        const executionTime = Date.now() - startTime;

        // Update execution stats
        db.run(
          `UPDATE custom_api_routes
           SET execution_count = execution_count + 1,
               last_executed_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [route.id]
        );

        // Deduct API credit and update last used timestamp if authenticated via API key
        if (authMethod === 'api_key' && userId && apiKeyId) {
          db.run(
            'UPDATE users SET api_calls_used = api_calls_used + 1 WHERE id = ?',
            [userId],
            (err) => {
              if (err) console.error('Error updating API credits:', err);
            }
          );
          // Update API key last used timestamp (async, don't wait)
          updateApiKeyLastUsed(apiKeyId).catch(err => {
            console.error('Error updating API key last used:', err);
          });
        }

        // Log the execution
        db.run(
          `INSERT INTO api_route_logs
           (route_id, request_method, request_headers, request_body, request_query,
            response_status, execution_time_ms, console_logs, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            route.id,
            req.method,
            JSON.stringify(req.headers),
            JSON.stringify(req.body || {}),
            JSON.stringify(req.query || {}),
            res.statusCode || 200,
            executionTime,
            JSON.stringify(consoleLogs),
            req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            req.headers['user-agent']
          ],
          (logErr) => {
            if (logErr) {
              console.error('Error logging execution:', logErr);
            }
            db.close();
          }
        );

      } catch (error) {
        const executionTime = Date.now() - startTime;

        console.error('Custom route execution error:', error);

        // Log the error
        db.run(
          `INSERT INTO api_route_logs
           (route_id, request_method, request_headers, request_body, request_query,
            response_status, execution_time_ms, console_logs, error_message, error_stack,
            ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            route.id,
            req.method,
            JSON.stringify(req.headers),
            JSON.stringify(req.body || {}),
            JSON.stringify(req.query || {}),
            500,
            executionTime,
            JSON.stringify(consoleLogs),
            error.message,
            error.stack,
            req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            req.headers['user-agent']
          ],
          () => db.close()
        );

        res.status(500).json({
          error: 'Code execution failed',
          message: error.message,
          consoleLogs
        });
      }
    }
  );
}

/**
 * Helper function to get user's API credits and limit
 * @param {object} db - SQLite database connection
 * @param {number} userId - User ID
 * @returns {Promise<{api_calls_used: number, api_limit: number}>}
 */
function getUserApiCredits(db, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT u.api_calls_used, COALESCE(p.api_limit, 0) as api_limit
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       WHERE u.id = ?`,
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || { api_calls_used: 0, api_limit: 0 });
      }
    );
  });
}
