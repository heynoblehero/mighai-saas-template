const telegramOTPService = require('../../../services/telegramOTPService');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, otp, actionType } = req.body;

  if (!userId || !otp || !actionType) {
    return res.status(400).json({ error: 'User ID, OTP, and action type are required' });
  }

  try {
    const result = await telegramOTPService.verifyOTP(userId, otp, actionType);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Verify 2FA OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
}
