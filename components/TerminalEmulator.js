import { useEffect, useRef, useState } from 'react';
import 'xterm/css/xterm.css';

export default function TerminalEmulator({ sessionId = 'default', onConnectionChange }) {
  const terminalRef = useRef(null);
  const termRef = useRef(null);
  const wsRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Wait for container to have dimensions
  useEffect(() => {
    const checkReady = () => {
      if (terminalRef.current) {
        const { offsetWidth, offsetHeight } = terminalRef.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          setIsReady(true);
          return;
        }
      }
      requestAnimationFrame(checkReady);
    };
    checkReady();
  }, []);

  useEffect(() => {
    if (!isReady || !terminalRef.current) return;

    // Dynamic imports to avoid SSR issues
    let term = null;
    let fitAddon = null;
    let ws = null;

    const initTerminal = async () => {
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');

      // Double-check container still has dimensions
      const container = terminalRef.current;
      if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
        return;
      }

      term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#0f172a',
          foreground: '#e2e8f0',
          cursor: '#10b981',
          cursorAccent: '#0f172a',
          selection: 'rgba(16, 185, 129, 0.3)',
          black: '#1e293b',
          red: '#f87171',
          green: '#4ade80',
          yellow: '#facc15',
          blue: '#60a5fa',
          magenta: '#c084fc',
          cyan: '#22d3ee',
          white: '#f1f5f9',
          brightBlack: '#475569',
          brightRed: '#fca5a5',
          brightGreen: '#86efac',
          brightYellow: '#fde047',
          brightBlue: '#93c5fd',
          brightMagenta: '#d8b4fe',
          brightCyan: '#67e8f9',
          brightWhite: '#ffffff'
        },
        scrollback: 10000,
        allowProposedApi: true
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(container);

      termRef.current = term;
      fitAddonRef.current = fitAddon;

      // Safe fit function
      const safeFit = () => {
        try {
          if (container.offsetWidth > 0 && container.offsetHeight > 0) {
            fitAddon.fit();
          }
        } catch (e) {
          // Ignore
        }
      };

      // Fit after render
      requestAnimationFrame(() => {
        safeFit();
      });

      // Welcome message
      term.writeln('\x1b[1;32m*** Terminal ***\x1b[0m');
      term.writeln('\x1b[90mConnecting to server...\x1b[0m');
      term.writeln('');

      // Connect WebSocket with session ID
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/admin/terminal/ws?session=${encodeURIComponent(sessionId)}`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        term.writeln('\x1b[1;32m*** Connected ***\x1b[0m');
        term.writeln('');
        onConnectionChange?.(true);

        setTimeout(() => {
          safeFit();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'resize',
              data: { cols: term.cols, rows: term.rows }
            }));
          }
        }, 100);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'output') {
            term.write(msg.data);
          }
        } catch (e) {
          term.write(event.data);
        }
      };

      ws.onclose = () => {
        term.writeln('');
        term.writeln('\x1b[1;31m*** Disconnected ***\x1b[0m');
        term.writeln('\x1b[90mRefresh the page to reconnect\x1b[0m');
        onConnectionChange?.(false);
      };

      ws.onerror = () => {
        term.writeln('\x1b[1;31m*** Connection Error ***\x1b[0m');
        onConnectionChange?.(false);
      };

      // Send input to server
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });

      // Handle resize
      const handleResize = () => {
        safeFit();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'resize',
            data: { cols: term.cols, rows: term.rows }
          }));
        }
      };

      window.addEventListener('resize', handleResize);

      // Store cleanup references
      termRef.current = term;
      termRef.current._cleanup = () => {
        window.removeEventListener('resize', handleResize);
        if (ws) ws.close();
        term.dispose();
      };
    };

    initTerminal();

    return () => {
      if (termRef.current?._cleanup) {
        termRef.current._cleanup();
      }
    };
  }, [isReady, sessionId, onConnectionChange]);

  return (
    <div
      ref={terminalRef}
      className="h-full w-full"
      style={{ background: '#0f172a', minHeight: '400px' }}
    />
  );
}
