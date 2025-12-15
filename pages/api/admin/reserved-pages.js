import fs from 'fs';
import path from 'path';
const { withAdminAuth } = require('../../../lib/auth-middleware');

const RESERVED_PAGES_DIR = path.join(process.cwd(), 'data', 'reserved-pages');
const RULES_FILE = path.join(process.cwd(), 'data', 'reserved-page-rules.json');

// Ensure directories exist
if (!fs.existsSync(RESERVED_PAGES_DIR)) {
  fs.mkdirSync(RESERVED_PAGES_DIR, { recursive: true });
}

function getRules() {
  try {
    if (fs.existsSync(RULES_FILE)) {
      const data = fs.readFileSync(RULES_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error reading reserved page rules:', error);
    return {};
  }
}

function getReservedPage(pageType) {
  try {
    const filePath = path.join(RESERVED_PAGES_DIR, `${pageType}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(`Error reading reserved page ${pageType}:`, error);
    return null;
  }
}

function cleanHtmlCode(htmlCode) {
  if (!htmlCode) return htmlCode;

  // Remove markdown code fences
  let cleaned = htmlCode;

  // Remove ```html at the start
  cleaned = cleaned.replace(/^```html\s*/i, '');

  // Remove ``` at the end
  cleaned = cleaned.replace(/\s*```\s*$/, '');

  // Remove any remaining code fences in the middle
  cleaned = cleaned.replace(/```html\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/g, '');

  return cleaned.trim();
}

function saveReservedPage(pageType, pageData) {
  try {
    // Clean the HTML code if it exists
    if (pageData.html_code) {
      pageData.html_code = cleanHtmlCode(pageData.html_code);
    }

    const filePath = path.join(RESERVED_PAGES_DIR, `${pageType}.json`);
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving reserved page ${pageType}:`, error);
    return false;
  }
}

function getAllReservedPages() {
  try {
    const files = fs.readdirSync(RESERVED_PAGES_DIR).filter(file => file.endsWith('.json'));
    const pages = {};
    
    files.forEach(file => {
      const pageType = file.replace('.json', '');
      pages[pageType] = getReservedPage(pageType);
    });
    
    return pages;
  } catch (error) {
    console.error('Error reading reserved pages:', error);
    return {};
  }
}

async function handler(req, res) {
  if (req.method === 'GET') {
    const { pageType } = req.query;
    
    if (pageType === 'rules') {
      // Return the rules configuration
      const rules = getRules();
      return res.status(200).json({ success: true, rules });
    }
    
    if (pageType) {
      // Get specific reserved page
      const page = getReservedPage(pageType);
      if (page) {
        return res.status(200).json({ success: true, page });
      } else {
        return res.status(404).json({ success: false, error: 'Reserved page not found' });
      }
    } else {
      // Get all reserved pages
      const pages = getAllReservedPages();
      return res.status(200).json({ success: true, pages });
    }
  }
  
  if (req.method === 'POST') {
    const { pageType, pageData } = req.body;
    
    if (!pageType || !pageData) {
      return res.status(400).json({ success: false, error: 'pageType and pageData are required' });
    }
    
    // Validate pageType against rules
    const rules = getRules();
    if (!rules[pageType]) {
      return res.status(400).json({ success: false, error: 'Invalid page type' });
    }
    
    // Add metadata
    const enrichedPageData = {
      ...pageData,
      pageType,
      lastModified: new Date().toISOString(),
      version: (getReservedPage(pageType)?.version || 0) + 1
    };
    
    const saved = saveReservedPage(pageType, enrichedPageData);
    
    if (saved) {
      return res.status(200).json({ success: true, message: 'Reserved page saved successfully', page: enrichedPageData });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to save reserved page' });
    }
  }
  
  if (req.method === 'DELETE') {
    const { pageType } = req.query;
    
    if (!pageType) {
      return res.status(400).json({ success: false, error: 'pageType is required' });
    }
    
    try {
      const filePath = path.join(RESERVED_PAGES_DIR, `${pageType}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return res.status(200).json({ success: true, message: 'Reserved page deleted successfully' });
      } else {
        return res.status(404).json({ success: false, error: 'Reserved page not found' });
      }
    } catch (error) {
      console.error(`Error deleting reserved page ${pageType}:`, error);
      return res.status(500).json({ success: false, error: 'Failed to delete reserved page' });
    }
  }
  
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);