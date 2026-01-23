import jwt from 'jsonwebtoken';
import config from '../../../../lib/config';
import db from '../../../../lib/database';
import { verifySubscriptionByEmail, getSubscriptionById } from '../../../../services/lemonsqueezyService';

const JWT_SECRET = config.JWT_SECRET;

function getAdmin(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.role === 'admin' ? decoded : null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email, subscriptionId } = req.body;

  if (!userId && !email && !subscriptionId) {
    return res.status(400).json({ error: 'User ID, email, or subscription ID is required' });
  }

  try {
    // Check if API key is configured
    if (!process.env.LEMONSQUEEZY_API_KEY) {
      return res.status(400).json({
        error: 'LemonSqueezy API key not configured',
        message: 'Please set LEMONSQUEEZY_API_KEY in your environment variables'
      });
    }

    let userEmail = email;

    // If userId provided, get email from database
    if (userId && !userEmail) {
      const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      userEmail = user.email;
    }

    let result;

    if (subscriptionId) {
      // Verify specific subscription by ID
      const subscription = await getSubscriptionById(subscriptionId);

      if (!subscription) {
        return res.status(404).json({
          error: 'Subscription not found',
          hasActiveSubscription: false
        });
      }

      const isActive = ['active', 'on_trial'].includes(subscription.status);

      result = {
        hasActiveSubscription: isActive,
        subscription,
        verifiedAt: new Date().toISOString()
      };
    } else if (userEmail) {
      // Verify by email
      const verification = await verifySubscriptionByEmail(userEmail);

      result = {
        email: userEmail,
        hasActiveSubscription: verification.hasActiveSubscription,
        subscriptions: verification.subscriptions,
        verifiedAt: new Date().toISOString()
      };
    } else {
      return res.status(400).json({ error: 'Unable to verify - no valid identifier provided' });
    }

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return res.status(500).json({
      error: 'Failed to verify subscription',
      message: error.message
    });
  }
}
