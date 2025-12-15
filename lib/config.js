/**
 * Centralized Security Configuration
 * This file provides secure defaults and validates environment variables
 */

// Generate secure random secrets if not provided
function generateSecureSecret() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// Validate required environment variables
function validateConfig() {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key] || process.env[key] === 'your-secret-key');
  
  if (missing.length > 0) {
    console.error('🚨 SECURITY WARNING: Missing or insecure environment variables:', missing);
    console.error('🔧 Please set these environment variables with secure values');
    
    // In development, generate temporary secure secrets
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Generating temporary secure secrets for development');
      missing.forEach(key => {
        process.env[key] = generateSecureSecret();
        console.warn(`Generated temporary ${key}: ${process.env[key].substring(0, 8)}...`);
      });
    } else {
      throw new Error('Missing required security configuration in production');
    }
  }
}

// Initialize configuration validation
validateConfig();

module.exports = {
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Session Configuration
  SESSION_SECRET: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  COOKIE_SECRET: process.env.COOKIE_SECRET || process.env.JWT_SECRET,
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'sqlite:./site_builder.db',
  
  // Email
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@mighai.com',
  
  // Server
  PORT: parseInt(process.env.PORT) || 3000,
  BASE_URL: process.env.BASE_URL || `http://localhost:${parseInt(process.env.PORT) || 3000}`,

  // Domain Configuration
  DOMAIN: process.env.DOMAIN || 'localhost',
  SERVER_IP: process.env.SERVER_IP || '0.0.0.0',

  // Security Settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  SECURE_COOKIES: process.env.SECURE_COOKIES === 'true' || process.env.NODE_ENV === 'production',
  HTTPS_ONLY: process.env.HTTPS_ONLY === 'true',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // Payment Configuration
  STRIPE: {
    SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
  },
  
  LEMONSQUEEZY: {
    API_KEY: process.env.LEMONSQUEEZY_API_KEY,
    STORE_ID: process.env.LEMONSQUEEZY_STORE_ID,
    WEBHOOK_SECRET: process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  }
};