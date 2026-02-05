const { Resend } = require('resend');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize Resend - In production, use environment variable
const config = require('../lib/config');

// Lazy-initialize Resend to avoid crashes when API key is not set
let resend = null;
function getResendClient() {
  if (!resend) {
    const apiKey = config.RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (apiKey && apiKey !== 'undefined' && apiKey !== 're_test_placeholder') {
      resend = new Resend(apiKey);
    }
  }
  return resend;
}

// Database setup - use process.cwd() for consistency with Next.js
const dbPath = path.join(process.cwd(), 'site_builder.db');

// Shared database connection with busy timeout to prevent SQLITE_BUSY errors
let sharedDb = null;
let dbInitialized = false;

function getDb() {
  if (!sharedDb) {
    sharedDb = new sqlite3.Database(dbPath);
    sharedDb.run('PRAGMA busy_timeout = 5000');
    sharedDb.run('PRAGMA journal_mode = WAL');
  }
  return sharedDb;
}

class EmailService {
  constructor() {
    // Initialize database tables once at startup
    this.initDatabase();
  }

  initDatabase() {
    if (dbInitialized) return;
    dbInitialized = true;

    const db = getDb();

    // Use serialize to ensure tables are created before inserts
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
        email_list_api_key TEXT,
        support_reply_notifications BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: Add missing columns for older databases
    db.run(`ALTER TABLE email_settings ADD COLUMN email_list_api_key TEXT`, () => {});
    db.run(`ALTER TABLE email_settings ADD COLUMN support_reply_notifications BOOLEAN DEFAULT 1`, () => {});

    // Create email_campaigns table
    db.run(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL, -- 'welcome', 'onboarding', 'newsletter', 'marketing'
        trigger_condition TEXT, -- JSON string with conditions
        email_template_id INTEGER,
        is_active BOOLEAN DEFAULT 1,
        send_delay_hours INTEGER DEFAULT 0,
        target_plan TEXT, -- 'free', 'basic', 'pro', 'enterprise', 'all'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email_templates table
    db.run(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT,
        template_type TEXT NOT NULL, -- 'campaign', 'transactional', 'otp'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email_logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        template_id INTEGER,
        campaign_id INTEGER,
        status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'bounced'
        resend_message_id TEXT,
        error_message TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create otp_verifications table
    db.run(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        purpose TEXT NOT NULL, -- 'admin_login', 'customer_signup', 'campaign_send'
        expires_at DATETIME NOT NULL,
        verified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
    `);

    // Insert default settings if not exists
    db.run(`
      INSERT OR IGNORE INTO email_settings (id, admin_email, from_email, from_name)
      VALUES (1, 'admin@mighai.com', 'noreply@mighai.com', 'Mighai')
    `);

      // Insert default email templates
      this.insertDefaultTemplates(db);
    }); // End serialize
  }

  insertDefaultTemplates(db) {
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
      },
      {
        name: 'Welcome Email Sequence - Day 1',
        subject: 'Welcome to Mighai - Let\'s get you started! 🚀',
        template_type: 'campaign',
        html_content: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #00d084; margin: 0; font-size: 24px;">🚀 Mighai</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #00d084;">
              <h2 style="color: #333; margin-top: 0;">Welcome to the future! 🎉</h2>
              <p style="color: #666; line-height: 1.6;">Hi {{USER_NAME}},</p>
              <p style="color: #666; line-height: 1.6;">Welcome to Mighai! We're excited to have you on board. You've just joined a community of innovators who are transforming their businesses with our platform.</p>
              <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">What's next?</h3>
                <ul style="color: #666; line-height: 1.8;">
                  <li>✅ Complete your profile setup</li>
                  <li>🔧 Explore our powerful features</li>
                  <li>📊 Set up your first project</li>
                  <li>🚀 Start building amazing things</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{DASHBOARD_LINK}}" style="background: #00d084; color: white; padding: 15px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">Get Started Now</a>
              </div>
              <p style="color: #666; line-height: 1.6;">If you have any questions, just reply to this email. We're here to help!</p>
              <p style="color: #666; line-height: 1.6;">Best regards,<br>The Mighai Team</p>
            </div>
          </div>
        `,
        text_content: 'Welcome to Mighai! Get started by visiting your dashboard: {{DASHBOARD_LINK}}'
      },
      {
        name: 'Error Notification',
        subject: 'System Error Alert - Mighai',
        template_type: 'transactional',
        html_content: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #ff6d6d; margin: 0; font-size: 24px;">⚠️ Mighai Alert</h1>
            </div>
            <div style="background: #fef2f2; padding: 30px; border-radius: 8px; border-left: 4px solid #ff6d6d;">
              <h2 style="color: #dc2626; margin-top: 0;">System Error Detected</h2>
              <p style="color: #666; line-height: 1.6;">An error has occurred in your Mighai system:</p>
              <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #fecaca;">
                <h3 style="margin-top: 0; color: #dc2626;">Error Details:</h3>
                <ul style="color: #666; line-height: 1.8;">
                  <li><strong>Error Type:</strong> {{ERROR_TYPE}}</li>
                  <li><strong>Message:</strong> {{ERROR_MESSAGE}}</li>
                  <li><strong>Time:</strong> {{ERROR_TIME}}</li>
                  <li><strong>Affected Component:</strong> {{COMPONENT}}</li>
                </ul>
              </div>
              <p style="color: #666; line-height: 1.6;">Please check your admin dashboard for more details and take necessary action.</p>
            </div>
          </div>
        `,
        text_content: 'System error detected: {{ERROR_TYPE}} - {{ERROR_MESSAGE}} at {{ERROR_TIME}}'
      },
      {
        name: 'Support Query Notification',
        subject: 'New Support Request - Mighai',
        template_type: 'transactional',
        html_content: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #006fbb; margin: 0; font-size: 24px;">💬 Mighai Support</h1>
            </div>
            <div style="background: #f0f9ff; padding: 30px; border-radius: 8px; border-left: 4px solid #006fbb;">
              <h2 style="color: #1e40af; margin-top: 0;">New Support Request</h2>
              <p style="color: #666; line-height: 1.6;">You have received a new support request:</p>
              <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Request Details:</h3>
                <ul style="color: #666; line-height: 1.8;">
                  <li><strong>From:</strong> {{USER_EMAIL}}</li>
                  <li><strong>Subject:</strong> {{SUBJECT}}</li>
                  <li><strong>Priority:</strong> {{PRIORITY}}</li>
                  <li><strong>Time:</strong> {{REQUEST_TIME}}</li>
                </ul>
                <div style="margin-top: 15px;">
                  <strong>Message:</strong>
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 10px; font-style: italic;">
                    {{MESSAGE}}
                  </div>
                </div>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{ADMIN_SUPPORT_LINK}}" style="background: #006fbb; color: white; padding: 15px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">View in Admin Panel</a>
              </div>
            </div>
          </div>
        `,
        text_content: 'New support request from {{USER_EMAIL}}: {{SUBJECT}} - {{MESSAGE}}'
      },
      {
        name: 'Support Reply Notification',
        subject: 'Reply to Your Support Request - {{SITE_NAME}}',
        template_type: 'transactional',
        html_content: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #00d084; margin: 0; font-size: 24px;">{{SITE_NAME}}</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #00d084;">
              <h2 style="color: #333; margin-top: 0;">New Reply to Your Support Request</h2>
              <p style="color: #666; line-height: 1.6;">Hi {{USER_NAME}},</p>
              <p style="color: #666; line-height: 1.6;">We've responded to your support request:</p>
              <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 3px solid #00d084;">
                <p style="color: #333; line-height: 1.6; margin: 0;">{{REPLY_MESSAGE}}</p>
              </div>
              <p style="color: #666; line-height: 1.6;">You can continue the conversation by visiting our website and opening the support chat.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{SITE_URL}}" style="background: #00d084; color: white; padding: 15px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">Visit Our Site</a>
              </div>
              <p style="color: #999; font-size: 14px; margin-top: 30px;">Thank you for reaching out to us!</p>
            </div>
          </div>
        `,
        text_content: 'Hi {{USER_NAME}}, we have replied to your support request: {{REPLY_MESSAGE}}. Visit {{SITE_URL}} to continue the conversation.'
      },
      {
        name: 'Welcome - Account Created from Purchase',
        subject: 'Welcome to {{SITE_NAME}} - Your Account is Ready!',
        template_type: 'transactional',
        html_content: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #00d084; margin: 0; font-size: 24px;">🎉 {{SITE_NAME}}</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #00d084;">
              <h2 style="color: #333; margin-top: 0;">Welcome! Your Account is Ready</h2>
              <p style="color: #666; line-height: 1.6;">Hi {{USER_NAME}},</p>
              <p style="color: #666; line-height: 1.6;">Thank you for your purchase! We've automatically created an account for you. Here are your login credentials:</p>
              <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px;">Your Login Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; width: 100px;">Email:</td>
                    <td style="padding: 8px 0; color: #333; font-weight: 500;">{{EMAIL}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Password:</td>
                    <td style="padding: 8px 0; font-family: monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; color: #333; font-weight: bold;">{{TEMP_PASSWORD}}</td>
                  </tr>
                </table>
              </div>
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 3px solid #f59e0b;">
                <p style="color: #92400e; margin: 0; font-size: 14px;"><strong>Important:</strong> Please change your password after your first login for security.</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{LOGIN_URL}}" style="background: #00d084; color: white; padding: 15px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Log In to Your Account</a>
              </div>
              <p style="color: #666; line-height: 1.6;">Your subscription is now active and you have full access to all features included in your plan.</p>
              <p style="color: #666; line-height: 1.6;">If you have any questions, feel free to reach out to our support team.</p>
              <p style="color: #999; font-size: 14px; margin-top: 30px;">Welcome aboard!<br>The {{SITE_NAME}} Team</p>
            </div>
          </div>
        `,
        text_content: 'Welcome to {{SITE_NAME}}! Your account has been created. Email: {{EMAIL}}, Temporary Password: {{TEMP_PASSWORD}}. Please log in at {{LOGIN_URL}} and change your password. Your subscription is now active!'
      }
    ];

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO email_templates (name, subject, template_type, html_content, text_content)
      VALUES (?, ?, ?, ?, ?)
    `);

    defaultTemplates.forEach(template => {
      stmt.run(template.name, template.subject, template.template_type, template.html_content, template.text_content);
    });

    stmt.finalize();
  }

  // Generate OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP in database
  async storeOTP(email, purpose, otpCode, expirationMinutes = 10) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();

      db.run(
        `INSERT INTO otp_verifications (email, otp_code, purpose, expires_at)
         VALUES (?, ?, ?, ?)`,
        [email, otpCode, purpose, expiresAt],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Verify OTP
  async verifyOTP(email, otpCode, purpose) {
    return new Promise((resolve, reject) => {
      const db = getDb();

      db.get(
        `SELECT * FROM otp_verifications
         WHERE email = ? AND otp_code = ? AND purpose = ?
         AND expires_at > datetime('now') AND verified = 0`,
        [email, otpCode, purpose],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            // Mark as verified
            db.run(
              `UPDATE otp_verifications SET verified = 1 WHERE id = ?`,
              [row.id],
              (updateErr) => {
                if (updateErr) reject(updateErr);
                else resolve(true);
              }
            );
          } else {
            resolve(false);
          }
        }
      );
    });
  }

  // Get email template
  async getEmailTemplate(templateName) {
    return new Promise((resolve, reject) => {
      const db = getDb();

      db.get(
        `SELECT * FROM email_templates WHERE name = ?`,
        [templateName],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Replace template variables
  replaceTemplateVariables(content, variables) {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  // Send email using Resend
  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      const resendClient = getResendClient();
      if (!resendClient) {
        console.warn('Email service: Resend API key not configured. Email not sent to:', to);
        return { data: { id: 'mock-' + Date.now() }, error: null };
      }

      const settings = await this.getEmailSettings();

      const emailData = {
        from: `${settings.from_name} <${settings.from_email}>`,
        to: [to],
        subject: subject,
        html: htmlContent,
      };

      if (textContent) {
        emailData.text = textContent;
      }

      const result = await resendClient.emails.send(emailData);
      
      // Log email
      await this.logEmail(to, subject, null, null, 'sent', result.data?.id);
      
      return result;
    } catch (error) {
      await this.logEmail(to, subject, null, null, 'failed', null, error.message);
      throw error;
    }
  }

  // Send OTP email
  async sendOTP(email, purpose, expirationMinutes = 10) {
    try {
      const otpCode = this.generateOTP();
      await this.storeOTP(email, purpose, otpCode, expirationMinutes);

      // Check if email service is configured
      const resendClient = getResendClient();
      if (!resendClient) {
        console.warn('Email service not configured. OTP generated but not sent:', otpCode);
        return { otpCode, emailSent: false };
      }

      let templateName;
      switch (purpose) {
        case 'admin_login':
          templateName = 'Admin Login OTP';
          break;
        case 'customer_signup':
          templateName = 'Customer Signup OTP';
          break;
        default:
          templateName = 'Admin Login OTP';
      }

      const template = await this.getEmailTemplate(templateName);
      if (!template) {
        console.warn(`Email template not found: ${templateName}. OTP generated but not sent.`);
        return { otpCode, emailSent: false };
      }

      const variables = { OTP_CODE: otpCode };
      const htmlContent = this.replaceTemplateVariables(template.html_content, variables);
      const textContent = this.replaceTemplateVariables(template.text_content, variables);

      await this.sendEmail(email, template.subject, htmlContent, textContent);

      return { otpCode, emailSent: true };
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  }

  // Check if email service is configured
  isConfigured() {
    return !!getResendClient();
  }

  // Send admin notification
  async sendAdminNotification(type, data) {
    try {
      const settings = await this.getEmailSettings();
      if (!settings.email_notifications) return;

      let templateName, variables = {};
      
      switch (type) {
        case 'new_subscriber':
          templateName = 'New Subscriber Notification';
          variables = {
            USER_EMAIL: data.email,
            PLAN_NAME: data.planName,
            SUBSCRIPTION_TIME: new Date().toLocaleString(),
            TOTAL_SUBSCRIBERS: data.totalSubscribers || 'N/A'
          };
          break;
          
        case 'system_error':
          templateName = 'Error Notification';
          variables = {
            ERROR_TYPE: data.errorType,
            ERROR_MESSAGE: data.errorMessage,
            ERROR_TIME: new Date().toLocaleString(),
            COMPONENT: data.component || 'Unknown'
          };
          break;
          
        case 'support_request':
          templateName = 'Support Query Notification';
          variables = {
            USER_EMAIL: data.userEmail,
            SUBJECT: data.subject,
            PRIORITY: data.priority || 'Normal',
            REQUEST_TIME: new Date().toLocaleString(),
            MESSAGE: data.message,
            ADMIN_SUPPORT_LINK: `${config.BASE_URL}/admin/support-messages`
          };
          break;
          
        default:
          console.error('Unknown notification type:', type);
          return;
      }
      
      const template = await this.getEmailTemplate(templateName);
      if (!template) {
        console.error(`Email template not found: ${templateName}`);
        return;
      }
      
      const htmlContent = this.replaceTemplateVariables(template.html_content, variables);
      const textContent = this.replaceTemplateVariables(template.text_content, variables);
      
      await this.sendEmail(settings.admin_email, template.subject, htmlContent, textContent);
      
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  }

  // Get email settings
  async getEmailSettings() {
    return new Promise((resolve, reject) => {
      const db = getDb();

      db.get(`SELECT * FROM email_settings WHERE id = 1`, (err, row) => {
        if (err) reject(err);
        else resolve(row || {
          admin_email: 'admin@mighai.com',
          from_email: 'noreply@mighai.com',
          from_name: 'Mighai',
          email_notifications: true,
          email_list_api_key: null,
          support_reply_notifications: true
        });
      });
    });
  }

  // Update email settings
  async updateEmailSettings(settings) {
    return new Promise((resolve, reject) => {
      const db = getDb();

      db.run(
        `UPDATE email_settings SET
         admin_email = ?, from_email = ?, from_name = ?,
         resend_api_key = ?, email_notifications = ?,
         email_list_api_key = COALESCE(?, email_list_api_key),
         support_reply_notifications = COALESCE(?, support_reply_notifications),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        [settings.admin_email, settings.from_email, settings.from_name,
         settings.resend_api_key, settings.email_notifications,
         settings.email_list_api_key, settings.support_reply_notifications],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  // Log email
  async logEmail(recipientEmail, subject, templateId, campaignId, status, resendMessageId, errorMessage = null) {
    return new Promise((resolve, reject) => {
      const db = getDb();

      db.run(
        `INSERT INTO email_logs (recipient_email, subject, template_id, campaign_id, status, resend_message_id, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [recipientEmail, subject, templateId, campaignId, status, resendMessageId, errorMessage],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Send campaign email
  async sendCampaignEmail(email, campaignId, templateId, variables = {}) {
    try {
      const template = await this.getEmailTemplateById(templateId);
      if (!template) {
        throw new Error(`Email template not found: ${templateId}`);
      }
      
      const htmlContent = this.replaceTemplateVariables(template.html_content, variables);
      const textContent = this.replaceTemplateVariables(template.text_content || '', variables);
      
      const result = await this.sendEmail(email, template.subject, htmlContent, textContent);
      
      // Log with campaign info
      await this.logEmail(email, template.subject, templateId, campaignId, 'sent', result.data?.id);
      
      return result;
    } catch (error) {
      await this.logEmail(email, 'Campaign Email', templateId, campaignId, 'failed', null, error.message);
      throw error;
    }
  }

  // Get email template by ID
  async getEmailTemplateById(templateId) {
    return new Promise((resolve, reject) => {
      const db = getDb();

      db.get(
        `SELECT * FROM email_templates WHERE id = ?`,
        [templateId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
}

module.exports = new EmailService();