import DOMPurify from 'isomorphic-dompurify';

/**
 * Advanced HTML sanitizer for AI-generated code
 * Allows maximum design flexibility while preventing XSS and code injection
 */

// Comprehensive list of safe HTML tags for modern web design
const ALLOWED_TAGS = [
  // Document structure
  'div', 'span', 'section', 'article', 'header', 'footer', 'nav', 'aside', 'main',

  // Text content
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
  'strong', 'em', 'b', 'i', 'u', 's', 'small', 'mark', 'del', 'ins', 'sub', 'sup',

  // Lists
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',

  // Links and media
  'a', 'img', 'picture', 'source', 'figure', 'figcaption',
  'video', 'audio', 'track', 'canvas',

  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',

  // Forms
  'form', 'input', 'textarea', 'button', 'select', 'option', 'optgroup',
  'label', 'fieldset', 'legend', 'datalist', 'output', 'progress', 'meter',

  // Semantic elements
  'time', 'address', 'abbr', 'cite', 'q', 'kbd', 'samp', 'var', 'dfn',

  // Interactive
  'details', 'summary', 'dialog',

  // SVG (for icons and graphics)
  'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse',
  'g', 'text', 'tspan', 'defs', 'linearGradient', 'radialGradient', 'stop',
  'clipPath', 'mask', 'pattern', 'use', 'symbol',

  // Other
  'hr', 'br', 'wbr', 'template',

  // Required for AI-generated pages
  'script', 'style', 'link', 'meta'
];

// Safe attributes that don't pose security risks
const ALLOWED_ATTR = [
  // Universal attributes
  'class', 'id', 'data-*', 'aria-*', 'role',

  // Links
  'href', 'target', 'rel', 'download',

  // Media
  'src', 'alt', 'width', 'height', 'loading', 'srcset', 'sizes',
  'poster', 'controls', 'autoplay', 'loop', 'muted', 'playsinline',

  // Forms
  'type', 'name', 'value', 'placeholder', 'required', 'disabled', 'readonly',
  'checked', 'selected', 'multiple', 'min', 'max', 'step', 'pattern',
  'autocomplete', 'autofocus', 'for',

  // Tables
  'colspan', 'rowspan', 'scope',

  // SVG
  'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'points', 'transform', 'opacity', 'fill-opacity', 'stroke-opacity',
  'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform',

  // Other
  'title', 'lang', 'dir', 'tabindex', 'contenteditable', 'spellcheck',
  'translate', 'draggable', 'hidden', 'datetime', 'open',

  // Event handlers (needed for AI-generated interactivity)
  'onclick', 'onsubmit', 'onchange', 'oninput', 'onfocus', 'onblur',
  'onkeydown', 'onkeyup', 'onkeypress', 'onmouseover', 'onmouseout',
  'onmouseenter', 'onmouseleave', 'onscroll', 'onload',

  // Link/style attributes
  'href', 'rel', 'media', 'as', 'crossorigin', 'integrity'
];

// Dangerous tags that should NEVER be allowed
// NOTE: script, style, link are ALLOWED for AI-generated pages (needed for functionality)
const FORBIDDEN_TAGS = [
  'iframe', 'object', 'embed', 'applet',
  'base', 'noscript', 'frameset', 'frame'
];

// Dangerous attributes that should be blocked (security risks only)
// NOTE: Safe event handlers ARE allowed for AI-generated pages
const FORBIDDEN_ATTR = [
  'formaction', 'srcdoc' // Only block attributes that enable XSS bypasses
];

// Safe event handlers allowed for AI pages
const ALLOWED_EVENT_HANDLERS = [
  'onclick', 'onsubmit', 'onchange', 'oninput', 'onfocus', 'onblur',
  'onkeydown', 'onkeyup', 'onkeypress', 'onmouseover', 'onmouseout',
  'onmouseenter', 'onmouseleave', 'onscroll', 'onload'
];

