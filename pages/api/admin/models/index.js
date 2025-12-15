import fs from 'fs';
import path from 'path';

const MODELS_FILE = path.join(process.cwd(), 'data', 'models.json');
const DATA_DIR = path.join(process.cwd(), 'data', 'collections');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize default models if file doesn't exist
function initializeModels() {
  if (!fs.existsSync(MODELS_FILE)) {
    const defaultModels = {
      users: {
        name: 'users',
        displayName: 'Users/Customers',
        description: 'Customer/User accounts',
        icon: '👤',
        isSystem: true,
        schema: {
          email: { type: 'email', required: true, unique: true },
          name: { type: 'text', required: true },
          password: { type: 'password', required: true },
          subscriptionTier: {
            type: 'select',
            options: ['free', 'basic', 'premium'],
            default: 'free'
          },
          status: {
            type: 'select',
            options: ['active', 'inactive', 'suspended'],
            default: 'active'
          },
          createdAt: { type: 'datetime', auto: true },
          lastLogin: { type: 'datetime' }
        },
        timestamps: true,
        authentication: 'required'
      }
    };

    fs.writeFileSync(MODELS_FILE, JSON.stringify(defaultModels, null, 2));

    // Create default users data file
    const usersDataFile = path.join(DATA_DIR, 'users.json');
    if (!fs.existsSync(usersDataFile)) {
      fs.writeFileSync(usersDataFile, JSON.stringify([], null, 2));
    }
  }
}

function getModels() {
  initializeModels();
  const data = fs.readFileSync(MODELS_FILE, 'utf8');
  return JSON.parse(data);
}

function saveModels(models) {
  fs.writeFileSync(MODELS_FILE, JSON.stringify(models, null, 2));
}

function validateSchema(schema) {
  const validTypes = ['text', 'number', 'email', 'password', 'select', 'boolean', 'date', 'datetime', 'textarea', 'richtext', 'url', 'file', 'image'];

  for (const [fieldName, fieldConfig] of Object.entries(schema)) {
    if (!validTypes.includes(fieldConfig.type)) {
      throw new Error(`Invalid field type "${fieldConfig.type}" for field "${fieldName}"`);
    }

    if (fieldConfig.type === 'select' && !fieldConfig.options) {
      throw new Error(`Field "${fieldName}" of type "select" must have options array`);
    }
  }

  return true;
}

export default async function handler(req, res) {
  try {
    const models = getModels();

    // GET - List all models
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        models: Object.values(models)
      });
    }

    // POST - Create new model
    if (req.method === 'POST') {
      const { name, displayName, description, schema, icon, authentication } = req.body;

      if (!name || !schema) {
        return res.status(400).json({
          success: false,
          error: 'Model name and schema are required'
        });
      }

      // Validate model name (alphanumeric and underscores only)
      if (!/^[a-z][a-z0-9_]*$/.test(name)) {
        return res.status(400).json({
          success: false,
          error: 'Model name must start with a letter and contain only lowercase letters, numbers, and underscores'
        });
      }

      // Check if model already exists
      if (models[name]) {
        return res.status(400).json({
          success: false,
          error: `Model "${name}" already exists`
        });
      }

      // Validate schema
      validateSchema(schema);

      // Create new model
      const newModel = {
        name,
        displayName: displayName || name,
        description: description || '',
        icon: icon || '📄',
        isSystem: false,
        schema,
        timestamps: true,
        authentication: authentication || 'required',
        createdAt: new Date().toISOString()
      };

      models[name] = newModel;
      saveModels(models);

      // Create empty data file for this model
      const dataFile = path.join(DATA_DIR, `${name}.json`);
      fs.writeFileSync(dataFile, JSON.stringify([], null, 2));

      return res.status(201).json({
        success: true,
        model: newModel,
        message: `Model "${displayName || name}" created successfully`
      });
    }

    // PUT - Update existing model
    if (req.method === 'PUT') {
      const { name } = req.query;

      if (!name || !models[name]) {
        return res.status(404).json({
          success: false,
          error: 'Model not found'
        });
      }

      // Prevent updating system models
      if (models[name].isSystem) {
        return res.status(403).json({
          success: false,
          error: 'Cannot modify system models'
        });
      }

      const { displayName, description, schema, icon, authentication } = req.body;

      if (schema) {
        validateSchema(schema);
        models[name].schema = schema;
      }

      if (displayName) models[name].displayName = displayName;
      if (description !== undefined) models[name].description = description;
      if (icon) models[name].icon = icon;
      if (authentication) models[name].authentication = authentication;

      models[name].updatedAt = new Date().toISOString();
      saveModels(models);

      return res.status(200).json({
        success: true,
        model: models[name],
        message: 'Model updated successfully'
      });
    }

    // DELETE - Delete model
    if (req.method === 'DELETE') {
      const { name } = req.query;

      if (!name || !models[name]) {
        return res.status(404).json({
          success: false,
          error: 'Model not found'
        });
      }

      // Prevent deleting system models
      if (models[name].isSystem) {
        return res.status(403).json({
          success: false,
          error: 'Cannot delete system models'
        });
      }

      // Delete model
      delete models[name];
      saveModels(models);

      // Delete data file
      const dataFile = path.join(DATA_DIR, `${name}.json`);
      if (fs.existsSync(dataFile)) {
        fs.unlinkSync(dataFile);
      }

      return res.status(200).json({
        success: true,
        message: 'Model deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Model management error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
