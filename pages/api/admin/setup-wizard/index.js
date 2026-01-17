import { requireAdminAuth } from '../../../../lib/auth-middleware';
import {
  getWizardState,
  updateWizardState,
  shouldShowWizard
} from '../../../../lib/setup-wizard-db';

export default async function handler(req, res) {
  // Verify admin authentication
  const authResult = await requireAdminAuth(req, res);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = authResult.user?.id || 1;

  if (req.method === 'GET') {
    try {
      const state = getWizardState(userId);
      const showWizard = shouldShowWizard(userId);

      return res.status(200).json({
        success: true,
        wizardState: state,
        shouldShow: showWizard
      });
    } catch (error) {
      console.error('Error getting wizard state:', error);
      return res.status(500).json({ error: 'Failed to get wizard state' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const updates = req.body;

      // Validate updates
      const allowedFields = [
        'current_step',
        'is_completed',
        'is_dismissed',
        'is_minimized',
        'site_name',
        'site_tagline',
        'site_description',
        'logo_url',
        'favicon_url',
        'primary_color',
        'secondary_color',
        'accent_color',
        'target_audience',
        'key_features',
        'problem_solved',
        'pricing_tier_descriptions',
        'reference_images',
        'style_analysis',
        'ai_provider',
        'ai_api_key_configured',
        'email_api_key_configured',
        'payment_api_key_configured',
        'lemonsqueezy_store_id',
        'plans_configured',
        'plans_data',
        'pages_generated',
        'generated_pages'
      ];

      const filteredUpdates = {};
      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      const updatedState = updateWizardState(userId, filteredUpdates);

      return res.status(200).json({
        success: true,
        wizardState: updatedState
      });
    } catch (error) {
      console.error('Error updating wizard state:', error);
      return res.status(500).json({ error: 'Failed to update wizard state' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
