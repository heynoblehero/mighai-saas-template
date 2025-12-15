const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Dangerous file extensions that should never be allowed
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.sh', '.bash', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
  '.cgi', '.dll', '.so', '.dylib', '.app', '.deb', '.rpm', '.msi', '.dmg'
];

// Dangerous MIME types
const DANGEROUS_MIME_TYPES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-shellscript',
  'application/x-php',
  'text/x-php',
  'application/x-httpd-php',
  'text/x-script.python',
  'application/x-perl',
  'application/x-ruby'
];

// Safe MIME types that are commonly allowed
const SAFE_MIME_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  presentations: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  text: ['text/plain', 'text/csv', 'text/html', 'text/css'],
  video: ['video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  archives: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
};

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
function sanitizeFilename(filename) {
  // Remove any path components
  filename = path.basename(filename);

  // Remove dangerous characters
  filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure filename is not empty
  if (!filename || filename === '_') {
    filename = 'file_' + Date.now();
  }

  // Limit length
  if (filename.length > 255) {
    const ext = path.extname(filename);
    const name = filename.substring(0, 255 - ext.length);
    filename = name + ext;
  }

  return filename;
}

/**
 * Generate a unique, secure filename
 */
function generateSecureFilename(originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase();
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}_${hash}${ext}`;
}

/**
 * Check if file extension is dangerous
 */
function isDangerousExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  return DANGEROUS_EXTENSIONS.includes(ext);
}

/**
 * Check if MIME type is dangerous
 */
function isDangerousMimeType(mimeType) {
  return DANGEROUS_MIME_TYPES.some(dangerous =>
    mimeType.toLowerCase().includes(dangerous.toLowerCase())
  );
}

/**
 * Validate file against bucket configuration
 */
function validateFile(file, bucketConfig) {
  const errors = [];

  // Check file size
  if (file.size > bucketConfig.max_file_size) {
    errors.push(`File size ${file.size} exceeds maximum allowed size ${bucketConfig.max_file_size}`);
  }

  // Check for dangerous extensions
  if (isDangerousExtension(file.originalname)) {
    errors.push(`File extension is not allowed for security reasons`);
  }

  // Check for dangerous MIME types
  if (isDangerousMimeType(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed for security reasons`);
  }

  // Check if MIME type is allowed in bucket
  if (bucketConfig.allowed_file_types) {
    const allowedTypes = JSON.parse(bucketConfig.allowed_file_types || '[]');
    if (allowedTypes.length > 0) {
      const isAllowed = allowedTypes.some(allowed => {
        if (allowed.includes('*')) {
          // Handle wildcards like 'image/*'
          const prefix = allowed.split('/')[0];
          return file.mimetype.startsWith(prefix + '/');
        }
        return file.mimetype === allowed;
      });

      if (!isAllowed) {
        errors.push(`File type ${file.mimetype} is not allowed in this bucket`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Basic virus scan check (checks for common malicious patterns in file header)
 */
async function performBasicVirusScan(filePath) {
  return new Promise((resolve) => {
    try {
      // Read first 8KB of file for signature checking
      const buffer = Buffer.alloc(8192);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 8192, 0);
      fs.closeSync(fd);

      // Convert to string for pattern matching
      const header = buffer.toString('hex');

      // Check for common executable signatures
      const maliciousSignatures = [
        '4d5a', // MZ (Windows executable)
        '7f454c46', // ELF (Linux executable)
        'cafebabe', // Java class file
        'd0cf11e0a1b11ae1', // MS Office/OLE (could contain macros)
      ];

      // Check for script patterns in text files
      const textContent = buffer.toString('utf8');
      const scriptPatterns = [
        /<script/i,
        /eval\(/i,
        /exec\(/i,
        /system\(/i,
        /passthru\(/i,
        /shell_exec/i,
        /<?php/i,
        /<%=/i
      ];

      let suspicious = false;

      // Check binary signatures
      for (const sig of maliciousSignatures) {
        if (header.startsWith(sig)) {
          suspicious = true;
          break;
        }
      }

      // Check for script patterns
      if (!suspicious) {
        for (const pattern of scriptPatterns) {
          if (pattern.test(textContent)) {
            suspicious = true;
            break;
          }
        }
      }

      resolve({
        scanned: true,
        safe: !suspicious,
        status: suspicious ? 'suspicious' : 'safe'
      });
    } catch (error) {
      console.error('Virus scan error:', error);
      resolve({
        scanned: true,
        safe: false,
        status: 'error',
        error: error.message
      });
    }
  });
}

/**
 * Check if user has access to file
 */
function checkFileAccess(file, user, isAdmin) {
  if (isAdmin) return true;

  if (file.access_level === 'public') return true;
  if (file.access_level === 'admin') return isAdmin;
  if (file.access_level === 'user' || file.access_level === 'private') {
    return user && user.email === file.uploaded_by;
  }

  return false;
}

module.exports = {
  sanitizeFilename,
  generateSecureFilename,
  isDangerousExtension,
  isDangerousMimeType,
  validateFile,
  performBasicVirusScan,
  checkFileAccess,
  SAFE_MIME_TYPES,
  DANGEROUS_EXTENSIONS,
  DANGEROUS_MIME_TYPES
};
