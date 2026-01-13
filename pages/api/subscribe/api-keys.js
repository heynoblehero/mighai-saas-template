import { getSession } from '@/lib/session.js';
import {
  generateApiKey,
  listUserApiKeys,
  revokeApiKey,
  deleteApiKey,
  getUserApiKeyCount
} from '@/lib/api-keys.js';
import sqlite3 from 'sqlite3';
import path from 'path';
import { DATABASE_URL } from '@/lib/config';

const dbPath = DATABASE_URL.replace('sqlite:', '');

export default async function handler(req, res) {
  // Get session from cookie
  const sessionToken = req.cookies?.session_token;

  if (!sessionToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const session = await getSession(sessionToken);

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const userId = session.user.id;

  // Get user's plan info
  const db = new sqlite3.Database(dbPath);
  const userInfo = await new Promise((resolve, reject) => {
    db.get(
      `SELECT u.id, u.email, u.name, u.plan_id, u.api_calls_used,
              p.name as plan_name, p.api_limit
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       WHERE u.id = ?`,
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
  db.close();

  if (!userInfo) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if user has a plan that allows API keys (optional: require paid plan)
  // Uncomment below to restrict to paid plans only:
  // if (!userInfo.plan_id || userInfo.plan_id === 1) {
  //   return res.status(403).json({
  //     error: 'API keys require a paid plan',
  //     upgrade_url: '/dashboard/upgrade'
  //   });
  // }

  if (req.method === 'GET') {
    // List subscriber's own API keys
    try {
      const keys = await listUserApiKeys(userId);
      const activeKeyCount = await getUserApiKeyCount(userId);

      res.status(200).json({
        user: {
          email: userInfo.email,
          name: userInfo.name,
          plan_name: userInfo.plan_name || 'Free',
          api_calls_used: userInfo.api_calls_used || 0,
          api_limit: userInfo.api_limit || 0
        },
        keys,
        active_key_count: activeKeyCount
      });
    } catch (error) {
      console.error('Error listing API keys:', error);
      res.status(500).json({ error: 'Failed to list API keys' });
    }

  } else if (req.method === 'POST') {
    // Generate a new API key
    const { name } = req.body;

    try {
      // Limit number of active keys per subscriber
      const keyCount = await getUserApiKeyCount(userId);
      const maxKeysPerUser = 3; // Subscribers get fewer keys than admin can assign

      if (keyCount >= maxKeysPerUser) {
        return res.status(400).json({
          error: 'Key limit reached',
          message: `You can have a maximum of ${maxKeysPerUser} active API keys. Please revoke an existing key first.`
        });
      }

      const result = await generateApiKey(userId, name || 'My API Key');

      res.status(201).json({
        success: true,
        message: 'API key generated successfully. Copy it now - it will not be shown again.',
        key: result.key,
        key_id: result.keyId,
        key_prefix: result.keyPrefix
      });
    } catch (error) {
      console.error('Error generating API key:', error);
      res.status(500).json({ error: 'Failed to generate API key' });
    }

  } else if (req.method === 'DELETE') {
    // Revoke/delete own API key
    const { key_id, permanent } = req.body;

    if (!key_id) {
      return res.status(400).json({ error: 'key_id is required' });
    }

    try {
      let success;
      if (permanent) {
        // Verify ownership and delete
        success = await deleteApiKey(parseInt(key_id), userId);
      } else {
        // Verify ownership and revoke
        success = await revokeApiKey(parseInt(key_id), userId);
      }

      if (success) {
        res.status(200).json({
          success: true,
          message: permanent ? 'API key deleted permanently' : 'API key revoked successfully'
        });
      } else {
        res.status(404).json({ error: 'API key not found or not owned by you' });
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({ error: 'Failed to revoke API key' });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
