import sqlite3 from 'sqlite3';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { DATABASE_URL } from '@/lib/config';
import { withAdminAuth } from '@/lib/auth-middleware.js';

const execAsync = promisify(exec);

// Extract the database path from the DATABASE_URL
const dbPath = DATABASE_URL.replace('sqlite:', '');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = new sqlite3.Database(dbPath);

  // Get the route
  db.get(
    'SELECT * FROM custom_api_routes WHERE id = ?',
    [id],
    async (err, route) => {
      if (err) {
        console.error('Error fetching route:', err);
        db.close();
        return res.status(500).json({ error: 'Failed to fetch route' });
      }

      if (!route) {
        db.close();
        return res.status(404).json({ error: 'Route not found' });
      }

      const packages = JSON.parse(route.packages || '[]');

      if (packages.length === 0) {
        db.close();
        return res.status(400).json({ error: 'No packages to install' });
      }

      // Create route-specific directory for node_modules
      const routeDir = path.join(process.cwd(), 'custom-routes', `route-${id}`);

      try {
        if (!fs.existsSync(routeDir)) {
          fs.mkdirSync(routeDir, { recursive: true });
        }

        // Create package.json if it doesn't exist
        const packageJsonPath = path.join(routeDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          fs.writeFileSync(
            packageJsonPath,
            JSON.stringify({
              name: `custom-route-${id}`,
              version: '1.0.0',
              private: true
            }, null, 2)
          );
        }

        // Install packages
        console.log(`Installing packages for route ${id}:`, packages);

        const installCommand = `npm install ${packages.join(' ')} --save --prefix ${routeDir}`;

        const { stdout, stderr } = await execAsync(installCommand, {
          timeout: 120000, // 2 minutes timeout
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        console.log('Installation output:', stdout);
        if (stderr) console.log('Installation stderr:', stderr);

        // Update installed_packages in database
        db.run(
          'UPDATE custom_api_routes SET installed_packages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [JSON.stringify(packages), id],
          function(updateErr) {
            db.close();

            if (updateErr) {
              console.error('Error updating installed packages:', updateErr);
              return res.status(500).json({
                error: 'Packages installed but failed to update database',
                stdout,
                stderr
              });
            }

            res.status(200).json({
              success: true,
              message: 'Packages installed successfully',
              packages,
              stdout,
              stderr
            });
          }
        );

      } catch (error) {
        db.close();
        console.error('Package installation error:', error);
        res.status(500).json({
          error: 'Failed to install packages',
          message: error.message,
          stdout: error.stdout,
          stderr: error.stderr
        });
      }
    }
  );
}

export default withAdminAuth(handler);
