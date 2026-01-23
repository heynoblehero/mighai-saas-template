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
    const { lemonSqueezySetup, listProducts } = await import('@lemonsqueezy/lemonsqueezy.js');
    lemonSqueezySetup({ apiKey });

    // Fetch products
    const response = await listProducts();

    // Handle response structure (can be nested or direct)
    let productsArray = [];
    if (response?.data) {
      if (Array.isArray(response.data)) {
        productsArray = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        productsArray = response.data.data;
      }
    }

    // Map to simplified format
    const products = productsArray.map(product => ({
      id: product.id,
      storeId: product.attributes?.store_id,
      name: product.attributes?.name,
      description: product.attributes?.description,
      status: product.attributes?.status,
      price: product.attributes?.price,
      priceFormatted: product.attributes?.price_formatted,
      buyNowUrl: product.attributes?.buy_now_url,
      createdAt: product.attributes?.created_at,
      updatedAt: product.attributes?.updated_at
    }));

    // Get store ID from first product if available
    const storeId = products.length > 0 ? products[0].storeId : null;

    return res.status(200).json({
      success: true,
      products,
      storeId
    });
  } catch (error) {
    console.error('Error fetching LemonSqueezy products:', error);
    return res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    });
  }
}