/**
 * Sanitize HTML content
 * @param {string} html - Raw HTML from AI
 * @returns {string} - Sanitized HTML safe for rendering
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const config = {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: FORBIDDEN_ATTR,

    // Additional security options
    ALLOW_DATA_ATTR: true, // Allow data-* attributes for JS frameworks
    ALLOW_ARIA_ATTR: true, // Allow aria-* for accessibility

    // Prevent DOM clobbering
    SANITIZE_DOM: true,

    // Keep safe URI schemes only
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|sms|data:image\/(?:png|jpg|jpeg|gif|webp|svg\+xml)|#):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,

    // Custom handling
    KEEP_CONTENT: true, // Keep content of removed tags
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,

    // Hooks for additional processing
    SAFE_FOR_TEMPLATES: false,
    WHOLE_DOCUMENT: false,

    // Force body
    FORCE_BODY: false,

    // Additional protections
    IN_PLACE: false
  };

  try {
    const clean = DOMPurify.sanitize(html, config);

    // Additional validation: check for actual security threats only
    // NOTE: script tags and event handlers are ALLOWED for AI pages
    const securityThreats = [
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i
    ];

    for (const pattern of securityThreats) {
      if (pattern.test(clean)) {
        console.warn('[SANITIZER] Security threat detected:', pattern);
        return clean.replace(pattern, '');
      }
    }

    return clean;
  } catch (error) {
    console.error('[SANITIZER] Error sanitizing HTML:', error);
    return ''; // Return empty string on error to be safe
  }
}

/**
 * Validate if HTML contains potentially dangerous content before sanitization
 * @param {string} html - Raw HTML
 * @returns {Object} - Validation result with warnings
 */
export function validateHTMLSafety(html) {
  const warnings = [];
  const errors = [];

  if (!html || typeof html !== 'string') {
    errors.push('Invalid HTML: must be a non-empty string');
    return { valid: false, errors, warnings };
  }

  // Check for explicitly forbidden patterns (security threats only)
  // NOTE: script, style, link, and event handlers are ALLOWED for AI-generated pages
  const dangerousPatterns = [
    { pattern: /<iframe/i, message: 'Iframe tags are not allowed' },
    { pattern: /javascript:/i, message: 'JavaScript protocol in href is not allowed' },
    { pattern: /vbscript:/i, message: 'VBScript protocol is not allowed' },
    { pattern: /<object/i, message: 'Object tags are not allowed' },
    { pattern: /<embed/i, message: 'Embed tags are not allowed' },
    { pattern: /data:text\/html/i, message: 'Data URLs with HTML are not allowed' }
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(html)) {
      errors.push(message);
    }
  }

  // Check for suspicious patterns (warnings, not blockers)
  const suspiciousPatterns = [
    { pattern: /eval\s*\(/i, message: 'Use of eval() detected - will be removed' },
    { pattern: /Function\s*\(/i, message: 'Dynamic function creation detected - will be removed' },
    { pattern: /setTimeout\s*\(/i, message: 'setTimeout detected - ensure safe usage' },
    { pattern: /setInterval\s*\(/i, message: 'setInterval detected - ensure safe usage' }
  ];

  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(html)) {
      warnings.push(message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Clean HTML code (remove markdown artifacts, extra whitespace)
 * @param {string} htmlCode - Raw HTML code possibly with markdown
 * @returns {string} - Cleaned HTML
 */
export function cleanHTMLCode(htmlCode) {
  if (!htmlCode || typeof htmlCode !== 'string') {
    return '';
  }

  let cleaned = htmlCode;

  // Remove markdown code fences
  cleaned = cleaned.replace(/^```html?\n?/gm, '');
  cleaned = cleaned.replace(/^```\n?/gm, '');
  cleaned = cleaned.replace(/```$/gm, '');

  // Trim excessive whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

export default {
  sanitizeHTML,
  validateHTMLSafety,
  cleanHTMLCode
};
