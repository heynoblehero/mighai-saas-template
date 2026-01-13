import db from '../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../lib/config';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = config.JWT_SECRET;

// Track server start time for uptime calculation
const serverStartTime = Date.now();

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Calculate uptime
    const uptimeMs = Date.now() - serverStartTime;
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const uptimeDays = Math.floor(uptimeHours / 24);
    let uptimeString = '99.9%'; // Default high uptime

    if (uptimeDays > 0) {
      uptimeString = `${uptimeDays}d ${uptimeHours % 24}h`;
    } else if (uptimeHours > 0) {
      uptimeString = `${uptimeHours}h`;
    } else {
      const uptimeMinutes = Math.floor(uptimeMs / (1000 * 60));
      uptimeString = `${uptimeMinutes}m`;
    }

    // Calculate response time (simple ping to database)
    const startTime = Date.now();
    db.prepare('SELECT 1').get();
    const responseTime = Date.now() - startTime;

    // Calculate security score based on configuration
    let securityScore = 'B';
    let securityPoints = 0;

    // Check various security settings
    if (process.env.NODE_ENV === 'production') securityPoints += 20;
    if (config.JWT_SECRET && config.JWT_SECRET.length >= 32) securityPoints += 20;
    if (config.SESSION_SECRET && config.SESSION_SECRET.length >= 32) securityPoints += 20;
    if (process.env.HTTPS === 'true' || process.env.NODE_ENV === 'production') securityPoints += 20;
    if (config.COOKIE_SECRET && config.COOKIE_SECRET.length >= 32) securityPoints += 10;
    securityPoints += 10; // Base points for using the security config

    if (securityPoints >= 90) securityScore = 'A+';
    else if (securityPoints >= 80) securityScore = 'A';
    else if (securityPoints >= 70) securityScore = 'B+';
    else if (securityPoints >= 60) securityScore = 'B';
    else if (securityPoints >= 50) securityScore = 'C';
    else securityScore = 'D';

    // Calculate storage used
    let storageUsed = '0 MB';
    let storageTotal = '10 GB'; // Default limit
    try {
      const dbPath = path.join(process.cwd(), 'data', 'site_builder.db');
      const altDbPath = path.join(process.cwd(), 'site_builder.db');

      let dbSize = 0;
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbSize = stats.size;
      } else if (fs.existsSync(altDbPath)) {
        const stats = fs.statSync(altDbPath);
        dbSize = stats.size;
      }

      // Format size
      if (dbSize < 1024 * 1024) {
        storageUsed = `${(dbSize / 1024).toFixed(1)} KB`;
      } else if (dbSize < 1024 * 1024 * 1024) {
        storageUsed = `${(dbSize / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        storageUsed = `${(dbSize / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      }
    } catch (e) {
      console.error('Failed to calculate storage:', e);
    }

    // Get additional metrics
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const pageCount = db.prepare('SELECT COUNT(*) as count FROM pages').get();

    res.status(200).json({
      uptime: uptimeString,
      responseTime: `${responseTime}ms`,
      securityScore: securityScore,
      storageUsed: `${storageUsed} / ${storageTotal}`,
      details: {
        serverStartTime: new Date(serverStartTime).toISOString(),
        uptimeMs: uptimeMs,
        dbResponseMs: responseTime,
        securityPoints: securityPoints,
        totalUsers: userCount?.count || 0,
        totalPages: pageCount?.count || 0,
        nodeEnv: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    console.error('Failed to fetch system health:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
}
