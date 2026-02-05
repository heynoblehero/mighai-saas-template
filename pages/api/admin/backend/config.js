/**
 * Admin API: Backend Configuration
 * GET /api/admin/backend/config - Get backend config
 * PUT /api/admin/backend/config - Update backend config
 */

import { withAdminAuth } from '@/lib/auth-middleware';
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'site_builder.db');

async function handler(req, res) {
  if (req.method === 'GET') {
    return getConfig(req, res);
  } else if (req.method === 'PUT') {
    return updateConfig(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getConfig(req, res) {
  try {
    const db = new Database(dbPath);

    let config = db.prepare('SELECT * FROM backend_config WHERE id = 1').get();

    // Create default config if none exists
    if (!config) {
      const token = crypto.randomBytes(32).toString('hex');
      db.prepare(`
        INSERT INTO backend_config (id, gateway_path, gateway_port, gateway_access, internal_api_token, env_vars)
        VALUES (1, '/api/v1', 5000, 'public', ?, '{}')
      `).run(token);

      config = db.prepare('SELECT * FROM backend_config WHERE id = 1').get();
    }

    db.close();

    // Parse env_vars JSON
    let envVars = {};
    try {
      envVars = JSON.parse(config.env_vars || '{}');
    } catch {
      envVars = {};
    }

    return res.status(200).json({
      gateway_path: config.gateway_path,
      gateway_port: config.gateway_port,
      gateway_access: config.gateway_access,
      internal_api_token: config.internal_api_token,
      env_vars: envVars,
      created_at: config.created_at,
      updated_at: config.updated_at
    });

  } catch (error) {
    console.error('[Admin API] Get backend config error:', error);
    return res.status(500).json({ error: 'Failed to get config', message: error.message });
  }
}

async function updateConfig(req, res) {
  const {
    gateway_path,
    gateway_port,
    gateway_access,
    env_vars,
    regenerate_token
  } = req.body;

  try {
    const db = new Database(dbPath);

    // Ensure config exists
    let config = db.prepare('SELECT id FROM backend_config WHERE id = 1').get();
    if (!config) {
      const token = crypto.randomBytes(32).toString('hex');
      db.prepare(`
        INSERT INTO backend_config (id, internal_api_token) VALUES (1, ?)
      `).run(token);
    }

    // Build update
    const updates = [];
    const params = [];

    if (gateway_path !== undefined) {
      // Validate path format
      if (!gateway_path.startsWith('/')) {
        db.close();
        return res.status(400).json({ error: 'gateway_path must start with /' });
      }
      updates.push('gateway_path = ?');
      params.push(gateway_path);
    }

    if (gateway_port !== undefined) {
      const port = parseInt(gateway_port);
      if (isNaN(port) || port < 1 || port > 65535) {
        db.close();
        return res.status(400).json({ error: 'gateway_port must be a valid port number (1-65535)' });
      }
      updates.push('gateway_port = ?');
      params.push(port);
    }

    if (gateway_access !== undefined) {
      if (!['public', 'subscribers'].includes(gateway_access)) {
        db.close();
        return res.status(400).json({ error: 'gateway_access must be "public" or "subscribers"' });
      }
      updates.push('gateway_access = ?');
      params.push(gateway_access);
    }

    if (env_vars !== undefined) {
      updates.push('env_vars = ?');
      params.push(JSON.stringify(env_vars));
    }

    if (regenerate_token) {
      const newToken = crypto.randomBytes(32).toString('hex');
      updates.push('internal_api_token = ?');
      params.push(newToken);

      // Update terminal manager's token if available
      if (global.__terminalManager) {
        global.__terminalManager.setInternalApiToken(newToken);
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      db.prepare(`UPDATE backend_config SET ${updates.join(', ')} WHERE id = 1`).run(...params);

      // Reload gateway config
      const gateway = require('@/services/gateway');
      if (gateway.reloadConfig) {
        gateway.reloadConfig();
      }
    }

    db.close();

    return res.status(200).json({ success: true, message: 'Config updated' });

  } catch (error) {
    console.error('[Admin API] Update backend config error:', error);
    return res.status(500).json({ error: 'Failed to update config', message: error.message });
  }
}

export default withAdminAuth(handler);
