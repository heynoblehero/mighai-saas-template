import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.NODE_ENV === 'production'
  ? '/tmp/site_builder.db'
  : path.join(process.cwd(), '..', 'mighai (copy)', 'site_builder.db');

export default async function handler(req, res) {
  const db = new sqlite3.Database(dbPath);

  // Check authentication
  if (!req.session || !req.session.passport || !req.session.passport.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.session.passport.user;

  if (req.method === 'GET') {
    // List all custom API routes
    const { status, search } = req.query;

    let query = 'SELECT * FROM custom_api_routes WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (name LIKE ? OR slug LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, routes) => {
      db.close();
      if (err) {
        console.error('Error fetching custom routes:', err);
        return res.status(500).json({ error: 'Failed to fetch routes' });
      }

      // Parse JSON fields
      const parsedRoutes = routes.map(route => ({
        ...route,
        packages: JSON.parse(route.packages || '[]'),
        installed_packages: JSON.parse(route.installed_packages || '[]')
      }));

      res.status(200).json(parsedRoutes);
    });

  } else if (req.method === 'POST') {
    // Create new custom API route
    const { name, slug, method, description, code, packages, auth_required, rate_limit_per_day, plan_access } = req.body;

    if (!name || !slug || !method || !code) {
      db.close();
      return res.status(400).json({ error: 'Name, slug, method, and code are required' });
    }

    // Validate method
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(method.toUpperCase())) {
      db.close();
      return res.status(400).json({ error: 'Invalid HTTP method' });
    }

    // Sanitize slug
    const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const packagesJson = JSON.stringify(packages || []);

    const finalPlanAccess = plan_access || 'public';

    db.run(
      `INSERT INTO custom_api_routes
       (name, slug, method, description, code, packages, auth_required, rate_limit_per_day, plan_access, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, sanitizedSlug, method.toUpperCase(), description || '', code, packagesJson, auth_required ? 1 : 0, rate_limit_per_day || null, finalPlanAccess, userId],
      function(err) {
        if (err) {
          console.error('Error creating custom route:', err);
          db.close();
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Route slug already exists' });
          }
          return res.status(500).json({ error: 'Failed to create route' });
        }

        const routeId = this.lastID;

        // Fetch the created route
        db.get(
          'SELECT * FROM custom_api_routes WHERE id = ?',
          [routeId],
          (err, route) => {
            db.close();
            if (err) {
              return res.status(500).json({ error: 'Route created but failed to fetch' });
            }

            res.status(201).json({
              ...route,
              packages: JSON.parse(route.packages || '[]'),
              installed_packages: JSON.parse(route.installed_packages || '[]')
            });
          }
        );
      }
    );

  } else {
    db.close();
    res.status(405).json({ error: 'Method not allowed' });
  }
}
