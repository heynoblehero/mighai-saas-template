/**
 * API endpoint to verify LemonSqueezy API key
 * Tests the connection by fetching products with variants and auto-detects store ID
 */

import { requireAdminAuth } from '../../../../lib/auth-middleware';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const authResult = await requireAdminAuth(req, res);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    // Dynamically import to use the provided API key
    const { lemonSqueezySetup, listProducts, listVariants } = await import('@lemonsqueezy/lemonsqueezy.js');

    // Initialize with the provided API key
    lemonSqueezySetup({ apiKey });

    // Fetch all products
    const productsResponse = await listProducts();

    // Handle response structure
    let productsArray = [];
    if (productsResponse?.data) {
      if (Array.isArray(productsResponse.data)) {
        productsArray = productsResponse.data;
      } else if (productsResponse.data.data && Array.isArray(productsResponse.data.data)) {
        productsArray = productsResponse.data.data;
      }
    }

    // Auto-detect store ID from first product
    let storeId = null;
    if (productsArray.length > 0) {
      storeId = productsArray[0].attributes?.store_id;
    }

    // Fetch variants for each product
    const productsWithVariants = await Promise.all(
      productsArray.map(async (product) => {
        try {
          const variantsResponse = await listVariants({
            filter: { productId: product.id }
          });

          // Handle variants response structure
          let variantsArray = [];
          if (variantsResponse?.data) {
            if (Array.isArray(variantsResponse.data)) {
              variantsArray = variantsResponse.data;
            } else if (variantsResponse.data.data && Array.isArray(variantsResponse.data.data)) {
              variantsArray = variantsResponse.data.data;
            }
          }

          return {
            id: product.id,
            name: product.attributes?.name || 'Unknown',
            description: product.attributes?.description || '',
            status: product.attributes?.status || 'unknown',
            price: product.attributes?.price,
            priceFormatted: product.attributes?.price_formatted,
            variants: variantsArray.map(v => ({
              id: v.id,
              name: v.attributes?.name || 'Default',
              description: v.attributes?.description || '',
              price: v.attributes?.price, // in cents
              priceFormatted: v.attributes?.price_formatted,
              interval: v.attributes?.interval, // 'month', 'year', or null
              intervalCount: v.attributes?.interval_count,
              isSubscription: v.attributes?.is_subscription,
              status: v.attributes?.status
            }))
          };
        } catch (variantError) {
          console.error(`Error fetching variants for product ${product.id}:`, variantError);
          return {
            id: product.id,
            name: product.attributes?.name || 'Unknown',
            description: product.attributes?.description || '',
            status: product.attributes?.status || 'unknown',
            variants: []
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      message: 'API key verified successfully!',
      productsCount: productsWithVariants.length,
      storeId,
      products: productsWithVariants
    });
  } catch (error) {
    console.error('LemonSqueezy verification error:', error);

    // Check for common error types
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key. Please check and try again.'
      });
    }

    return res.status(500).json({
      success: false,
      error: `Verification failed: ${errorMsg}`
    });
  }
}
