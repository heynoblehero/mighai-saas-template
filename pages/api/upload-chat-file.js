import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Papa from 'papaparse';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'public', 'uploads', 'chat-files'),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filename: (name, ext, part, form) => {
        return `${Date.now()}_${part.originalFilename}`;
      }
    });

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat-files');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/markdown',
      'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/javascript', 'text/jsx', 'text/typescript', 'text/tsx',
      'application/json', 'text/html', 'text/css'
    ];

    const isValidType = allowedTypes.includes(file.mimetype) ||
      file.originalFilename?.match(/\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|txt|md|csv|xls|xlsx|js|jsx|ts|tsx|json|html|css)$/i);

    if (!isValidType) {
      // Delete the uploaded file
      fs.unlinkSync(file.filepath);
      return res.status(400).json({ error: 'File type not supported' });
    }

    // Extract text if applicable
    let extractedText = '';

    try {
      if (file.mimetype === 'application/pdf') {
        // Extract text from PDF
        const dataBuffer = fs.readFileSync(file.filepath);
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text;
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Extract text from DOCX
        const result = await mammoth.extractRawText({ path: file.filepath });
        extractedText = result.value;
      } else if (file.mimetype === 'text/csv') {
        // Parse CSV
        const csvContent = fs.readFileSync(file.filepath, 'utf-8');
        const parsed = Papa.parse(csvContent, { header: true });
        extractedText = JSON.stringify(parsed.data, null, 2);
      } else if (
        file.mimetype === 'text/plain' ||
        file.mimetype === 'text/markdown' ||
        file.mimetype === 'text/javascript' ||
        file.mimetype === 'application/json' ||
        file.mimetype === 'text/html' ||
        file.mimetype === 'text/css'
      ) {
        // Read text files directly
        extractedText = fs.readFileSync(file.filepath, 'utf-8');

        // Limit text size for very large files
        if (extractedText.length > 50000) {
          extractedText = extractedText.substring(0, 50000) + '\n\n[Text truncated - file too large]';
        }
      }
    } catch (extractError) {
      console.error('Error extracting text:', extractError);
      // Continue without extracted text
    }

    // Generate file URL
    const fileName = path.basename(file.filepath);
    const fileUrl = `/uploads/chat-files/${fileName}`;

    // Generate file ID
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Return file info
    return res.status(200).json({
      success: true,
      id: fileId,
      name: file.originalFilename,
      type: file.mimetype,
      size: file.size,
      url: fileUrl,
      extractedText: extractedText || null
    });
  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ error: 'File upload failed' });
  }
}
