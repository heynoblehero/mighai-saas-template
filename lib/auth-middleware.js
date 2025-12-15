import { getSession } from './session.js';

/**
 * Authentication middleware for Next.js API routes
 * Checks for valid session token in cookies
 */
export async function requireAdminAuth(req, res) {
  try {
    // Method 1: Check for Express/Passport session (req.user set by passport)
    if (req.user && req.user.role === 'admin') {
      return {
        authenticated: true,
        user: req.user
      };
    }

    // Method 2: Check for session_token cookie (Next.js session from OTP verification)
    const sessionToken = req.cookies?.session_token;
    if (sessionToken) {
      const session = await getSession(sessionToken);
      if (session && session.user.role === 'admin') {
        return {
          authenticated: true,
          user: session.user
        };
      }
    }

    return {
      authenticated: false,
      error: 'Authentication required',
      status: 401
    };

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return {
      authenticated: false,
      error: 'Authentication failed',
      status: 500
    };
  }
}

/**
 * Wrapper function to easily add auth to API routes
 * Usage: export default withAdminAuth(handler);
 */
export function withAdminAuth(handler) {
  return async (req, res) => {
    const authResult = await requireAdminAuth(req, res);

    if (!authResult.authenticated) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Add user to request object
    req.user = authResult.user;

    // Call the actual handler
    return handler(req, res);
  };
}

