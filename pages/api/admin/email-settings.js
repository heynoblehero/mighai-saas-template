const emailService = require('../../../services/emailService');
const { withAdminAuth } = require('../../../lib/auth-middleware');

async function handler(req, res) {
  if (req.method === 'GET') {
    return getEmailSettings(req, res);
  } else if (req.method === 'PUT') {
    return updateEmailSettings(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getEmailSettings(req, res) {
  try {
    const settings = await emailService.getEmailSettings();
    
    // Don't send API key in response for security
    const safeSettings = {
      ...settings,
      resend_api_key: settings.resend_api_key ? '••••••••••••••••••••••••••••' : ''
    };
    
    res.status(200).json({ settings: safeSettings });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
}

async function updateEmailSettings(req, res) {
  try {
    const { admin_email, from_email, from_name, resend_api_key, email_notifications } = req.body;

    // Fetch existing settings to allow partial updates
    const existingSettings = await emailService.getEmailSettings();

    // Merge provided values with existing (provided values take precedence)
    const settings = {
      admin_email: admin_email || existingSettings.admin_email,
      from_email: from_email || existingSettings.from_email,
      from_name: from_name || existingSettings.from_name,
      email_notifications: email_notifications !== undefined
        ? Boolean(email_notifications)
        : existingSettings.email_notifications
    };

    // Validate merged settings have required fields
    if (!settings.admin_email || !settings.from_email || !settings.from_name) {
      return res.status(400).json({ error: 'Admin email, from email, and from name are required' });
    }

    // Only update API key if provided and not masked
    if (resend_api_key && !resend_api_key.includes('••••')) {
      settings.resend_api_key = resend_api_key;
    }

    const updated = await emailService.updateEmailSettings(settings);
    
    if (updated) {
      res.status(200).json({ message: 'Email settings updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update email settings' });
    }
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: 'Failed to update email settings' });
  }
}

export default withAdminAuth(handler);