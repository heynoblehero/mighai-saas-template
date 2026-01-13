import db from '../../../lib/database';

// Ensure tables exist
function ensureTables() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS heatmap_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      visitor_id TEXT,
      page_path TEXT NOT NULL,
      page_url TEXT,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      x_percent REAL,
      y_percent REAL,
      viewport_width INTEGER,
      viewport_height INTEGER,
      page_width INTEGER,
      page_height INTEGER,
      element_tag TEXT,
      element_id TEXT,
      element_class TEXT,
      element_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS heatmap_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      visitor_id TEXT,
      page_path TEXT NOT NULL,
      points TEXT NOT NULL,
      viewport_width INTEGER,
      viewport_height INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS heatmap_scroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      visitor_id TEXT,
      page_path TEXT NOT NULL,
      max_scroll_percent INTEGER DEFAULT 0,
      viewport_height INTEGER,
      page_height INTEGER,
      fold_views TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    ensureTables();

    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Missing type or data' });
    }

    switch (type) {
      case 'click':
        return handleClick(data, res);
      case 'movement':
        return handleMovement(data, res);
      case 'scroll':
        return handleScroll(data, res);
      case 'batch':
        return handleBatch(data, res);
      default:
        return res.status(400).json({ error: 'Invalid tracking type' });
    }
  } catch (error) {
    console.error('Heatmap tracking error:', error);
    return res.status(500).json({ error: 'Failed to track heatmap data' });
  }
}

function handleClick(data, res) {
  const {
    session_id, visitor_id, page_path, page_url,
    x, y, x_percent, y_percent,
    viewport_width, viewport_height, page_width, page_height,
    element_tag, element_id, element_class, element_text
  } = data;

  if (!session_id || !page_path || x === undefined || y === undefined) {
    return res.status(400).json({ error: 'Missing required click data' });
  }

  db.prepare(`
    INSERT INTO heatmap_clicks (
      session_id, visitor_id, page_path, page_url,
      x, y, x_percent, y_percent,
      viewport_width, viewport_height, page_width, page_height,
      element_tag, element_id, element_class, element_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session_id, visitor_id || null, page_path, page_url || null,
    x, y, x_percent || null, y_percent || null,
    viewport_width || null, viewport_height || null, page_width || null, page_height || null,
    element_tag || null, element_id || null, element_class || null,
    element_text ? element_text.substring(0, 100) : null
  );

  return res.status(200).json({ success: true });
}

function handleMovement(data, res) {
  const { session_id, visitor_id, page_path, points, viewport_width, viewport_height } = data;

  if (!session_id || !page_path || !points || !Array.isArray(points)) {
    return res.status(400).json({ error: 'Missing required movement data' });
  }

  // Store points as JSON string
  db.prepare(`
    INSERT INTO heatmap_movements (
      session_id, visitor_id, page_path, points, viewport_width, viewport_height
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    session_id, visitor_id || null, page_path,
    JSON.stringify(points),
    viewport_width || null, viewport_height || null
  );

  return res.status(200).json({ success: true });
}

function handleScroll(data, res) {
  const { session_id, visitor_id, page_path, max_scroll_percent, viewport_height, page_height, fold_views } = data;

  if (!session_id || !page_path) {
    return res.status(400).json({ error: 'Missing required scroll data' });
  }

  // Upsert scroll data - update if session+page exists, otherwise insert
  const existing = db.prepare(`
    SELECT id FROM heatmap_scroll WHERE session_id = ? AND page_path = ?
  `).get(session_id, page_path);

  if (existing) {
    db.prepare(`
      UPDATE heatmap_scroll
      SET max_scroll_percent = MAX(max_scroll_percent, ?),
          fold_views = ?,
          viewport_height = COALESCE(?, viewport_height),
          page_height = COALESCE(?, page_height)
      WHERE id = ?
    `).run(max_scroll_percent || 0, fold_views ? JSON.stringify(fold_views) : null, viewport_height, page_height, existing.id);
  } else {
    db.prepare(`
      INSERT INTO heatmap_scroll (
        session_id, visitor_id, page_path, max_scroll_percent, viewport_height, page_height, fold_views
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      session_id, visitor_id || null, page_path,
      max_scroll_percent || 0, viewport_height || null, page_height || null,
      fold_views ? JSON.stringify(fold_views) : null
    );
  }

  return res.status(200).json({ success: true });
}

function handleBatch(data, res) {
  const { clicks, movements, scroll } = data;

  // Process clicks
  if (clicks && Array.isArray(clicks)) {
    const stmt = db.prepare(`
      INSERT INTO heatmap_clicks (
        session_id, visitor_id, page_path, page_url,
        x, y, x_percent, y_percent,
        viewport_width, viewport_height, page_width, page_height,
        element_tag, element_id, element_class, element_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items) => {
      for (const c of items) {
        stmt.run(
          c.session_id, c.visitor_id || null, c.page_path, c.page_url || null,
          c.x, c.y, c.x_percent || null, c.y_percent || null,
          c.viewport_width || null, c.viewport_height || null, c.page_width || null, c.page_height || null,
          c.element_tag || null, c.element_id || null, c.element_class || null,
          c.element_text ? c.element_text.substring(0, 100) : null
        );
      }
    });

    insertMany(clicks);
  }

  // Process movements
  if (movements && Array.isArray(movements)) {
    const stmt = db.prepare(`
      INSERT INTO heatmap_movements (
        session_id, visitor_id, page_path, points, viewport_width, viewport_height
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items) => {
      for (const m of items) {
        stmt.run(
          m.session_id, m.visitor_id || null, m.page_path,
          JSON.stringify(m.points),
          m.viewport_width || null, m.viewport_height || null
        );
      }
    });

    insertMany(movements);
  }

  // Process scroll
  if (scroll) {
    handleScroll(scroll, { status: () => ({ json: () => {} }) });
  }

  return res.status(200).json({ success: true });
}
