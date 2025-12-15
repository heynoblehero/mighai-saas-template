import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'layouts');

  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir: uploadDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    filename: (name, ext, part, form) => {
      return `layout-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    },
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Upload failed', details: err.message });
    }

    const file = files.image;
    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const fileArray = Array.isArray(file) ? file : [file];
    const uploadedFile = fileArray[0];

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(uploadedFile.mimetype)) {
      fs.unlinkSync(uploadedFile.filepath);
      return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
    }

    const filename = path.basename(uploadedFile.filepath);
    const publicPath = `/uploads/layouts/${filename}`;

    res.status(200).json({
      success: true,
      filename: filename,
      path: publicPath,
      url: `${req.headers.origin || 'http://localhost:5000'}${publicPath}`,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype
    });
  });
}
