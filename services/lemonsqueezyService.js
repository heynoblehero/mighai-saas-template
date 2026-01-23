/**
 * LemonSqueezy Service Layer
 * Handles API interactions with LemonSqueezy for products, variants, and subscriptions
 */

const {
  lemonSqueezySetup,
  listProducts,
  listVariants,
  getProduct,
  getVariant,
  listSubscriptions,
  getSubscription,
  getCustomer
} = require('@lemonsqueezy/lemonsqueezy.js');

let isInitialized = false;

/**
 * Initialize the LemonSqueezy SDK with API key
 */
function initializeLemonSqueezy(apiKey) {
  if (!apiKey) {
    throw new Error('LemonSqueezy API key is required');
  }

  lemonSqueezySetup({ apiKey });
  isInitialized = true;
}

/**
 * Ensure SDK is initialized before making API calls
 */
function ensureInitialized() {
  if (!isInitialized) {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
      throw new Error('LEMONSQUEEZY_API_KEY environment variable is not set');
    }
    initializeLemonSqueezy(apiKey);
  }
}

/**
 * Get the store ID from the first product (auto-detect)
 * This eliminates the need for users to manually enter their store ID
 */
async function getStoreId() {
  ensureInitialized();

  try {
    const response = await listProducts();

    if (!response?.data || response.data.length === 0) {
      throw new Error('No products found. Create a product in LemonSqueezy first.');
    }

    // Get store_id from the first product
    return response.data[0].attributes.store_id;
  } catch (error) {
    console.error('Error fetching store ID:', error);
    throw new Error(`Failed to auto-detect store ID: ${error.message}`);
  }
}

/**
 * Get all products from the LemonSqueezy store
 */
async function getProducts(storeId) {
  ensureInitialized();

  try {
    const response = await listProducts({
      filter: storeId ? { storeId } : undefined
    });

    if (!response?.data) {
      return [];
    }

    return response.data.map(product => ({
      id: product.id,
      storeId: product.attributes.store_id,
      name: product.attributes.name,
      description: product.attributes.description,
      status: product.attributes.status,
      price: product.attributes.price,
      priceFormatted: product.attributes.price_formatted,
      buyNowUrl: product.attributes.buy_now_url,
      createdAt: product.attributes.created_at,
      updatedAt: product.attributes.updated_at
    }));
  } catch (error) {
    console.error('Error fetching LemonSqueezy products:', error);
    throw new Error(`Failed to fetch products: ${error.message}`);
  }
}

/**
 * Get all variants for a specific product
 */
async function getProductVariants(productId) {
  ensureInitialized();

  try {
    const response = await listVariants({
      filter: { productId }
    });

    if (!response?.data) {
      return [];
    }

    return response.data.map(variant => ({
      id: variant.id,
      productId: variant.attributes.product_id,
      name: variant.attributes.name,
      description: variant.attributes.description,
      price: variant.attributes.price,
      priceFormatted: variant.attributes.price_formatted,
      interval: variant.attributes.interval, // 'month', 'year', null for one-time
      intervalCount: variant.attributes.interval_count,
      isSubscription: variant.attributes.is_subscription,
      status: variant.attributes.status,
      createdAt: variant.attributes.created_at
    }));
  } catch (error) {
    console.error('Error fetching LemonSqueezy variants:', error);
    throw new Error(`Failed to fetch variants: ${error.message}`);
  }
}

/**
 * Get subscriptions with optional filters
 */
