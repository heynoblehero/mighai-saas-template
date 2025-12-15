import db from '../../../lib/database.js';
const { withAdminAuth } = require('../../../lib/auth-middleware');

async function handler(req, res) {
  // Redirect users to the new multi-bot system
  return res.status(200).json({
    success: false,
    error: 'This endpoint has been deprecated. Please use the new multi-bot system at /admin/telegram-bots',
    redirectTo: '/admin/telegram-bots',
    migration: {
      description: 'The Telegram notification system now supports multiple bots with individual event subscriptions.',
      instructions: [
        '1. Go to Admin → Telegram Bots',
        '2. Add your bot with token and chat ID',
        '3. Configure event subscriptions for each bot',
        '4. View message history and manage multiple bots'
      ]
    }
  });
}

export default withAdminAuth(handler);