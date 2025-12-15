#!/usr/bin/env node

/**
 * Security Fix Script: Replace Hardcoded Secrets
 * This script automatically fixes hardcoded JWT secrets across the codebase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Starting security fixes for hardcoded secrets...');

// Files with hardcoded JWT secrets that need to be fixed
const filesToFix = [
  'pages/api/blog/templates.js',
  'pages/api/blog/data-source.js', 
  'pages/api/blog/generate.js',
  'pages/api/blog.js',
  'pages/api/support/messages.js',
  'pages/api/support/messages/read.js',
  'pages/api/support/messages/unread.js',
  'pages/api/upload/blog-data.js'
];

function fixJWTSecret(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⏭️  Skipped ${filePath} (file not found)`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if file already uses config import
    if (content.includes('import config from') || content.includes('require(') && content.includes('lib/config')) {
      console.log(`✅ ${filePath} already uses config`);
      return;
    }
    
    // Check if it has the hardcoded secret pattern
    if (!content.includes("process.env.JWT_SECRET || 'your-secret-key'")) {
      console.log(`⏭️  Skipped ${filePath} (no hardcoded secret found)`);
      return;
    }
    
    console.log(`🔧 Fixing ${filePath}...`);
    
    // Determine if it's ES6 or CommonJS
    const isES6 = content.includes('import ') && content.includes('from ');
    
    if (isES6) {
      // ES6 modules
      content = content.replace(
        /const JWT_SECRET = process\.env\.JWT_SECRET \|\| 'your-secret-key';/,
        ''
      );
      
      // Add config import after other imports
      const importMatch = content.match(/(import[^;]+from[^;]+;(\n|$))/g);
      if (importMatch) {
        const lastImport = importMatch[importMatch.length - 1];
        const insertPos = content.indexOf(lastImport) + lastImport.length;
        content = content.slice(0, insertPos) + 
                 "import config from '../../../lib/config';\n" +
                 content.slice(insertPos);
      }
      
      // Replace JWT_SECRET usage
      content = content.replace(/JWT_SECRET/g, 'config.JWT_SECRET');
      
    } else {
      // CommonJS
      content = content.replace(
        /const JWT_SECRET = process\.env\.JWT_SECRET \|\| 'your-secret-key';/,
        ''
      );
      
      // Add config require
      const requireMatch = content.match(/const .+ = require\([^)]+\);/g);
      if (requireMatch) {
        const lastRequire = requireMatch[requireMatch.length - 1];
        const insertPos = content.indexOf(lastRequire) + lastRequire.length;
        content = content.slice(0, insertPos) + 
                 "\nconst config = require('../../../lib/config');" +
                 content.slice(insertPos);
      }
      
      // Replace JWT_SECRET usage
      content = content.replace(/JWT_SECRET/g, 'config.JWT_SECRET');
    }
    
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Fix email service file
function fixEmailService() {
  const filePath = 'services/emailService.js';
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  Skipped ${filePath} (file not found)`);
    return;
  }
  
  console.log(`🔧 Fixing ${filePath}...`);
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace hardcoded Resend API key
  content = content.replace(
    /const resend = new Resend\(process\.env\.RESEND_API_KEY \|\| 'your-resend-api-key'\);/,
    "const config = require('../lib/config');\nconst resend = new Resend(config.RESEND_API_KEY || process.env.RESEND_API_KEY);"
  );
  
  // Update BASE_URL usage
  content = content.replace(
    /\$\{process\.env\.BASE_URL \|\| 'http:\/\/localhost:3000'\}/g,
    '${config.BASE_URL}'
  );
  
  fs.writeFileSync(fullPath, content);
  console.log(`✅ Fixed ${filePath}`);
}

// Apply fixes
console.log(`\n🎯 Fixing ${filesToFix.length} API files with hardcoded secrets...`);
filesToFix.forEach(fixJWTSecret);

console.log('\n📧 Fixing email service...');
fixEmailService();

console.log('\n🎉 Security fixes completed!');
console.log('\n📋 Summary of changes:');
console.log('   • Replaced hardcoded JWT secrets with secure config');
console.log('   • Added centralized configuration import');  
console.log('   • Fixed email service API key handling');
console.log('\n⚠️  Next steps:');
console.log('   • Set proper environment variables');
console.log('   • Test authentication flows');
console.log('   • Deploy updated code');