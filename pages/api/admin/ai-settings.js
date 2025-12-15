import fs from 'fs';
import path from 'path';
const { withAdminAuth } = require('../../../lib/auth-middleware');

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'ai-settings.json');

// Ensure data directory exists
const dataDir = path.dirname(SETTINGS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaultSettings = {
  claude_api_key: '',
  claude_model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4000,
  temperature: 0.1,
  daytona_enabled: false,
  daytona_workspace_url: '',
  auto_preview: true,
  cost_limit_monthly: 100,
  current_month_usage: 0,
  last_reset_date: new Date().toISOString()
};

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return { ...defaultSettings, ...JSON.parse(data) };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error reading AI settings:', error);
    return defaultSettings;
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving AI settings:', error);
    return false;
  }
}

async function handler(req, res) {
  console.log('🔍 AI Settings API called - Method:', req.method);
  console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 Settings file path:', SETTINGS_FILE);
  
  if (req.method === 'GET') {
    try {
      console.log('📖 Getting AI settings...');
      const settings = getSettings();
      console.log('📖 Retrieved settings:', JSON.stringify(settings, null, 2));
      
      // Don't return the full API key for security
      const safeSettings = {
        ...settings,
        claude_api_key: settings.claude_api_key ? '••••••••••••••••' + settings.claude_api_key.slice(-4) : ''
      };
      console.log('📖 Sending safe settings:', JSON.stringify(safeSettings, null, 2));
      res.status(200).json(safeSettings);
    } catch (error) {
      console.error('❌ Failed to get AI settings:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to retrieve AI settings' });
    }
  } else if (req.method === 'POST') {
    try {
      console.log('💾 Saving AI settings...');
      console.log('💾 Current settings before merge:');
      const currentSettings = getSettings();
      console.log(JSON.stringify(currentSettings, null, 2));
      
      const newSettings = { ...currentSettings, ...req.body };
      console.log('💾 New settings after merge:', JSON.stringify(newSettings, null, 2));
      
      // Reset monthly usage if it's a new month
      const currentDate = new Date();
      const lastReset = new Date(newSettings.last_reset_date);
      console.log('💾 Current date:', currentDate.toISOString());
      console.log('💾 Last reset date:', newSettings.last_reset_date);
      
      if (currentDate.getMonth() !== lastReset.getMonth() || 
          currentDate.getFullYear() !== lastReset.getFullYear()) {
        console.log('💾 Resetting monthly usage - new month detected');
        newSettings.current_month_usage = 0;
        newSettings.last_reset_date = currentDate.toISOString();
      }

      console.log('💾 Final settings to save:', JSON.stringify(newSettings, null, 2));
      console.log('💾 Attempting to save to file...');
      
      const saveResult = saveSettings(newSettings);
      console.log('💾 Save result:', saveResult);
      
      if (saveResult) {
        console.log('✅ AI settings saved successfully');
        res.status(200).json({ success: true, message: 'AI settings saved successfully' });
      } else {
        console.error('❌ SaveSettings returned false');
        res.status(500).json({ error: 'Failed to save AI settings' });
      }
    } catch (error) {
      console.error('❌ Exception in POST handler:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error message:', error.message);
      res.status(500).json({ error: 'Failed to save AI settings' });
    }
  } else {
    console.log('❌ Method not allowed:', req.method);
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAdminAuth(handler);