async function getSubscriptions(filters = {}) {
  ensureInitialized();

  try {
    const params = {};

    if (filters.storeId) {
      params.filter = { ...params.filter, storeId: filters.storeId };
    }
    if (filters.status) {
      params.filter = { ...params.filter, status: filters.status };
    }
    if (filters.userEmail) {
      params.filter = { ...params.filter, userEmail: filters.userEmail };
    }

    const response = await listSubscriptions(params);

    if (!response?.data) {
      return [];
    }

    return response.data.map(sub => ({
      id: sub.id,
      storeId: sub.attributes.store_id,
      customerId: sub.attributes.customer_id,
      orderId: sub.attributes.order_id,
      orderItemId: sub.attributes.order_item_id,
      productId: sub.attributes.product_id,
      variantId: sub.attributes.variant_id,
      productName: sub.attributes.product_name,
      variantName: sub.attributes.variant_name,
      userName: sub.attributes.user_name,
      userEmail: sub.attributes.user_email,
      status: sub.attributes.status, // 'on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired'
      statusFormatted: sub.attributes.status_formatted,
      cardBrand: sub.attributes.card_brand,
      cardLastFour: sub.attributes.card_last_four,
      pause: sub.attributes.pause,
      cancelled: sub.attributes.cancelled,
      trialEndsAt: sub.attributes.trial_ends_at,
      billingAnchor: sub.attributes.billing_anchor,
      renewsAt: sub.attributes.renews_at,
      endsAt: sub.attributes.ends_at,
      createdAt: sub.attributes.created_at,
      updatedAt: sub.attributes.updated_at
    }));
  } catch (error) {
    console.error('Error fetching LemonSqueezy subscriptions:', error);
    throw new Error(`Failed to fetch subscriptions: ${error.message}`);
  }
}

/**
 * Get a specific subscription by ID
 */
async function getSubscriptionById(subscriptionId) {
  ensureInitialized();

  try {
    const response = await getSubscription(subscriptionId);

    if (!response?.data) {
      return null;
    }

    const sub = response.data;
    return {
      id: sub.id,
      storeId: sub.attributes.store_id,
      customerId: sub.attributes.customer_id,
      orderId: sub.attributes.order_id,
      productId: sub.attributes.product_id,
      variantId: sub.attributes.variant_id,
      productName: sub.attributes.product_name,
      variantName: sub.attributes.variant_name,
      userName: sub.attributes.user_name,
      userEmail: sub.attributes.user_email,
      status: sub.attributes.status,
      statusFormatted: sub.attributes.status_formatted,
      renewsAt: sub.attributes.renews_at,
      endsAt: sub.attributes.ends_at,
      createdAt: sub.attributes.created_at,
      updatedAt: sub.attributes.updated_at
    };
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }
}

/**
 * Verify a subscription by email - check if user has active subscription
 */
async function verifySubscriptionByEmail(email, variantId = null) {
  ensureInitialized();

  try {
    const subscriptions = await getSubscriptions({
      userEmail: email
    });

    // Filter for active subscriptions
    const activeStatuses = ['active', 'on_trial'];
    let activeSubscriptions = subscriptions.filter(sub =>
      activeStatuses.includes(sub.status)
    );

    // If variant ID provided, filter by variant
    if (variantId) {
      activeSubscriptions = activeSubscriptions.filter(sub =>
        sub.variantId.toString() === variantId.toString()
      );
    }

    return {
      hasActiveSubscription: activeSubscriptions.length > 0,
      subscriptions: activeSubscriptions
    };
  } catch (error) {
    console.error('Error verifying subscription:', error);
    throw new Error(`Failed to verify subscription: ${error.message}`);
  }
}

/**
 * Get customer details by ID
 */
async function getCustomerById(customerId) {
  ensureInitialized();

  try {
    const response = await getCustomer(customerId);

    if (!response?.data) {
      return null;
    }

    const customer = response.data;
    return {
      id: customer.id,
      storeId: customer.attributes.store_id,
      name: customer.attributes.name,
      email: customer.attributes.email,
      status: customer.attributes.status,
      city: customer.attributes.city,
      region: customer.attributes.region,
      country: customer.attributes.country,
      totalRevenueCurrency: customer.attributes.total_revenue_currency,
      mrr: customer.attributes.mrr,
      statusFormatted: customer.attributes.status_formatted,
      createdAt: customer.attributes.created_at,
      updatedAt: customer.attributes.updated_at
    };
  } catch (error) {
    console.error('Error fetching customer:', error);
    throw new Error(`Failed to fetch customer: ${error.message}`);
  }
}

module.exports = {
  initializeLemonSqueezy,
  getStoreId,
  getProducts,
  getProductVariants,
  getSubscriptions,
  getSubscriptionById,
  verifySubscriptionByEmail,
  getCustomerById
};
