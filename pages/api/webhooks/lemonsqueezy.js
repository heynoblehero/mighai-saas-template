import db from '../../../lib/database';
import crypto from 'crypto';

/**
 * Lemon Squeezy Webhook Handler
 * Handles subscription events from Lemon Squeezy
 * Webhook URL: https://yourdomain.com/api/webhooks/lemonsqueezy
 */

// Ensure payment_transactions table exists
function ensurePaymentTransactionsTable() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT,
      user_id INTEGER,
      transaction_id TEXT UNIQUE,
      amount REAL,
      currency TEXT DEFAULT 'usd',
      status TEXT DEFAULT 'pending',
      provider TEXT DEFAULT 'lemonsqueezy',
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `).run();

  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_payment_transactions_tx ON payment_transactions(transaction_id)').run();
  } catch (e) {
    // Index might already exist
  }
}

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-signature'];
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    // Verify webhook signature
    if (secret && signature) {
      const isValid = verifySignature(rawBody, signature, secret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.meta?.event_name;
    
    console.log('Lemon Squeezy webhook received:', eventType);

    switch (eventType) {
      case 'order_created':
        await handleOrderCreated(event);
        break;
      
      case 'subscription_created':
        await handleSubscriptionCreated(event);
        break;
      
      case 'subscription_updated':
        await handleSubscriptionUpdated(event);
        break;
      
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(event);
        break;
      
      case 'subscription_resumed':
        await handleSubscriptionResumed(event);
        break;
      
      case 'subscription_expired':
        await handleSubscriptionExpired(event);
        break;
      
      case 'subscription_paused':
        await handleSubscriptionPaused(event);
        break;
      
      case 'subscription_unpaused':
        await handleSubscriptionUnpaused(event);
        break;
      
      case 'subscription_payment_success':
        await handlePaymentSuccess(event);
        break;
      
      case 'subscription_payment_failed':
        await handlePaymentFailed(event);
        break;
      
      default:
        console.log('Unhandled event type:', eventType);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleOrderCreated(event) {
  ensurePaymentTransactionsTable();

  const { data } = event;
  const customerEmail = data.attributes.user_email;

  console.log('Order created for:', customerEmail);

  // Log the transaction
  db.prepare(`
    INSERT INTO payment_transactions (
      user_email,
      transaction_id,
      amount,
      currency,
      status,
      provider,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    customerEmail,
    data.id,
    data.attributes.total,
    data.attributes.currency,
    'completed',
    'lemonsqueezy'
  );
}

async function handleSubscriptionCreated(event) {
  const { data } = event;
  const customerEmail = data.attributes.user_email;
  const variantId = data.attributes.variant_id;
  
  console.log('Subscription created for:', customerEmail);
  
  // Find user by email
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(customerEmail);
  
  if (user) {
    // Update user subscription status
    db.prepare(`
      UPDATE users 
      SET 
        subscription_status = 'active',
        subscription_start_date = datetime('now'),
        subscription_end_date = ?,
        lemonsqueezy_subscription_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.attributes.renews_at,
      data.id,
      user.id
    );
    
    // Send welcome email (optional)
    try {
      const { default: emailService } = await import('../../../services/emailService.js');
      await emailService.sendEmail(
        customerEmail,
        'Welcome to Premium!',
        `Your subscription is now active. Thank you for subscribing!`
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }
  }
}

async function handleSubscriptionUpdated(event) {
  const { data } = event;
  const subscriptionId = data.id;
  
  console.log('Subscription updated:', subscriptionId);
  
  const user = db.prepare('SELECT * FROM users WHERE lemonsqueezy_subscription_id = ?').get(subscriptionId);
  
  if (user) {
    db.prepare(`
      UPDATE users 
      SET 
        subscription_end_date = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.attributes.renews_at,
      user.id
    );
  }
}

async function handleSubscriptionCancelled(event) {
  const { data } = event;
  const subscriptionId = data.id;
  
  console.log('Subscription cancelled:', subscriptionId);
  
  const user = db.prepare('SELECT * FROM users WHERE lemonsqueezy_subscription_id = ?').get(subscriptionId);
  
  if (user) {
    db.prepare(`
      UPDATE users 
      SET 
        subscription_status = 'cancelled',
        subscription_end_date = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.attributes.ends_at,
      user.id
    );
  }
}

async function handleSubscriptionResumed(event) {
  const { data } = event;
  const subscriptionId = data.id;
  
  console.log('Subscription resumed:', subscriptionId);
  
  const user = db.prepare('SELECT * FROM users WHERE lemonsqueezy_subscription_id = ?').get(subscriptionId);
  
  if (user) {
    db.prepare(`
      UPDATE users 
      SET 
        subscription_status = 'active',
        subscription_end_date = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.attributes.renews_at,
      user.id
    );
  }
}

async function handleSubscriptionExpired(event) {
  const { data } = event;
  const subscriptionId = data.id;
  
  console.log('Subscription expired:', subscriptionId);
  
  const user = db.prepare('SELECT * FROM users WHERE lemonsqueezy_subscription_id = ?').get(subscriptionId);
  
  if (user) {
    db.prepare(`
      UPDATE users 
      SET 
        subscription_status = 'expired',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id);
  }
}

async function handleSubscriptionPaused(event) {
  const { data } = event;
  const subscriptionId = data.id;
  
  console.log('Subscription paused:', subscriptionId);
  
  const user = db.prepare('SELECT * FROM users WHERE lemonsqueezy_subscription_id = ?').get(subscriptionId);
  
  if (user) {
    db.prepare(`
      UPDATE users 
      SET 
        subscription_status = 'paused',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id);
  }
}

async function handleSubscriptionUnpaused(event) {
  const { data } = event;
  const subscriptionId = data.id;
  
  console.log('Subscription unpaused:', subscriptionId);
  
  const user = db.prepare('SELECT * FROM users WHERE lemonsqueezy_subscription_id = ?').get(subscriptionId);
  
  if (user) {
    db.prepare(`
      UPDATE users 
      SET 
        subscription_status = 'active',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id);
  }
}

async function handlePaymentSuccess(event) {
  ensurePaymentTransactionsTable();

  const { data } = event;
  const subscriptionId = data.attributes.subscription_id;

  console.log('Payment succeeded for subscription:', subscriptionId);

  // Log successful payment
  const user = db.prepare('SELECT * FROM users WHERE lemonsqueezy_subscription_id = ?').get(subscriptionId);

  if (user) {
    db.prepare(`
      INSERT INTO payment_transactions (
        user_email,
        user_id,
        transaction_id,
        amount,
        currency,
        status,
        provider,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      user.email,
      user.id,
      data.id,
      data.attributes.total,
      data.attributes.currency,
      'completed',
      'lemonsqueezy'
    );
  }
}

async function handlePaymentFailed(event) {
  const { data } = event;
  const subscriptionId = data.attributes.subscription_id;
  
  console.log('Payment failed for subscription:', subscriptionId);
  
  const user = db.prepare('SELECT * FROM users WHERE lemonsqueezy_subscription_id = ?').get(subscriptionId);
  
  if (user) {
    // Send payment failed notification
    try {
      const { default: emailService } = await import('../../../services/emailService.js');
      await emailService.sendEmail(
        user.email,
        'Payment Failed',
        `Your recent payment failed. Please update your payment method to continue your subscription.`
      );
    } catch (emailError) {
      console.error('Failed to send payment failed email:', emailError);
    }
  }
}
