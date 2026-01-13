import db from '../../../lib/database';
import jwt from 'jsonwebtoken';
import config from '../../../lib/config';

/**
 * Email Campaign Automation API
 * Manages automated email campaigns based on user actions
 */

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

  if (req.method === 'GET') {
    // Get all automation rules
    try {
      const automations = db.prepare(`
        SELECT * FROM email_automations 
        ORDER BY created_at DESC
      `).all();

      return res.status(200).json(automations);
    } catch (error) {
      console.error('Failed to fetch automations:', error);
      return res.status(500).json({ error: 'Failed to fetch automations' });
    }
  }

  if (req.method === 'POST') {
    // Create new automation rule
    const { name, trigger, delay_minutes, template_id, is_active } = req.body;

    if (!name || !trigger || !template_id) {
      return res.status(400).json({ error: 'Name, trigger, and template_id are required' });
    }

    try {
      // Ensure table exists
      db.prepare(`
        CREATE TABLE IF NOT EXISTS email_automations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          trigger TEXT NOT NULL,
          delay_minutes INTEGER DEFAULT 0,
          template_id INTEGER NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          sent_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      const result = db.prepare(`
        INSERT INTO email_automations (name, trigger, delay_minutes, template_id, is_active)
        VALUES (?, ?, ?, ?, ?)
      `).run(name, trigger, delay_minutes || 0, template_id, is_active !== false ? 1 : 0);

      const automation = db.prepare('SELECT * FROM email_automations WHERE id = ?').get(result.lastInsertRowid);

      return res.status(201).json(automation);
    } catch (error) {
      console.error('Failed to create automation:', error);
      return res.status(500).json({ error: 'Failed to create automation' });
    }
  }

  if (req.method === 'PUT') {
    // Update automation rule
    const { id, name, trigger, delay_minutes, template_id, is_active } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Automation ID is required' });
    }

    try {
      db.prepare(`
        UPDATE email_automations 
        SET 
          name = COALESCE(?, name),
          trigger = COALESCE(?, trigger),
          delay_minutes = COALESCE(?, delay_minutes),
          template_id = COALESCE(?, template_id),
          is_active = COALESCE(?, is_active),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(name, trigger, delay_minutes, template_id, is_active, id);

      const automation = db.prepare('SELECT * FROM email_automations WHERE id = ?').get(id);

      return res.status(200).json(automation);
    } catch (error) {
      console.error('Failed to update automation:', error);
      return res.status(500).json({ error: 'Failed to update automation' });
    }
  }

  if (req.method === 'DELETE') {
    // Delete automation rule
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Automation ID is required' });
    }

    try {
      db.prepare('DELETE FROM email_automations WHERE id = ?').run(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to delete automation:', error);
      return res.status(500).json({ error: 'Failed to delete automation' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Trigger automation based on user action
 * This function should be called from other parts of the application
 */
export async function triggerAutomation(trigger, userEmail, context = {}) {
  try {
    // Find active automations for this trigger
    const automations = db.prepare(`
      SELECT * FROM email_automations 
      WHERE trigger = ? AND is_active = 1
    `).all(trigger);

    if (automations.length === 0) {
      return;
    }

    // Process each automation
    for (const automation of automations) {
      // Get the template
      const template = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(automation.template_id);
      
      if (!template) {
        continue;
      }

      // Schedule or send email
      if (automation.delay_minutes > 0) {
        // Schedule for later (store in queue table)
        db.prepare(`
          CREATE TABLE IF NOT EXISTS email_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            to_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            scheduled_for DATETIME NOT NULL,
            status TEXT DEFAULT 'pending',
            automation_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        const scheduledTime = new Date(Date.now() + automation.delay_minutes * 60 * 1000).toISOString();

        db.prepare(`
          INSERT INTO email_queue (to_email, subject, body, scheduled_for, automation_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          userEmail,
          template.subject,
          template.body,
          scheduledTime,
          automation.id
        );
      } else {
        // Send immediately
        try {
          const { default: emailService } = await import('../../../services/emailService.js');
          await emailService.sendEmail(userEmail, template.subject, template.body);

          // Increment sent count
          db.prepare(`
            UPDATE email_automations 
            SET sent_count = sent_count + 1 
            WHERE id = ?
          `).run(automation.id);
        } catch (emailError) {
          console.error('Failed to send automation email:', emailError);
        }
      }
    }
  } catch (error) {
    console.error('Failed to trigger automation:', error);
  }
}

/**
 * Process queued emails
 * This should be called by a cron job
 */
export async function processEmailQueue() {
  try {
    const queuedEmails = db.prepare(`
      SELECT * FROM email_queue 
      WHERE status = 'pending' 
        AND scheduled_for <= datetime('now')
      LIMIT 50
    `).all();

    const { default: emailService } = await import('../../../services/emailService.js');

    for (const email of queuedEmails) {
      try {
        await emailService.sendEmail(email.to_email, email.subject, email.body);

        db.prepare(`
          UPDATE email_queue 
          SET status = 'sent', updated_at = datetime('now')
          WHERE id = ?
        `).run(email.id);

        // Increment automation sent count
        if (email.automation_id) {
          db.prepare(`
            UPDATE email_automations 
            SET sent_count = sent_count + 1 
            WHERE id = ?
          `).run(email.automation_id);
        }
      } catch (emailError) {
        console.error('Failed to send queued email:', emailError);
        
        db.prepare(`
          UPDATE email_queue 
          SET status = 'failed', updated_at = datetime('now')
          WHERE id = ?
        `).run(email.id);
      }
    }

    return queuedEmails.length;
  } catch (error) {
    console.error('Failed to process email queue:', error);
    return 0;
  }
}
