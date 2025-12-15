import fs from 'fs';
import path from 'path';
const { withAdminAuth } = require('../../../lib/auth-middleware');

const RESERVED_PAGES_DIR = path.join(process.cwd(), 'data', 'reserved-pages');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'page-backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
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

function getPageFilePath(pageType) {
  const pageMapping = {
    'customer-login': path.join(process.cwd(), 'pages', 'subscribe', 'login.js'),
    'customer-signup': path.join(process.cwd(), 'pages', 'subscribe', 'signup.js'),
    'customer-dashboard': path.join(process.cwd(), 'pages', 'dashboard', 'index.js'),
    'customer-profile': path.join(process.cwd(), 'pages', 'dashboard', 'profile.js'),
    'customer-billing': path.join(process.cwd(), 'pages', 'dashboard', 'upgrade.js'),
    'landing-page': path.join(process.cwd(), 'pages', 'index.js'),
    'password-reset': null // This would need to be created
  };
  
  return pageMapping[pageType];
}

function createBackup(pageType, originalFilePath) {
  try {
    if (!fs.existsSync(originalFilePath)) {
      return { success: false, error: 'Original file not found' };
    }

    const originalContent = fs.readFileSync(originalFilePath, 'utf8');
    const backupFileName = `${pageType}_${Date.now()}.js`;
    const backupPath = path.join(BACKUPS_DIR, backupFileName);
    
    fs.writeFileSync(backupPath, originalContent);
    
    // Also create a metadata file
    const metadataPath = path.join(BACKUPS_DIR, `${pageType}_${Date.now()}.meta.json`);
    const metadata = {
      pageType,
      originalPath: originalFilePath,
      backupTime: new Date().toISOString(),
      backupFileName
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    return { success: true, backupPath, metadata };
  } catch (error) {
    console.error('Backup creation failed:', error);
    return { success: false, error: error.message };
  }
}

function convertHtmlToReact(htmlCode, pageType) {
  // This function converts HTML to a React component
  // This is a simplified version - in production you'd want more sophisticated parsing
  
  const componentTemplates = {
    'customer-login': {
      imports: `import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';`,
      componentName: 'SubscriberLogin',
      layoutWrapper: false
    },
    'customer-signup': {
      imports: `import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';`,
      componentName: 'SubscriberSignup',
      layoutWrapper: false
    },
    'customer-dashboard': {
      imports: `import { useState, useEffect } from 'react';
import SubscriberLayout from '../../components/SubscriberLayout';
import SupportWidget from '../../components/SupportWidget';`,
      componentName: 'SubscriberDashboard',
      layoutWrapper: 'SubscriberLayout'
    },
    'customer-profile': {
      imports: `import { useState, useEffect } from 'react';
import SubscriberLayout from '../../components/SubscriberLayout';`,
      componentName: 'SubscriberProfile',
      layoutWrapper: 'SubscriberLayout'
    },
    'customer-billing': {
      imports: `import { useState, useEffect } from 'react';
import SubscriberLayout from '../../components/SubscriberLayout';`,
      componentName: 'UpgradePlan',
      layoutWrapper: 'SubscriberLayout'
    },
    'landing-page': {
      imports: `import { useState, useEffect } from 'react';
import Head from 'next/head';`,
      componentName: 'LandingPage',
      layoutWrapper: false
    }
  };

  const template = componentTemplates[pageType];
  if (!template) {
    throw new Error(`No template found for page type: ${pageType}`);
  }

  // Extract the body content from HTML
  const bodyMatch = htmlCode.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : htmlCode;
  
  // Basic HTML to JSX conversion
  let jsxContent = bodyContent
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/onclick=/g, 'onClick=')
    .replace(/onsubmit=/g, 'onSubmit=')
    .replace(/onchange=/g, 'onChange=')
    .replace(/autofocus/g, 'autoFocus')
    .replace(/readonly/g, 'readOnly')
    .replace(/maxlength=/g, 'maxLength=')
    .replace(/tabindex=/g, 'tabIndex=');

  // Extract and convert inline styles and scripts
  const styleMatch = htmlCode.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const scriptMatch = htmlCode.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

  let reactComponent = `${template.imports}

export default function ${template.componentName}() {
  // State and effect hooks would be extracted from the original page
  // For now, using placeholder implementation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // NOTE: This is a generated component from customized HTML
  // Some functionality may need manual adjustment
`;

  if (scriptMatch) {
    // Convert basic JavaScript to React hooks and handlers
    // This is a simplified conversion
    reactComponent += `
  // Converted JavaScript functionality
  ${scriptMatch[1].replace(/function\s+(\w+)/g, 'const $1 = ')}
`;
  }

  reactComponent += `
  return (`;

  if (template.layoutWrapper) {
    reactComponent += `
    <${template.layoutWrapper} title="${template.componentName.replace(/([A-Z])/g, ' $1').trim()}">`;
  }

  reactComponent += `
      <div>
        ${jsxContent}
      </div>`;

  if (template.layoutWrapper) {
    reactComponent += `
    </${template.layoutWrapper}>`;
  }

  if (template.componentName === 'SubscriberDashboard') {
    reactComponent += `
      <SupportWidget />`;
  }

  reactComponent += `
  );
}`;

  // Add styles if they exist
  if (styleMatch) {
    reactComponent += `

// Converted styles - you may want to move these to a CSS module
const styles = \`
${styleMatch[1]}
\`;`;
  }

  return reactComponent;
}

