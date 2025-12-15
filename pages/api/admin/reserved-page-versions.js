import fs from 'fs';
import path from 'path';
const { withAdminAuth } = require('../../../lib/auth-middleware');

const RESERVED_PAGES_DIR = path.join(process.cwd(), 'data', 'reserved-pages');
const VERSIONS_DIR = path.join(process.cwd(), 'data', 'page-versions');

// Ensure versions directory exists
if (!fs.existsSync(VERSIONS_DIR)) {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

function getReservedPage(pageType) {
  try {
    const filePath = path.join(RESERVED_PAGES_DIR, `${pageType}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(`Error reading reserved page ${pageType}:`, error);
    return null;
  }
}

function saveReservedPage(pageType, pageData) {
  try {
    const filePath = path.join(RESERVED_PAGES_DIR, `${pageType}.json`);
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving reserved page ${pageType}:`, error);
    return false;
  }
}

function getAllVersions(pageType) {
  try {
    const versionPattern = new RegExp(`^${pageType}_v\\d+\\.json$`);
    const versionFiles = fs.readdirSync(VERSIONS_DIR)
      .filter(file => versionPattern.test(file))
      .sort((a, b) => {
        const versionA = parseInt(a.match(/v(\d+)/)[1]);
        const versionB = parseInt(b.match(/v(\d+)/)[1]);
        return versionB - versionA; // Most recent first
      });

    const versions = versionFiles.map(file => {
      const versionMatch = file.match(/v(\d+)/);
      const version = parseInt(versionMatch[1]);
      const filePath = path.join(VERSIONS_DIR, file);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {
          version,
          timestamp: data.timestamp,
          description: data.description || `Version ${version}`,
          deployed: data.deployed || false,
          size: JSON.stringify(data).length
        };
      } catch (error) {
        console.error(`Error reading version file ${file}:`, error);
        return null;
      }
    }).filter(Boolean);

    return versions;
  } catch (error) {
    console.error(`Error getting versions for ${pageType}:`, error);
    return [];
  }
}

function saveVersion(pageType, pageData, description = '') {
  try {
    const versions = getAllVersions(pageType);
    const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version)) + 1 : 1;
    
    const versionData = {
      ...pageData,
      version: nextVersion,
      timestamp: new Date().toISOString(),
      description: description || `Version ${nextVersion}`,
      pageType
    };

    const versionFileName = `${pageType}_v${nextVersion}.json`;
    const versionPath = path.join(VERSIONS_DIR, versionFileName);
    
    fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
    
    return { success: true, version: nextVersion, path: versionPath };
  } catch (error) {
    console.error('Error saving version:', error);
    return { success: false, error: error.message };
  }
}

function getVersion(pageType, version) {
  try {
    const versionFileName = `${pageType}_v${version}.json`;
    const versionPath = path.join(VERSIONS_DIR, versionFileName);
    
    if (fs.existsSync(versionPath)) {
      const data = fs.readFileSync(versionPath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(`Error reading version ${version} for ${pageType}:`, error);
    return null;
  }
}

function restoreVersion(pageType, version) {
  try {
    const versionData = getVersion(pageType, version);
    if (!versionData) {
      return { success: false, error: 'Version not found' };
    }

    // Create a new version from current state before restoring
    const currentPage = getReservedPage(pageType);
    if (currentPage) {
      saveVersion(pageType, currentPage, `Auto-backup before restore to v${version}`);
    }

    // Restore the version (but with a new version number)
    const newVersionNumber = getAllVersions(pageType).length > 0 ? 
      Math.max(...getAllVersions(pageType).map(v => v.version)) + 1 : 1;

    const restoredData = {
      ...versionData,
      version: newVersionNumber,
      lastModified: new Date().toISOString(),
      restoredFrom: version,
      restoredAt: new Date().toISOString()
    };

    const saved = saveReservedPage(pageType, restoredData);
    
    if (saved) {
      // Also save this as a new version
      saveVersion(pageType, restoredData, `Restored from version ${version}`);
      return { success: true, newVersion: newVersionNumber };
    } else {
      return { success: false, error: 'Failed to save restored version' };
    }
  } catch (error) {
    console.error('Error restoring version:', error);
    return { success: false, error: error.message };
  }
}

function deleteVersion(pageType, version) {
  try {
    const versionFileName = `${pageType}_v${version}.json`;
    const versionPath = path.join(VERSIONS_DIR, versionFileName);
    
    if (fs.existsSync(versionPath)) {
      fs.unlinkSync(versionPath);
      return { success: true };
    } else {
      return { success: false, error: 'Version not found' };
    }
  } catch (error) {
    console.error('Error deleting version:', error);
    return { success: false, error: error.message };
  }
}

async function handler(req, res) {
  const { pageType, version } = req.query;

  if (!pageType) {
    return res.status(400).json({ error: 'pageType is required' });
  }

  if (req.method === 'GET') {
    if (version) {
      // Get specific version
      const versionData = getVersion(pageType, parseInt(version));
      if (versionData) {
        return res.status(200).json({ success: true, version: versionData });
      } else {
        return res.status(404).json({ success: false, error: 'Version not found' });
      }
    } else {
      // Get all versions
      const versions = getAllVersions(pageType);
      return res.status(200).json({ success: true, versions });
    }
  }

  if (req.method === 'POST') {
    const { action, description } = req.body;

    if (action === 'save') {
      // Save current state as a new version
      const currentPage = getReservedPage(pageType);
      if (!currentPage) {
        return res.status(404).json({ success: false, error: 'No current page found to version' });
      }

      const result = saveVersion(pageType, currentPage, description);
      if (result.success) {
        return res.status(200).json({ 
          success: true, 
          message: 'Version saved successfully',
          version: result.version 
        });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }
    }

    if (action === 'restore') {
      if (!version) {
        return res.status(400).json({ success: false, error: 'version is required for restore action' });
      }

      const result = restoreVersion(pageType, parseInt(version));
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: `Restored to version ${version}`,
          newVersion: result.newVersion
        });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  if (req.method === 'DELETE') {
    if (!version) {
      return res.status(400).json({ success: false, error: 'version is required for deletion' });
    }

    const result = deleteVersion(pageType, parseInt(version));
    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        message: `Version ${version} deleted successfully` 
      });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);