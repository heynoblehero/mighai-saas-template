const emailService = require('../../../services/emailService');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, campaignId } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  try {
    // Get admin email from settings
    const settings = await emailService.getEmailSettings();
    
    // Send OTP for campaign actions
    await emailService.sendOTP(settings.admin_email, 'campaign_send', 10);
    
    res.status(200).json({ message: 'OTP sent successfully' });
    
  } catch (error) {
    console.error('Failed to send campaign OTP:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
}