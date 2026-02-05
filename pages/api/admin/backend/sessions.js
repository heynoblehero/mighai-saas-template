/**
 * Admin API: Terminal Sessions Management
 * GET /api/admin/backend/sessions - List all terminal sessions
 * POST /api/admin/backend/sessions - Create a new session
 * DELETE /api/admin/backend/sessions?id=xxx - Delete a session
 */

import { withAdminAuth } from '@/lib/auth-middleware';

async function handler(req, res) {
  const terminalManager = global.__terminalManager;

  if (!terminalManager) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Terminal manager not initialized'
    });
  }

  if (req.method === 'GET') {
    return listSessions(req, res, terminalManager);
  } else if (req.method === 'POST') {
    return createSession(req, res, terminalManager);
  } else if (req.method === 'DELETE') {
    return deleteSession(req, res, terminalManager);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

function listSessions(req, res, terminalManager) {
  try {
    const sessions = terminalManager.listSessions();

    return res.status(200).json({
      sessions: sessions.map(s => ({
        id: s.id,
        created_at: new Date(s.createdAt).toISOString(),
        last_activity: new Date(s.lastActivityAt).toISOString(),
        pid: s.pid,
        dimensions: { cols: s.cols, rows: s.rows },
        connected_clients: s.connectedClients
      })),
      max_sessions: terminalManager.maxSessions
    });
  } catch (error) {
    console.error('[Admin API] List sessions error:', error);
    return res.status(500).json({ error: 'Failed to list sessions', message: error.message });
  }
}

function createSession(req, res, terminalManager) {
  try {
    const { id, cols, rows } = req.body;

    // Generate session ID if not provided
    const sessionId = id || `session-${Date.now()}`;

    // Check if session already exists
    if (terminalManager.getSession(sessionId)) {
      return res.status(200).json({
        success: true,
        message: 'Session already exists',
        session_id: sessionId,
        exists: true
      });
    }

    // Create new session
    const session = terminalManager.createSession(sessionId, {
      cols: cols || 80,
      rows: rows || 24
    });

    return res.status(201).json({
      success: true,
      message: 'Session created',
      session_id: sessionId,
      pid: session.pty.pid,
      exists: false
    });

  } catch (error) {
    console.error('[Admin API] Create session error:', error);
    return res.status(500).json({ error: 'Failed to create session', message: error.message });
  }
}

function deleteSession(req, res, terminalManager) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const destroyed = terminalManager.destroySession(id);

    if (destroyed) {
      return res.status(200).json({
        success: true,
        message: 'Session destroyed'
      });
    } else {
      return res.status(404).json({
        error: 'Session not found',
        message: `No session with ID: ${id}`
      });
    }

  } catch (error) {
    console.error('[Admin API] Delete session error:', error);
    return res.status(500).json({ error: 'Failed to delete session', message: error.message });
  }
}

export default withAdminAuth(handler);
