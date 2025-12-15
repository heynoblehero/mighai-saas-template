import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const MODELS_FILE = path.join(process.cwd(), 'data', 'models.json');
const DATA_DIR = path.join(process.cwd(), 'data', 'collections');

function getModels() {
  if (!fs.existsSync(MODELS_FILE)) {
    return {};
  }
  const data = fs.readFileSync(MODELS_FILE, 'utf8');
  return JSON.parse(data);
}

function getModelData(modelName) {
  const dataFile = path.join(DATA_DIR, `${modelName}.json`);
  if (!fs.existsSync(dataFile)) {
    return [];
  }
  const data = fs.readFileSync(dataFile, 'utf8');
  return JSON.parse(data);
}

function saveModelData(modelName, data) {
  const dataFile = path.join(DATA_DIR, `${modelName}.json`);
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function validateAndProcessField(fieldName, fieldValue, fieldSchema, isUpdate = false) {
  // Required validation
  if (fieldSchema.required && !isUpdate && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
    throw new Error(`Field "${fieldName}" is required`);
  }

  // Skip validation if value is not provided in update
  if (isUpdate && (fieldValue === undefined || fieldValue === null)) {
    return undefined;
  }

  // Type-specific validation and processing
  switch (fieldSchema.type) {
    case 'email':
      if (fieldValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue)) {
        throw new Error(`Field "${fieldName}" must be a valid email`);
      }
      break;

    case 'number':
      if (fieldValue !== '' && fieldValue !== null) {
        const num = Number(fieldValue);
        if (isNaN(num)) {
          throw new Error(`Field "${fieldName}" must be a number`);
        }
        return num;
      }
      break;

    case 'boolean':
      return Boolean(fieldValue);

    case 'select':
      if (fieldValue && !fieldSchema.options.includes(fieldValue)) {
        throw new Error(`Field "${fieldName}" must be one of: ${fieldSchema.options.join(', ')}`);
      }
      break;

    case 'password':
      if (fieldValue && fieldValue.length > 0) {
        // Hash password
        return await bcrypt.hash(fieldValue, 10);
      }
      return undefined; // Don't update password if not provided
      break;

    case 'url':
      if (fieldValue) {
        try {
          new URL(fieldValue);
        } catch {
          throw new Error(`Field "${fieldName}" must be a valid URL`);
        }
      }
      break;
  }

  return fieldValue;
}

async function validateRecord(record, schema, existingData = [], excludeId = null, isUpdate = false) {
  const validatedRecord = {};

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    // Skip auto fields
    if (fieldSchema.auto) continue;

    const fieldValue = record[fieldName];
    const processedValue = await validateAndProcessField(fieldName, fieldValue, fieldSchema, isUpdate);

    // Only include in update if value was provided
    if (isUpdate && processedValue === undefined && fieldValue === undefined) {
      continue;
    }

    // Check unique constraint
    if (fieldSchema.unique && processedValue !== undefined && processedValue !== null && processedValue !== '') {
      const duplicate = existingData.find(
        item => item[fieldName] === processedValue && item.id !== excludeId
      );
      if (duplicate) {
        throw new Error(`Field "${fieldName}" must be unique. Value "${processedValue}" already exists`);
      }
    }

    validatedRecord[fieldName] = processedValue;
  }

  return validatedRecord;
}

export default async function handler(req, res) {
  try {
    const { model } = req.query;

    if (!model) {
      return res.status(400).json({
        success: false,
        error: 'Model name is required'
      });
    }

    const models = getModels();
    const modelSchema = models[model];

    if (!modelSchema) {
      return res.status(404).json({
        success: false,
        error: `Model "${model}" not found`
      });
    }

    const data = getModelData(model);

    // GET - List all records or get single record
    if (req.method === 'GET') {
      const { id } = req.query;

      if (id) {
        // Get single record
        const record = data.find(item => item.id === id);
        if (!record) {
          return res.status(404).json({
            success: false,
            error: 'Record not found'
          });
        }

        // Remove password field from response
        const { password, ...safeRecord } = record;
        return res.status(200).json({
          success: true,
          record: safeRecord
        });
      }

      // List all records (remove passwords)
      const safeData = data.map(({ password, ...record }) => record);
      return res.status(200).json({
        success: true,
        records: safeData,
        total: safeData.length
      });
    }

    // POST - Create new record
    if (req.method === 'POST') {
      const recordData = req.body;

      // Validate record
      const validatedRecord = await validateRecord(recordData, modelSchema.schema, data);

      // Add metadata
      const newRecord = {
        id: generateId(),
        ...validatedRecord
      };

      // Add timestamps if enabled
      if (modelSchema.timestamps) {
        newRecord.createdAt = new Date().toISOString();
        newRecord.updatedAt = new Date().toISOString();
      }

      // Add auto fields
      for (const [fieldName, fieldSchema] of Object.entries(modelSchema.schema)) {
        if (fieldSchema.auto && fieldSchema.type === 'datetime') {
          newRecord[fieldName] = new Date().toISOString();
        }
      }

      data.push(newRecord);
      saveModelData(model, data);

      // Remove password from response
      const { password, ...safeRecord } = newRecord;
      return res.status(201).json({
        success: true,
        record: safeRecord,
        message: 'Record created successfully'
      });
    }

    // PUT - Update record
    if (req.method === 'PUT') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Record ID is required'
        });
      }

      const recordIndex = data.findIndex(item => item.id === id);
      if (recordIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Record not found'
        });
      }

      const recordData = req.body;
      const validatedRecord = await validateRecord(recordData, modelSchema.schema, data, id, true);

      // Update record
      const updatedRecord = {
        ...data[recordIndex],
        ...validatedRecord
      };

      // Update timestamp
      if (modelSchema.timestamps) {
        updatedRecord.updatedAt = new Date().toISOString();
      }

      data[recordIndex] = updatedRecord;
      saveModelData(model, data);

      // Remove password from response
      const { password, ...safeRecord } = updatedRecord;
      return res.status(200).json({
        success: true,
        record: safeRecord,
        message: 'Record updated successfully'
      });
    }

    // DELETE - Delete record
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Record ID is required'
        });
      }

      const recordIndex = data.findIndex(item => item.id === id);
      if (recordIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Record not found'
        });
      }

      data.splice(recordIndex, 1);
      saveModelData(model, data);

      return res.status(200).json({
        success: true,
        message: 'Record deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Data operation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
