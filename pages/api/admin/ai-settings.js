const fs = require('fs');
const path = require('path');
const { withAdminAuth } = require('../../../lib/auth-middleware');

const AI_SETTINGS_PATH = path.join(process.cwd(), 'data', 'ai-settings.json');

// Default settings structure
const DEFAULT_SETTINGS = {
  claude_api_key: '',
  claude_model: 'claude-sonnet-4-5-20250929',
  max_tokens: 8192,
  temperature: 0.7,
  cost_limit_monthly: 100,
  current_month_usage: 0,
  last_reset_date: new Date().toISOString()
};

function getSettings() {
  try {
    if (fs.existsSync(AI_SETTINGS_PATH)) {
      const data = fs.readFileSync(AI_SETTINGS_PATH, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error reading AI settings:', error);
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(AI_SETTINGS_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(AI_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving AI settings:', error);
    return false;
  }
}

async function handler(req, res) {
  if (req.method === 'GET') {
    return getAISettings(req, res);
  } else if (req.method === 'PUT' || req.method === 'POST') {
    return updateAISettings(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getAISettings(req, res) {
  try {
    const settings = getSettings();

    // Mask API key in response
    const safeSettings = {
      ...settings,
      claude_api_key: settings.claude_api_key ? '••••••••' + settings.claude_api_key.slice(-8) : '',
      has_api_key: !!settings.claude_api_key
    };

    // Remove legacy fields from response
    delete safeSettings.ai_provider;
    delete safeSettings.gemini_api_key;
    delete safeSettings.gemini_model;
    delete safeSettings.openai_api_key;
    delete safeSettings.openai_model;

    res.status(200).json({ success: true, settings: safeSettings });
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({ error: 'Failed to fetch AI settings' });
  }
}

async function updateAISettings(req, res) {
  try {
    const { claude_api_key, claude_model, max_tokens, temperature, cost_limit_monthly } = req.body;

    // Get existing settings
    const existingSettings = getSettings();

    // Build updated settings
    const updatedSettings = {
      ...existingSettings,
      // Always set provider to claude
      ai_provider: 'claude'
    };

    // Only update API key if provided and not masked
    if (claude_api_key && !claude_api_key.includes('••••')) {
      // Validate key format
      if (!claude_api_key.startsWith('sk-ant-')) {
        return res.status(400).json({ error: 'Invalid Claude API key format. Keys should start with "sk-ant-"' });
      }
      updatedSettings.claude_api_key = claude_api_key;
    }

    // Update other fields if provided
    if (claude_model) {
      updatedSettings.claude_model = claude_model;
    }
    if (max_tokens !== undefined) {
      updatedSettings.max_tokens = parseInt(max_tokens) || 8192;
    }
    if (temperature !== undefined) {
      updatedSettings.temperature = parseFloat(temperature) || 0.7;
    }
    if (cost_limit_monthly !== undefined) {
      updatedSettings.cost_limit_monthly = parseFloat(cost_limit_monthly) || 100;
    }

    // Remove legacy Gemini/OpenAI fields
    delete updatedSettings.gemini_api_key;
    delete updatedSettings.gemini_model;
    delete updatedSettings.openai_api_key;
    delete updatedSettings.openai_model;

    // Save settings
    const saved = saveSettings(updatedSettings);

    if (saved) {
      res.status(200).json({ success: true, message: 'AI settings updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to save AI settings' });
    }
  } catch (error) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({ error: 'Failed to update AI settings' });
  }
}

export default withAdminAuth(handler);
