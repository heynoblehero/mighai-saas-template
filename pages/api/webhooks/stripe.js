import db from '../../../lib/database';
import Stripe from 'stripe';

/**
 * Stripe Webhook Handler
 * Handles subscription events from Stripe
 * Webhook URL: https://yourdomain.com/api/webhooks/stripe
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16',
});

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
      provider TEXT DEFAULT 'stripe',
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

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
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
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    // Verify webhook signature
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid signature' });
      }
    } else {
      event = JSON.parse(rawBody.toString());
    }

    console.log('Stripe webhook received:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log('Unhandled event type:', event.type);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutCompleted(session) {
  const customerEmail = session.customer_email;
  const subscriptionId = session.subscription;
  
  console.log('Checkout completed for:', customerEmail);
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(customerEmail);
  
  if (user && subscriptionId) {
    db.prepare(`
      UPDATE users 
      SET 
        subscription_status = 'active',
        stripe_customer_id = ?,
        stripe_subscription_id = ?,
        subscription_start_date = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      session.customer,
      subscriptionId,
      user.id
    );
  }
}

async function handleSubscriptionCreated(subscription) {
  const customerId = subscription.customer;
  
  const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId);
  
  if (user) {
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    
    db.prepare(`
      UPDATE users 
      SET 
        subscription_status = 'active',
        stripe_subscription_id = ?,
        subscription_start_date = datetime('now'),
        subscription_end_date = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      subscription.id,
      periodEnd,
      user.id
    );
  }
}

async function handleSubscriptionUpdated(subscription) {
  const user = db.prepare('SELECT * FROM users WHERE stripe_subscription_id = ?').get(subscription.id);
  
  if (user) {
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    const status = subscription.status === 'active' ? 'active' : subscription.status;
    
    db.prepare(`
      UPDATE users 
      SET 
        subscription_status = ?,
        subscription_end_date = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      status,
      periodEnd,
      user.id
    );
  }
}

async function handleSubscriptionDeleted(subscription) {
  const user = db.prepare('SELECT * FROM users WHERE stripe_subscription_id = ?').get(subscription.id);
  
  if (user) {
    db.prepare(`
      UPDATE users 
      SET 
        subscription_status = 'cancelled',
        subscription_end_date = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id);
  }
}

async function handlePaymentSucceeded(invoice) {
  ensurePaymentTransactionsTable();

  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId);

  if (user) {
    // Log successful payment
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
      invoice.id,
      invoice.amount_paid / 100, // Stripe amounts are in cents
      invoice.currency,
      'completed',
      'stripe'
    );
  }
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  
  const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId);
  
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