function deployPage(pageType, reactCode, originalPath) {
  try {
    // Add deployment warning comment
    const deploymentComment = `/*
 * GENERATED CUSTOMIZED PAGE
 * 
 * This file has been automatically generated from a customized reserved page.
 * Original backup was created before deployment.
 * 
 * To revert: Use the Reserved Pages admin interface
 * To modify: Use the Reserved Pages AI customizer
 * 
 * Generated at: ${new Date().toISOString()}
 * Page Type: ${pageType}
 */

`;

    const finalCode = deploymentComment + reactCode;
    
    fs.writeFileSync(originalPath, finalCode);
    
    return { success: true };
  } catch (error) {
    console.error('Deployment failed:', error);
    return { success: false, error: error.message };
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageType, action = 'deploy' } = req.body;

  if (!pageType) {
    return res.status(400).json({ error: 'pageType is required' });
  }

  try {
    const originalFilePath = getPageFilePath(pageType);
    
    console.log('Deploy debug - pageType:', pageType, 'filePath:', originalFilePath);
    
    if (!originalFilePath) {
      return res.status(400).json({ error: `No file path configured for page type: ${pageType}` });
    }

    if (action === 'deploy') {
      // Get the customized page
      const reservedPage = getReservedPage(pageType);
      
      if (!reservedPage || !reservedPage.html_code) {
        return res.status(400).json({ error: 'No customized version found. Please create a customization first.' });
      }

      try {
        // Simply mark the page as deployed - the getServerSideProps will handle serving it
        reservedPage.deployed = true;
        reservedPage.deployedAt = new Date().toISOString();
        
        const pagePath = path.join(RESERVED_PAGES_DIR, `${pageType}.json`);
        fs.writeFileSync(pagePath, JSON.stringify(reservedPage, null, 2));

        res.status(200).json({
          success: true,
          message: 'Page deployed successfully! The customized version will now be served to users.',
          deployedAt: reservedPage.deployedAt
        });
      } catch (error) {
        res.status(500).json({ error: 'Deployment failed: ' + error.message });
      }
    } else if (action === 'revert') {
      // Simply mark the page as not deployed to revert to original
      const reservedPage = getReservedPage(pageType);
      
      if (!reservedPage) {
        return res.status(404).json({ error: 'No reserved page found to revert' });
      }

      try {
        reservedPage.deployed = false;
        reservedPage.revertedAt = new Date().toISOString();

        const pagePath = path.join(RESERVED_PAGES_DIR, `${pageType}.json`);
        fs.writeFileSync(pagePath, JSON.stringify(reservedPage, null, 2));

        res.status(200).json({
          success: true,
          message: 'Page reverted successfully! The original version will now be served to users.',
          revertedAt: reservedPage.revertedAt
        });
      } catch (error) {
        res.status(500).json({ error: 'Revert failed: ' + error.message });
      }
    } else {
      res.status(400).json({ error: 'Invalid action. Use "deploy" or "revert"' });
    }

  } catch (error) {
    console.error('Deployment operation failed:', error);
    res.status(500).json({ error: 'Operation failed: ' + error.message });
  }
}

export default withAdminAuth(handler);