import { withAdminAuth } from '@/lib/auth-middleware.js';
import {
  generateApiKey,
  listUserApiKeys,
  revokeApiKey,
  deleteApiKey,
  getUserApiKeyCount
} from '@/lib/api-keys.js';
import db from '@/lib/database';

async function handler(req, res) {
  const { id: subscriberId } = req.query;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify the subscriber exists
  const subscriber = db.prepare(
    'SELECT id, email, name, plan_id, api_calls_used FROM users WHERE id = ?'
  ).get(subscriberId);

  if (!subscriber) {
    return res.status(404).json({ error: 'Subscriber not found' });
  }

  // Get plan info for the subscriber
  const plan = db.prepare(
    'SELECT id, name, api_limit FROM plans WHERE id = ?'
  ).get(subscriber.plan_id);

  if (req.method === 'GET') {
    // List all API keys for this subscriber
    try {
      const keys = await listUserApiKeys(parseInt(subscriberId));
      const keyCount = await getUserApiKeyCount(parseInt(subscriberId));

      res.status(200).json({
        subscriber: {
          id: subscriber.id,
          email: subscriber.email,
          name: subscriber.name,
          api_calls_used: subscriber.api_calls_used || 0,
          api_limit: plan?.api_limit || 0,
          plan_name: plan?.name || 'No Plan'
        },
        keys,
        active_key_count: keyCount
      });
    } catch (error) {
      console.error('Error listing API keys:', error);
      res.status(500).json({ error: 'Failed to list API keys' });
    }

  } else if (req.method === 'POST') {
    // Generate a new API key for this subscriber
    const { name } = req.body;

    try {
      // Optional: limit number of active keys per subscriber
      const keyCount = await getUserApiKeyCount(parseInt(subscriberId));
      const maxKeysPerUser = 5; // Configurable limit

      if (keyCount >= maxKeysPerUser) {
        return res.status(400).json({
          error: 'Key limit reached',
          message: `This subscriber already has ${maxKeysPerUser} active API keys. Revoke an existing key first.`
        });
      }

      const result = await generateApiKey(parseInt(subscriberId), name || 'API Key');

      res.status(201).json({
        success: true,
        message: 'API key generated successfully. Copy it now - it will not be shown again.',
        key: result.key, // Full key shown only once
        key_id: result.keyId,
        key_prefix: result.keyPrefix
      });
    } catch (error) {
      console.error('Error generating API key:', error);
      res.status(500).json({ error: 'Failed to generate API key' });
    }

  } else if (req.method === 'DELETE') {
    // Revoke/delete an API key
    const { key_id, permanent } = req.body;

    if (!key_id) {
      return res.status(400).json({ error: 'key_id is required' });
    }

    try {
      let success;
      if (permanent) {
        // Permanently delete the key
        success = await deleteApiKey(parseInt(key_id));
      } else {
        // Just revoke (deactivate) the key
        success = await revokeApiKey(parseInt(key_id));
      }

      if (success) {
        res.status(200).json({
          success: true,
          message: permanent ? 'API key deleted permanently' : 'API key revoked successfully'
        });
      } else {
        res.status(404).json({ error: 'API key not found' });
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({ error: 'Failed to revoke API key' });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAdminAuth(handler);
