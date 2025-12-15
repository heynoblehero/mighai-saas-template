import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import config from '../../../lib/config';



function getAdmin(req) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    
    const decoded = jwt.verify(token, config.JWT_SECRET);
    return decoded.role === 'admin' ? decoded : null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method === 'GET') {
    const { fileName } = req.query;
    
    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }

    try {
      const filePath = path.join(process.cwd(), 'uploads', 'blog-data', fileName);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const fileExtension = path.extname(fileName).toLowerCase();
      let parsedData;

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
      } else {
        return res.status(400).json({ error: 'Unsupported file format' });
      }

      res.status(200).json({
        success: true,
        data: parsedData,
        recordCount: parsedData.length
      });

    } catch (error) {
      console.error('Failed to read data file:', error);
      res.status(500).json({ error: 'Failed to read data file' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}