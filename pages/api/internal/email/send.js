/**
 * Internal API: Send Email
 * POST /api/internal/email/send
 *
 * Body:
 * - to: Email recipient (required)
 * - subject: Email subject (required)
 * - html: HTML content (required if text not provided)
 * - text: Plain text content (optional)
 * - from_name: Override sender name (optional)
 * - from_email: Override sender email (optional)
 */

import { withInternalAuth } from '@/lib/internal-auth';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'site_builder.db');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, text, from_name, from_email } = req.body;

  // Validation
  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Required: to, subject, and either html or text'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const db = new Database(dbPath);

    // Get email settings
    const settings = db.prepare('SELECT * FROM email_settings WHERE id = 1').get();

    if (!settings || !settings.resend_api_key) {
      db.close();
      return res.status(503).json({
        error: 'Email service not configured',
        message: 'Admin needs to configure email settings with Resend API key'
      });
    }

    // Send email using Resend
    const { Resend } = require('resend');
    const resend = new Resend(settings.resend_api_key);

    const emailData = {
      from: `${from_name || settings.from_name} <${from_email || settings.from_email}>`,
      to: [to],
      subject: subject,
      html: html,
      text: text
    };

    const result = await resend.emails.send(emailData);

    // Log the email
    db.prepare(`
      INSERT INTO email_logs (recipient_email, subject, status, resend_message_id, sent_at)
      VALUES (?, ?, 'sent', ?, CURRENT_TIMESTAMP)
    `).run(to, subject, result.data?.id || null);

    db.close();

    return res.status(200).json({
      success: true,
      message_id: result.data?.id,
      recipient: to
    });

  } catch (error) {
    console.error('[Internal API] Send email error:', error);

    // Log failed email attempt
    try {
      const db = new Database(dbPath);
      db.prepare(`
        INSERT INTO email_logs (recipient_email, subject, status, error_message, sent_at)
        VALUES (?, ?, 'failed', ?, CURRENT_TIMESTAMP)
      `).run(to, subject, error.message);
      db.close();
    } catch (logError) {
      console.error('[Internal API] Failed to log email error:', logError);
    }

    return res.status(500).json({
      error: 'Failed to send email',
      message: error.message
    });
  }
}

export default withInternalAuth(handler);
