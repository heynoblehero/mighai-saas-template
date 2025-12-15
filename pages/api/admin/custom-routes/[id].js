import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.NODE_ENV === 'production'
  ? '/tmp/site_builder.db'
  : path.join(process.cwd(), '..', 'mighai (copy)', 'site_builder.db');

export default async function handler(req, res) {
  const { id } = req.query;

  if (!req.session || !req.session.passport || !req.session.passport.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = new sqlite3.Database(dbPath);

  if (req.method === 'GET') {
    // Get single custom route
    db.get(
      'SELECT * FROM custom_api_routes WHERE id = ?',
      [id],
      (err, route) => {
        db.close();
        if (err) {
          console.error('Error fetching route:', err);
          return res.status(500).json({ error: 'Failed to fetch route' });
        }

        if (!route) {
          return res.status(404).json({ error: 'Route not found' });
        }

        res.status(200).json({
          ...route,
          packages: JSON.parse(route.packages || '[]'),
          installed_packages: JSON.parse(route.installed_packages || '[]')
        });
      }
    );

  } else if (req.method === 'PUT') {
    // Update custom route
    const { name, slug, method, description, code, packages, status, auth_required, rate_limit_per_day, plan_access } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (slug !== undefined) {
      const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      updates.push('slug = ?');
      params.push(sanitizedSlug);
    }

    if (method !== undefined) {
      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      if (!validMethods.includes(method.toUpperCase())) {
        db.close();
        return res.status(400).json({ error: 'Invalid HTTP method' });
      }
      updates.push('method = ?');
      params.push(method.toUpperCase());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (code !== undefined) {
      updates.push('code = ?');
      params.push(code);
    }

    if (packages !== undefined) {
      updates.push('packages = ?');
      params.push(JSON.stringify(packages));
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'active', 'inactive'];
      if (!validStatuses.includes(status)) {
        db.close();
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (auth_required !== undefined) {
      updates.push('auth_required = ?');
      params.push(auth_required ? 1 : 0);
    }

    if (rate_limit_per_day !== undefined) {
      updates.push('rate_limit_per_day = ?');
      params.push(rate_limit_per_day || null);
    }

    if (plan_access !== undefined) {
      const validAccessLevels = ['public', 'any_subscriber', 'paid_only'];
      if (!validAccessLevels.includes(plan_access)) {
        db.close();
        return res.status(400).json({ error: 'Invalid plan_access value' });
      }
      updates.push('plan_access = ?');
      params.push(plan_access);
    }

    if (updates.length === 0) {
      db.close();
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE custom_api_routes SET ${updates.join(', ')} WHERE id = ?`;

    db.run(query, params, function(err) {
      if (err) {
        console.error('Error updating route:', err);
        db.close();
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Route slug already exists' });
        }
        return res.status(500).json({ error: 'Failed to update route' });
      }

      if (this.changes === 0) {
        db.close();
        return res.status(404).json({ error: 'Route not found' });
      }

      // Fetch updated route
      db.get(
        'SELECT * FROM custom_api_routes WHERE id = ?',
        [id],
        (err, route) => {
          db.close();
          if (err) {
            return res.status(500).json({ error: 'Route updated but failed to fetch' });
          }

          res.status(200).json({
            ...route,
            packages: JSON.parse(route.packages || '[]'),
            installed_packages: JSON.parse(route.installed_packages || '[]')
          });
        }
      );
    });

  } else if (req.method === 'DELETE') {
    // Delete custom route
    db.run(
      'DELETE FROM custom_api_routes WHERE id = ?',
      [id],
      function(err) {
        db.close();
        if (err) {
          console.error('Error deleting route:', err);
          return res.status(500).json({ error: 'Failed to delete route' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Route not found' });
        }

        res.status(200).json({ success: true, message: 'Route deleted successfully' });
      }
    );

  } else {
    db.close();
    res.status(405).json({ error: 'Method not allowed' });
  }
}
