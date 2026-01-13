import { processEmailQueue } from '../email/campaign-automation';

/**
 * Cron Job: Process Email Queue
 * Run this every 5-15 minutes to send scheduled emails
 * 
 * Setup with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-email-queue",
 *     "schedule": "*/10 * * * *"
 *   }]
 * }
 */

export default async function handler(req, res) {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Processing email queue...');
    const processedCount = await processEmailQueue();
    
    console.log(`Processed ${processedCount} emails from queue`);
    
    res.status(200).json({ 
      success: true, 
      processed: processedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to process email queue:', error);
    res.status(500).json({ error: 'Failed to process email queue' });
  }
}
