const emailService = require('../../../services/emailService');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Send new OTP
    await emailService.sendOTP(email, 'admin_login', 10);
    
    res.status(200).json({ message: 'New OTP sent successfully' });
    
  } catch (error) {
    console.error('Failed to resend admin OTP:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
}