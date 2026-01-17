import { requireAdminAuth } from '../../../../lib/auth-middleware';
import { dismissWizard, minimizeWizard, resetWizard } from '../../../../lib/setup-wizard-db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const authResult = await requireAdminAuth(req, res);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = authResult.user?.id || 1;
  const { action } = req.body;

  try {
    let state;

    switch (action) {
      case 'dismiss':
        state = dismissWizard(userId);
        break;
      case 'minimize':
        state = minimizeWizard(userId, true);
        break;
      case 'restore':
        state = minimizeWizard(userId, false);
        break;
      case 'reset':
        state = resetWizard(userId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(200).json({
      success: true,
      wizardState: state
    });
  } catch (error) {
    console.error('Error with wizard action:', error);
    return res.status(500).json({ error: 'Failed to perform action' });
  }
}
