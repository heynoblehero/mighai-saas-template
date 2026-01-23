import { requireAdminAuth } from '../../../../lib/auth-middleware';
import { updateWizardState, getWizardState } from '../../../../lib/setup-wizard-db';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure wizard uploads directory exists (in public for static serving)
const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'wizard');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    cb(null, `${timestamp}-${random}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const authResult = await requireAdminAuth(req, res);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = authResult.user?.id || 1;
  const uploadType = req.query.type; // 'logo', 'favicon', or 'reference'

  if (!['logo', 'favicon', 'reference'].includes(uploadType)) {
    return res.status(400).json({ error: 'Invalid upload type' });
  }

  // Handle upload based on type
  const uploadMiddleware = uploadType === 'reference'
    ? upload.array('files', 5) // Up to 5 reference images
    : upload.single('file');

  uploadMiddleware(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const state = getWizardState(userId);
      let updates = {};
      let uploadedFiles = [];

      if (uploadType === 'reference') {
        // Multiple reference images
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: 'No files uploaded' });
        }

        const existingImages = state.reference_images || [];
        const newImages = req.files.map(f => `/uploads/wizard/${f.filename}`);
        uploadedFiles = newImages;

        updates.reference_images = [...existingImages, ...newImages];
      } else {
        // Single file (logo or favicon)
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/wizard/${req.file.filename}`;
        uploadedFiles = [fileUrl];

        if (uploadType === 'logo') {
          // Delete old logo if exists
          if (state.logo_url && state.logo_url.startsWith('/uploads/wizard/')) {
            const oldPath = path.join(process.cwd(), state.logo_url);
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
          updates.logo_url = fileUrl;
        } else if (uploadType === 'favicon') {
          // Delete old favicon if exists
          if (state.favicon_url && state.favicon_url.startsWith('/uploads/wizard/')) {
            const oldPath = path.join(process.cwd(), state.favicon_url);
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
          updates.favicon_url = fileUrl;
        }
      }

      const updatedState = updateWizardState(userId, updates);

      return res.status(200).json({
        success: true,
        uploadedFiles,
        wizardState: updatedState
      });
    } catch (error) {
      console.error('Error handling upload:', error);
      return res.status(500).json({ error: 'Failed to process upload' });
    }
  });
}

export default handler;
