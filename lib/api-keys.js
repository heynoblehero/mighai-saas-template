import db from './database';
import crypto from 'crypto';

const API_KEY_PREFIX = 'sk_sub_';

// Ensure the subscriber_api_keys table exists
function ensureApiKeysTable() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS subscriber_api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      name TEXT DEFAULT 'Default Key',
      is_active INTEGER DEFAULT 1,
      last_used_at DATETIME,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `).run();

  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_subscriber_api_keys_user ON subscriber_api_keys(user_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_subscriber_api_keys_hash ON subscriber_api_keys(key_hash)').run();
  } catch (e) {
    // Index might already exist
  }
}

/**
 * Generate a new API key for a subscriber
 * @param {number} userId - The user ID to generate the key for
 * @param {string} name - Optional name for the key
 * @returns {Promise<{key: string, keyId: number, keyPrefix: string}>}
 */
export async function generateApiKey(userId, name = 'Default Key') {
  ensureApiKeysTable();

  // Generate a random 32-byte key
  const randomPart = crypto.randomBytes(32).toString('hex');
  const fullKey = `${API_KEY_PREFIX}${randomPart}`;
  const keyHash = hashApiKey(fullKey);
  const keyPrefix = `${API_KEY_PREFIX}${randomPart.substring(0, 8)}...`;

  const result = db.prepare(`
    INSERT INTO subscriber_api_keys (user_id, key_hash, key_prefix, name)
    VALUES (?, ?, ?, ?)
  `).run(userId, keyHash, keyPrefix, name);

  return {
    key: fullKey, // Full key is only returned once at creation
    keyId: result.lastInsertRowid,
    keyPrefix: keyPrefix
  };
}

/**
 * Hash an API key using SHA-256
 * @param {string} key - The API key to hash
 * @returns {string} - The hashed key
 */
export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate an API key and return the associated user
 * @param {string} key - The API key to validate
 * @returns {Promise<{valid: boolean, user?: object, keyId?: number} | null>}
 */
export async function validateApiKey(key) {
  ensureApiKeysTable();
  const keyHash = hashApiKey(key);

  const row = db.prepare(`
    SELECT ak.id as key_id, ak.user_id, ak.is_active, ak.expires_at,
            u.id, u.email, u.name, u.role, u.subscription_status, u.plan_id,
            u.api_calls_used
     FROM subscriber_api_keys ak
     JOIN users u ON ak.user_id = u.id
     WHERE ak.key_hash = ?
  `).get(keyHash);

  if (!row) {
    return { valid: false };
  } else if (!row.is_active) {
    return { valid: false, reason: 'Key is inactive' };
  } else if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { valid: false, reason: 'Key has expired' };
  } else {
    return {
      valid: true,
      keyId: row.key_id,
      user: {
        id: row.user_id,
        email: row.email,
        name: row.name,
        role: row.role,
        subscription_status: row.subscription_status,
        plan_id: row.plan_id,
        api_calls_used: row.api_calls_used
      }
    };
  }
}

/**
 * Validate API key from request headers
 * @param {object} req - The request object
 * @returns {Promise<{authenticated: boolean, user?: object, keyId?: number}>}
 */
export async function validateApiKeyAuth(req) {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers?.authorization;
  let apiKey = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  }

  // Check X-API-Key header
  if (!apiKey && req.headers?.['x-api-key']) {
    apiKey = req.headers['x-api-key'];
  }

  // No API key provided
  if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
    return { authenticated: false };
  }

  try {
    const result = await validateApiKey(apiKey);
    if (result.valid) {
      return {
        authenticated: true,
        user: result.user,
        keyId: result.keyId
      };
    }
    return { authenticated: false, reason: result.reason };
  } catch (error) {
    console.error('API key validation error:', error);
    return { authenticated: false, reason: 'Validation error' };
  }
}

/**
 * Update the last_used_at timestamp for an API key
 * @param {number} keyId - The API key ID
 */
export async function updateApiKeyLastUsed(keyId) {
  ensureApiKeysTable();
  db.prepare(`
    UPDATE subscriber_api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(keyId);
}

/**
 * Revoke (deactivate) an API key
 * @param {number} keyId - The API key ID
 * @param {number} userId - The user ID (for verification)
 * @returns {Promise<boolean>}
 */
export async function revokeApiKey(keyId, userId = null) {
  ensureApiKeysTable();

  let result;
  if (userId) {
    result = db.prepare(`
      UPDATE subscriber_api_keys SET is_active = 0 WHERE id = ? AND user_id = ?
    `).run(keyId, userId);
  } else {
    result = db.prepare(`
      UPDATE subscriber_api_keys SET is_active = 0 WHERE id = ?
    `).run(keyId);
  }

  return result.changes > 0;
}

/**
 * Delete an API key permanently
 * @param {number} keyId - The API key ID
 * @param {number} userId - The user ID (for verification)
 * @returns {Promise<boolean>}
 */
export async function deleteApiKey(keyId, userId = null) {
  ensureApiKeysTable();

  let result;
  if (userId) {
    result = db.prepare(`
      DELETE FROM subscriber_api_keys WHERE id = ? AND user_id = ?
    `).run(keyId, userId);
  } else {
    result = db.prepare(`
      DELETE FROM subscriber_api_keys WHERE id = ?
    `).run(keyId);
  }

  return result.changes > 0;
}

/**
 * List all API keys for a user (without the actual key)
 * @param {number} userId - The user ID
 * @returns {Promise<Array>}
 */
export async function listUserApiKeys(userId) {
  ensureApiKeysTable();

  const rows = db.prepare(`
    SELECT id, key_prefix, name, is_active, last_used_at, expires_at, created_at
    FROM subscriber_api_keys
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  return rows || [];
}

/**
 * Get API key count for a user
 * @param {number} userId - The user ID
 * @returns {Promise<number>}
 */
export async function getUserApiKeyCount(userId) {
  ensureApiKeysTable();

  const row = db.prepare(`
    SELECT COUNT(*) as count FROM subscriber_api_keys WHERE user_id = ? AND is_active = 1
  `).get(userId);

  return row?.count || 0;
}
