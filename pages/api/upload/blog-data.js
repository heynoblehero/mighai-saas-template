import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import appConfig from '../../../lib/config';



function getAdmin(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    
    const decoded = jwt.verify(token, appConfig.JWT_SECRET);
    return decoded.role === 'admin' ? decoded : null;
  } catch (error) {
    return null;
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'blog-data');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      cb(null, `blog-data-${timestamp}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method === 'POST') {
    try {
      await runMiddleware(req, res, upload.single('dataFile'));
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = req.file.path;
      const fileName = req.file.filename;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      
      // Read and parse the file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      let parsedData;
      
      try {
        if (fileExtension === '.json') {
          parsedData = JSON.parse(fileContent);
        } else if (fileExtension === '.csv') {
          const lines = fileContent.trim().split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          parsedData = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            parsedData.push(row);
          }
        }
        
        // Validate data structure
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
          throw new Error('File must contain an array of objects with at least one item');
        }

        // Return success with file info and sample data
        res.status(200).json({
          success: true,
          fileName: req.file.originalname,
          filePath: fileName,
          recordCount: parsedData.length,
          sampleData: parsedData.slice(0, 3), // Return first 3 records as sample
          availableFields: Object.keys(parsedData[0])
        });

      } catch (parseError) {
        // Clean up uploaded file if parsing fails
        fs.unlinkSync(filePath);
        res.status(400).json({ 
          error: `Failed to parse ${fileExtension.slice(1).toUpperCase()} file: ${parseError.message}` 
        });
      }

    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'File upload failed: ' + error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Disable Next.js body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};