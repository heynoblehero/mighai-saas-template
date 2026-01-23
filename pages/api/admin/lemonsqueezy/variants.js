import jwt from 'jsonwebtoken';
import config from '../../../../lib/config';

const JWT_SECRET = config.JWT_SECRET;

function getAdmin(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.role === 'admin' ? decoded : null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  // Accept both GET (with env var) and POST (with body apiKey)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get productId from query (GET) or body (POST)
  const productId = req.method === 'POST' ? req.body?.productId : req.query?.productId;

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    // Get API key from request body (POST) or fall back to env var
    let apiKey = process.env.LEMONSQUEEZY_API_KEY;

    if (req.method === 'POST' && req.body?.apiKey) {
      apiKey = req.body.apiKey;
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'LemonSqueezy API key not configured',
        message: 'Please configure your API key in the Payment Setup step'
      });
    }

    // Dynamically import and initialize with the API key
    const { lemonSqueezySetup, listVariants } = await import('@lemonsqueezy/lemonsqueezy.js');
    lemonSqueezySetup({ apiKey });

    // Fetch variants for the product
    const response = await listVariants({
      filter: { productId }
    });

    // Handle response structure (can be nested or direct)
    let variantsArray = [];
    if (response?.data) {
      if (Array.isArray(response.data)) {
        variantsArray = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        variantsArray = response.data.data;
      }
    }

    // Map to simplified format
    const variants = variantsArray.map(variant => ({
      id: variant.id,
      productId: variant.attributes?.product_id,
      name: variant.attributes?.name,
      description: variant.attributes?.description,
      price: variant.attributes?.price,
      priceFormatted: variant.attributes?.price_formatted,
      interval: variant.attributes?.interval, // 'month', 'year', null for one-time
      intervalCount: variant.attributes?.interval_count,
      isSubscription: variant.attributes?.is_subscription,
      status: variant.attributes?.status,
      createdAt: variant.attributes?.created_at
    }));

    return res.status(200).json({
      success: true,
      variants,
      productId
    });
  } catch (error) {
    console.error('Error fetching LemonSqueezy variants:', error);
    return res.status(500).json({
      error: 'Failed to fetch variants',
      message: error.message
    });
  }
}
