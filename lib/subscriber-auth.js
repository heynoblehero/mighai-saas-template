// lib/subscriber-auth.js
// Subscriber authentication middleware for Next.js API routes
import jwt from 'jsonwebtoken';
import config from './config';

/**
 * Extract and validate subscriber from request
 * @param {Object} req - Next.js API request object
 * @returns {Object} - { user, error }
 */
export async function getSubscriberFromRequest(req) {
  const token = req.cookies['auth-token'];
  if (!token) {
    return { user: null, error: 'Not authenticated' };
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Ensure the user is a subscriber (not admin)
    if (decoded.role !== 'subscriber') {
      return { user: null, error: 'Not a subscriber' };
    }

    return {
      user: {
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role
      },
      error: null
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { user: null, error: 'Token expired' };
    }
    return { user: null, error: 'Invalid token' };
  }
}

/**
 * Higher-order function to wrap API handlers with subscriber authentication
 * @param {Function} handler - Next.js API handler function
 * @returns {Function} - Wrapped handler that requires subscriber auth
 */
export function withSubscriberAuth(handler) {
  return async (req, res) => {
    const { user, error } = await getSubscriberFromRequest(req);

    if (!user) {
      return res.status(401).json({ error: error || 'Unauthorized' });
    }

    // Attach subscriber to request for use in handler
    req.subscriber = user;
    return handler(req, res);
  };
}

/**
 * Check if request has valid subscriber auth (non-blocking)
 * Useful for optional auth scenarios
 * @param {Object} req - Next.js API request object
 * @returns {Object|null} - Subscriber user object or null
 */
export async function getOptionalSubscriber(req) {
  const { user } = await getSubscriberFromRequest(req);
  return user;
}
