/**
 * Terminal Manager Service
 * Manages multiple persistent terminal sessions with node-pty
 */

const pty = require('node-pty');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class TerminalManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.userHomeDir = options.userHomeDir || path.join(process.cwd(), 'user-home');
    this.maxSessions = options.maxSessions || 5;
    this.internalApiToken = options.internalApiToken || this.generateToken();

    // Ensure user home directory exists
    this.ensureUserHome();
  }

  /**
   * Generate a secure internal API token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Ensure user home directory exists with proper structure
   */
  ensureUserHome() {
    if (!fs.existsSync(this.userHomeDir)) {
      fs.mkdirSync(this.userHomeDir, { recursive: true });
    }

    // Create common subdirectories
    const subdirs = ['projects', 'bin', '.config'];
    subdirs.forEach(dir => {
      const fullPath = path.join(this.userHomeDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });

    // Create a basic .bashrc if it doesn't exist
    const bashrcPath = path.join(this.userHomeDir, '.bashrc');
    if (!fs.existsSync(bashrcPath)) {
      const bashrcContent = `# Admin Backend Shell Configuration
export PS1='\\[\\033[01;32m\\]admin@backend\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export INTERNAL_API_TOKEN="${this.internalApiToken}"

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'

# Welcome message
echo "Welcome to your backend environment!"
echo "Your files are persisted in ~/projects"
echo "Internal API token available as \\$INTERNAL_API_TOKEN"
echo ""
`;
      fs.writeFileSync(bashrcPath, bashrcContent);
    }
  }

  /**
   * Create a new terminal session
   */
  createSession(sessionId, options = {}) {
    // Check max sessions limit
    if (this.sessions.size >= this.maxSessions) {
      // Find and close oldest inactive session
      const oldestSession = this.findOldestSession();
      if (oldestSession) {
        this.destroySession(oldestSession);
      }
    }

    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const cols = options.cols || 80;
    const rows = options.rows || 24;

    // Build environment with internal token
    const env = {
      ...process.env,
      HOME: this.userHomeDir,
      TERM: 'xterm-256color',
      INTERNAL_API_TOKEN: this.internalApiToken,
      SHELL: '/bin/bash',
      USER: 'admin',
      LANG: 'en_US.UTF-8'
    };

    // Remove potentially dangerous env vars
    delete env.SUDO_USER;
    delete env.SUDO_UID;
    delete env.SUDO_GID;
    delete env.SUDO_COMMAND;

    const ptyProcess = pty.spawn(shell, ['--rcfile', path.join(this.userHomeDir, '.bashrc')], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: this.userHomeDir,
      env
    });

    const session = {
      id: sessionId,
      pty: ptyProcess,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      cols,
      rows,
      history: [],
      websockets: new Set()
    };

    this.sessions.set(sessionId, session);
    console.log(`[TerminalManager] Created session ${sessionId}, PID: ${ptyProcess.pid}`);

    return session;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
    }
    return session;
  }

  /**
   * Get or create a session
   */
  getOrCreateSession(sessionId, options = {}) {
    return this.getSession(sessionId) || this.createSession(sessionId, options);
  }

  /**
   * Destroy a terminal session
   */
  destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Close all connected websockets
      session.websockets.forEach(ws => {
        try {
          ws.close();
        } catch (e) {
          // Ignore close errors
        }
      });

      // Kill the PTY process
      try {
        session.pty.kill();
      } catch (e) {
        console.error(`[TerminalManager] Error killing PTY for session ${sessionId}:`, e);
      }

      this.sessions.delete(sessionId);
      console.log(`[TerminalManager] Destroyed session ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * List all active sessions
   */
  listSessions() {
    const sessionList = [];
    this.sessions.forEach((session, id) => {
      sessionList.push({
        id,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        pid: session.pty.pid,
        cols: session.cols,
        rows: session.rows,
        connectedClients: session.websockets.size
      });
    });
    return sessionList.sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Find the oldest inactive session
   */
  findOldestSession() {
    let oldest = null;
    let oldestTime = Infinity;

    this.sessions.forEach((session, id) => {
      // Only consider sessions with no active websocket connections
      if (session.websockets.size === 0 && session.lastActivityAt < oldestTime) {
        oldest = id;
        oldestTime = session.lastActivityAt;
      }
    });

    return oldest;
  }

  /**
   * Attach a WebSocket to a session
   */
  attachWebSocket(sessionId, ws) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.websockets.add(ws);
      return true;
    }
    return false;
  }

  /**
   * Detach a WebSocket from a session
   */
  detachWebSocket(sessionId, ws) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.websockets.delete(ws);
      return true;
    }
    return false;
  }

  /**
   * Write input to a session
   */
  writeToSession(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
      session.pty.write(data);
      return true;
    }
    return false;
  }

  /**
   * Resize a session terminal
   */
  resizeSession(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cols = cols;
      session.rows = rows;
      session.pty.resize(cols, rows);
      return true;
    }
    return false;
  }

  /**
   * Get the internal API token
   */
  getInternalApiToken() {
    return this.internalApiToken;
  }

  /**
   * Set a new internal API token
   */
  setInternalApiToken(token) {
    this.internalApiToken = token;
    // Update .bashrc with new token
    const bashrcPath = path.join(this.userHomeDir, '.bashrc');
    if (fs.existsSync(bashrcPath)) {
      let content = fs.readFileSync(bashrcPath, 'utf8');
      content = content.replace(
        /export INTERNAL_API_TOKEN=".*"/,
        `export INTERNAL_API_TOKEN="${token}"`
      );
      fs.writeFileSync(bashrcPath, content);
    }
  }

  /**
   * Clean up all sessions
   */
  cleanup() {
    console.log('[TerminalManager] Cleaning up all sessions...');
    this.sessions.forEach((session, id) => {
      this.destroySession(id);
    });
  }
}

module.exports = TerminalManager;
