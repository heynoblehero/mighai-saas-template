#!/usr/bin/env node

/**
 * Script to initialize email service database tables
 * Run this script to create missing email_settings and email_templates tables
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'site_builder.db');

console.log('Initializing email service database tables...');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath);

// Serialize all database operations to ensure they run sequentially
db.serialize(() => {
  // Create email_settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS email_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_email TEXT NOT NULL,
      from_email TEXT NOT NULL DEFAULT 'noreply@mighai.com',
      from_name TEXT NOT NULL DEFAULT 'Mighai',
      resend_api_key TEXT,
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_username TEXT,
      smtp_password TEXT,
      email_notifications BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating email_settings table:', err);
    } else {
      console.log('✓ email_settings table created');
    }
  });

  // Create email_campaigns table
  db.run(`
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      trigger_condition TEXT,
      email_template_id INTEGER,
      is_active BOOLEAN DEFAULT 1,
      send_delay_hours INTEGER DEFAULT 0,
      target_plan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating email_campaigns table:', err);
    } else {
      console.log('✓ email_campaigns table created');
    }
  });

  // Create email_templates table
  db.run(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      html_content TEXT NOT NULL,
      text_content TEXT,
      template_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating email_templates table:', err);
    } else {
      console.log('✓ email_templates table created');
    }
  });

  // Create email_logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      template_id INTEGER,
      campaign_id INTEGER,
      status TEXT DEFAULT 'sent',
      resend_message_id TEXT,
      error_message TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating email_logs table:', err);
    } else {
      console.log('✓ email_logs table created');
    }
  });

  // Create otp_verifications table
  db.run(`
    CREATE TABLE IF NOT EXISTS otp_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating otp_verifications table:', err);
    } else {
      console.log('✓ otp_verifications table created');
    }
  });

  // Create email_sequences table
  db.run(`
    CREATE TABLE IF NOT EXISTS email_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      sequence_order INTEGER NOT NULL,
      email_template_id INTEGER NOT NULL,
      delay_hours INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (campaign_id) REFERENCES email_campaigns (id),
      FOREIGN KEY (email_template_id) REFERENCES email_templates (id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating email_sequences table:', err);
    } else {
      console.log('✓ email_sequences table created');
    }
  });

  // Insert default settings if not exists
  db.run(`
    INSERT OR IGNORE INTO email_settings (id, admin_email, from_email, from_name)
    VALUES (1, 'admin@mighai.com', 'noreply@mighai.com', 'Mighai')
  `, (err) => {
    if (err) {
      console.error('Error inserting default email settings:', err);
    } else {
      console.log('✓ Default email settings inserted');
    }
  });

  // Insert default email templates
  const defaultTemplates = [
  {
    name: 'Admin Login OTP',
    subject: 'Mighai Admin Login Verification',
    template_type: 'otp',
    html_content: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #00d084; margin: 0; font-size: 24px;">🚀 Mighai</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #00d084;">
          <h2 style="color: #333; margin-top: 0;">Admin Login Verification</h2>
          <p style="color: #666; line-height: 1.6;">Someone is trying to access your admin panel. Please use the following OTP to verify:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #00d084; color: white; padding: 15px 30px; border-radius: 6px; font-size: 24px; font-weight: bold; letter-spacing: 3px; display: inline-block;">{{OTP_CODE}}</div>
          </div>
          <p style="color: #666; line-height: 1.6;">This OTP will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">If this wasn't you, please secure your account immediately.</p>
        </div>
      </div>
    `,
    text_content: 'Your Mighai admin login OTP is: {{OTP_CODE}}. This code expires in 10 minutes.'
  },
  {
    name: 'Customer Signup OTP',
    subject: 'Welcome to Mighai - Verify Your Email',
    template_type: 'otp',
    html_content: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #00d084; margin: 0; font-size: 24px;">🚀 Mighai</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #00d084;">
          <h2 style="color: #333; margin-top: 0;">Welcome to Mighai! 🎉</h2>
          <p style="color: #666; line-height: 1.6;">Thank you for signing up! Please verify your email address with the code below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #00d084; color: white; padding: 15px 30px; border-radius: 6px; font-size: 24px; font-weight: bold; letter-spacing: 3px; display: inline-block;">{{OTP_CODE}}</div>
          </div>
          <p style="color: #666; line-height: 1.6;">This verification code will expire in 15 minutes.</p>
          <p style="color: #666; line-height: 1.6;">Once verified, you'll have full access to your account!</p>
        </div>
      </div>
    `,
    text_content: 'Welcome to Mighai! Your email verification code is: {{OTP_CODE}}. This code expires in 15 minutes.'
  },
  {
    name: 'New Subscriber Notification',
    subject: 'New Subscriber Alert - Mighai',
    template_type: 'transactional',
    html_content: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #00d084; margin: 0; font-size: 24px;">🚀 Mighai Admin</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #00d084;">
          <h2 style="color: #333; margin-top: 0;">New Subscriber! 🎉</h2>
          <p style="color: #666; line-height: 1.6;"><strong>{{USER_EMAIL}}</strong> just subscribed to the <strong>{{PLAN_NAME}}</strong> plan.</p>
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Subscription Details:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>Email:</strong> {{USER_EMAIL}}</li>
              <li><strong>Plan:</strong> {{PLAN_NAME}}</li>
              <li><strong>Time:</strong> {{SUBSCRIPTION_TIME}}</li>
              <li><strong>Total Subscribers:</strong> {{TOTAL_SUBSCRIBERS}}</li>
            </ul>
          </div>
          <p style="color: #666; line-height: 1.6;">You can view all subscribers in your admin dashboard.</p>
        </div>
      </div>
    `,
    text_content: 'New subscriber alert: {{USER_EMAIL}} subscribed to {{PLAN_NAME}} plan at {{SUBSCRIPTION_TIME}}.'
  }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO email_templates (name, subject, template_type, html_content, text_content)
    VALUES (?, ?, ?, ?, ?)
  `);

  let templatesInserted = 0;
  defaultTemplates.forEach((template, index) => {
    stmt.run(
      template.name,
      template.subject,
      template.template_type,
      template.html_content,
      template.text_content,
      (err) => {
        if (err) {
          console.error(`Error inserting template '${template.name}':`, err);
        } else {
          templatesInserted++;
          console.log(`✓ Template '${template.name}' inserted`);
        }

        // Close database after last template
        if (index === defaultTemplates.length - 1) {
          stmt.finalize(() => {
            db.close(() => {
              console.log('\n✅ Email service database initialization complete!');
              console.log(`   Tables created: 6`);
              console.log(`   Templates inserted: ${templatesInserted}`);
              console.log('\nYou can now use the email service and signup with OTP verification.');
            });
          });
        }
      }
    );
  });
});
