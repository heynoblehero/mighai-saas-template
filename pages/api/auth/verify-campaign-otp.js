const emailService = require('../../../services/emailService');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { otp, action, campaignId } = req.body;

  if (!otp || !action) {
    return res.status(400).json({ error: 'OTP and action are required' });
  }

  try {
    // Get admin email from settings
    const settings = await emailService.getEmailSettings();
    
    // Verify OTP
    const isValidOTP = await emailService.verifyOTP(settings.admin_email, otp, 'campaign_send');
    
    if (!isValidOTP) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    res.status(200).json({ 
      message: 'OTP verified successfully',
      action: action,
      campaignId: campaignId 
    });

  } catch (error) {
    console.error('Campaign OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}