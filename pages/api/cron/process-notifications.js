import telegramNotifier from '../../../lib/telegram.js';

export default async function handler(req, res) {
  // Simple authentication - you can improve this with proper API keys
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'default-cron-secret'}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Process the notification queue
    await telegramNotifier.processQueue();

    res.status(200).json({ 
      success: true, 
      message: 'Notification queue processed successfully'
    });

  } catch (error) {
    console.error('Error processing notification queue:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process notification queue',
      details: error.message
    });
  }
}