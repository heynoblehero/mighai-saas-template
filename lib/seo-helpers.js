/**
 * SEO Helper Functions
 * Provides reusable SEO utilities for meta tags, structured data, etc.
 */

/**
 * Generate Open Graph meta tags for social sharing
 * @param {object} params - SEO parameters
 * @returns {object} - Meta tags object for Next.js Head component
 */
export function generateOpenGraphTags({
  title,
  description,
  url,
  image,
  type = 'website',
  siteName = 'Your Site Name',
  locale = 'en_US'
}) {
  return {
    'og:title': title,
    'og:description': description,
    'og:url': url,
    'og:image': image,
    'og:type': type,
    'og:site_name': siteName,
    'og:locale': locale,
  };
}

/**
 * Generate Twitter Card meta tags
 * @param {object} params - Twitter card parameters
 * @returns {object} - Meta tags object for Next.js Head component
 */
export function generateTwitterCardTags({
  title,
  description,
  image,
  card = 'summary_large_image',
  site,
  creator
}) {
  return {
    'twitter:card': card,
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': image,
    ...(site && { 'twitter:site': site }),
    ...(creator && { 'twitter:creator': creator }),
  };
}

/**
 * Generate JSON-LD structured data for blog posts
 * @param {object} post - Blog post data
 * @returns {object} - JSON-LD structured data
 */
export function generateBlogPostStructuredData(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.seo_description,
    image: post.featured_image,
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: {
      '@type': 'Organization',
      name: post.author || 'Site Admin'
    },
    publisher: {
      '@type': 'Organization',
      name: process.env.NEXT_PUBLIC_SITE_NAME || 'Your Site',
      logo: {
        '@type': 'ImageObject',
        url: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`
    }
  };
}

/**
 * Generate JSON-LD structured data for products/plans
 * @param {object} plan - Subscription plan data
 * @returns {object} - JSON-LD structured data
 */
export function generateProductStructuredData(plan) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: plan.name,
    description: plan.description,
    offers: {
      '@type': 'Offer',
      price: plan.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ...(plan.billing_period === 'monthly' && { billingDuration: 'P1M' }),
      ...(plan.billing_period === 'yearly' && { billingDuration: 'P1Y' })
    }
  };
}

/**
 * Generate complete SEO meta tags for a page
 * @param {object} params - Page SEO parameters
 * @returns {object} - Complete meta tags object
 */
export function generatePageSEO({
  title,
  description,
  keywords,
  url,
  image,
  type = 'website',
  noindex = false,
  canonical
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const fullImage = image?.startsWith('http') ? image : `${baseUrl}${image || '/og-image.png'}`;

  return {
    title: title,
    description: description,
    keywords: keywords,
    canonical: canonical || fullUrl,
    openGraph: generateOpenGraphTags({
      title,
      description,
      url: fullUrl,
      image: fullImage,
      type
    }),
    twitter: generateTwitterCardTags({
      title,
      description,
      image: fullImage
    }),
    ...(noindex && { robots: 'noindex, nofollow' })
  };
}

/**
 * Generate breadcrumb structured data
 * @param {array} items - Breadcrumb items [{name, url}]
 * @returns {object} - JSON-LD structured data
 */
export function generateBreadcrumbStructuredData(items) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`
    }))
  };
}

/**
 * Helper to inject structured data into page
 * @param {object} structuredData - JSON-LD data
 * @returns {string} - Script tag HTML
 */
export function injectStructuredData(structuredData) {
  return `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`;
}

export default {
  generateOpenGraphTags,
  generateTwitterCardTags,
  generateBlogPostStructuredData,
  generateProductStructuredData,
  generatePageSEO,
  generateBreadcrumbStructuredData,
  injectStructuredData
};
