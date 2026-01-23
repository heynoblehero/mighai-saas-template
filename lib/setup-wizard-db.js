const db = require('./database');

// Initialize the setup_wizard_state table
function initSetupWizardTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS setup_wizard_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      current_step INTEGER DEFAULT 0,
      is_completed BOOLEAN DEFAULT FALSE,
      is_dismissed BOOLEAN DEFAULT FALSE,
      is_minimized BOOLEAN DEFAULT FALSE,

      -- Site Identity (Step 1)
      site_name TEXT,
      site_tagline TEXT,
      site_description TEXT,

      -- Branding (Step 2)
      logo_url TEXT,
      favicon_url TEXT,
      primary_color TEXT DEFAULT '#10B981',
      secondary_color TEXT DEFAULT '#059669',
      accent_color TEXT DEFAULT '#34D399',

      -- SaaS Details (Step 3)
      target_audience TEXT,
      key_features TEXT,
      problem_solved TEXT,
      pricing_tier_descriptions TEXT,

      -- Reference Images (Step 4)
      reference_images TEXT,
      style_analysis TEXT,

      -- API Keys (Steps 5-7)
      ai_provider TEXT,
      ai_api_key_configured BOOLEAN DEFAULT FALSE,
      email_api_key_configured BOOLEAN DEFAULT FALSE,
      payment_api_key_configured BOOLEAN DEFAULT FALSE,
      lemonsqueezy_store_id TEXT,
      lemonsqueezy_api_key TEXT,

      -- Plans (Step 8)
      plans_configured BOOLEAN DEFAULT FALSE,
      plans_data TEXT,

      -- Page Generation (Step 9)
      pages_generated BOOLEAN DEFAULT FALSE,
      generated_pages TEXT,

      -- Timestamps
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add lemonsqueezy_api_key column for existing databases
  try {
    db.exec(`ALTER TABLE setup_wizard_state ADD COLUMN lemonsqueezy_api_key TEXT`);
  } catch (err) {
    // Column might already exist, that's fine
  }
}

// Get wizard state (creates default if not exists)
function getWizardState(userId = 1) {
  initSetupWizardTable();

  let state = db.prepare('SELECT * FROM setup_wizard_state WHERE user_id = ?').get(userId);

  if (!state) {
    // Create default state
    db.prepare(`
      INSERT INTO setup_wizard_state (user_id) VALUES (?)
    `).run(userId);

    state = db.prepare('SELECT * FROM setup_wizard_state WHERE user_id = ?').get(userId);
  }

  // Parse JSON fields
  return {
    ...state,
    target_audience: state.target_audience ? JSON.parse(state.target_audience) : [],
    key_features: state.key_features ? JSON.parse(state.key_features) : [],
    pricing_tier_descriptions: state.pricing_tier_descriptions ? JSON.parse(state.pricing_tier_descriptions) : { free: '', pro: '', enterprise: '' },
    reference_images: state.reference_images ? JSON.parse(state.reference_images) : [],
    plans_data: state.plans_data ? JSON.parse(state.plans_data) : [],
    generated_pages: state.generated_pages ? JSON.parse(state.generated_pages) : {}
  };
}

// Update wizard state (partial update)
function updateWizardState(userId = 1, updates) {
  initSetupWizardTable();

  // Ensure state exists
  getWizardState(userId);

  // Stringify JSON fields if present
  const processedUpdates = { ...updates };
  const jsonFields = ['target_audience', 'key_features', 'pricing_tier_descriptions', 'reference_images', 'plans_data', 'generated_pages'];
  const booleanFields = ['is_completed', 'is_dismissed', 'is_minimized', 'ai_api_key_configured', 'email_api_key_configured', 'payment_api_key_configured', 'plans_configured', 'pages_generated'];

  for (const field of jsonFields) {
    if (processedUpdates[field] !== undefined && typeof processedUpdates[field] !== 'string') {
      processedUpdates[field] = JSON.stringify(processedUpdates[field]);
    }
  }

  // Convert boolean to integer for SQLite
  for (const field of booleanFields) {
    if (processedUpdates[field] !== undefined && typeof processedUpdates[field] === 'boolean') {
      processedUpdates[field] = processedUpdates[field] ? 1 : 0;
    }
  }

  // Build update query
  const fields = Object.keys(processedUpdates);
  if (fields.length === 0) return getWizardState(userId);

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => processedUpdates[f]);

  db.prepare(`
    UPDATE setup_wizard_state
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(...values, userId);

  return getWizardState(userId);
}

// Mark step as completed and advance
function completeStep(userId = 1, stepNumber) {
  const state = getWizardState(userId);
  const nextStep = Math.max(state.current_step, stepNumber + 1);

  return updateWizardState(userId, { current_step: nextStep });
}

// Skip to a specific step
function skipToStep(userId = 1, stepNumber) {
  return updateWizardState(userId, { current_step: stepNumber });
}

// Mark wizard as completed
function completeWizard(userId = 1) {
  return updateWizardState(userId, {
    is_completed: true,
    completed_at: new Date().toISOString()
  });
}

// Dismiss wizard
function dismissWizard(userId = 1) {
  return updateWizardState(userId, { is_dismissed: true });
}

// Minimize wizard
function minimizeWizard(userId = 1, minimized = true) {
  return updateWizardState(userId, { is_minimized: minimized });
}

// Reset wizard to start fresh
function resetWizard(userId = 1) {
  initSetupWizardTable();

  db.prepare('DELETE FROM setup_wizard_state WHERE user_id = ?').run(userId);
  return getWizardState(userId);
}

// Check if wizard should be shown
function shouldShowWizard(userId = 1) {
  const state = getWizardState(userId);
  return !state.is_completed && !state.is_dismissed;
}

// Get LemonSqueezy credentials from wizard state
function getLemonSqueezyCredentials(userId = 1) {
  initSetupWizardTable();

  const state = db.prepare(
    'SELECT lemonsqueezy_api_key, lemonsqueezy_store_id FROM setup_wizard_state WHERE user_id = ?'
  ).get(userId);

  if (!state) {
    return { apiKey: null, storeId: null };
  }

  return {
    apiKey: state.lemonsqueezy_api_key || null,
    storeId: state.lemonsqueezy_store_id || null
  };
}

module.exports = {
  initSetupWizardTable,
  getWizardState,
  updateWizardState,
  completeStep,
  skipToStep,
  completeWizard,
  dismissWizard,
  minimizeWizard,
  resetWizard,
  shouldShowWizard,
  getLemonSqueezyCredentials
};
