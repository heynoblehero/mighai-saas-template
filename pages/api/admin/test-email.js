const emailService = require('../../../services/emailService');
const { withAdminAuth } = require('../../../lib/auth-middleware');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const testEmailContent = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #00d084; margin: 0; font-size: 24px;">🚀 Mighai</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #00d084;">
          <h2 style="color: #333; margin-top: 0;">Email Configuration Test ✅</h2>
          <p style="color: #666; line-height: 1.6;">
            Congratulations! Your email settings are working correctly. 
            This test email confirms that:
          </p>
          <ul style="color: #666; line-height: 1.8; margin: 20px 0;">
            <li>✅ SMTP/Resend configuration is valid</li>
            <li>✅ Email delivery is working</li>
            <li>✅ Admin notifications will be sent</li>
            <li>✅ Customer emails will be delivered</li>
          </ul>
          <p style="color: #666; line-height: 1.6;">
            Your email system is ready to handle OTP verifications, admin notifications, and customer campaigns.
          </p>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            Sent from Mighai Admin Panel at ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;

    await emailService.sendEmail(
      email,
      'Mighai Email Test - Configuration Successful',
      testEmailContent,
      'Email configuration test successful! Your Mighai email system is working correctly.'
    );

    res.status(200).json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Failed to send test email:', error);
    res.status(500).json({ error: 'Failed to send test email. Please check your email settings.' });
  }
}

export default withAdminAuth(handler);