const telegramOTPService = require('../../../services/telegramOTPService');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, actionType, actionData } = req.body;

  if (!userId || !actionType) {
    return res.status(400).json({ error: 'User ID and action type are required' });
  }

  try {
    const result = await telegramOTPService.sendOTP(userId, actionType, actionData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Send 2FA OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
}
