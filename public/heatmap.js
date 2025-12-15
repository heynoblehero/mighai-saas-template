// Custom Heatmap Solution
(function() {
  'use strict';

  // Heatmap data collection
  let heatmapData = {
    clicks: [],
    mouseMoves: [],
    scrollData: [],
    sessionId: null,
    pageUrl: window.location.href,
    pagePath: window.location.pathname,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    startTime: Date.now()
  };

  // Initialize session ID from Analytics if available
  if (typeof window.Analytics !== 'undefined' && window.Analytics.sessionId) {
    heatmapData.sessionId = window.Analytics.sessionId;
  } else {
    // Generate fallback session ID
    heatmapData.sessionId = 'hm_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
  }

  // Custom Heatmap object
  window.CustomHeatmap = {
    isRecording: true,
    config: {
      clickTracking: true,
      mouseMoveTracking: true,
      scrollTracking: true,
      sendInterval: 30000, // Send data every 30 seconds
      maxDataPoints: 1000, // Maximum data points before forced send
      mouseMoveThrottle: 100 // Throttle mouse move events (ms)
    },

    // Start recording heatmap data
    startRecording: function() {
      this.isRecording = true;
      console.log('CustomHeatmap: Started recording');
    },

    // Stop recording heatmap data
    stopRecording: function() {
      this.isRecording = false;
      console.log('CustomHeatmap: Stopped recording');
    },

    // Get current heatmap data
    getData: function() {
      return { ...heatmapData };
    },

    // Clear current data
    clearData: function() {
      heatmapData.clicks = [];
      heatmapData.mouseMoves = [];
      heatmapData.scrollData = [];
      console.log('CustomHeatmap: Data cleared');
    },

    // Send data to server
    sendData: function() {
      if (!this.isRecording) return;

      const dataToSend = {
        ...heatmapData,
        endTime: Date.now(),
        totalClicks: heatmapData.clicks.length,
        totalMouseMoves: heatmapData.mouseMoves.length,
        totalScrollEvents: heatmapData.scrollData.length
      };

      fetch('/api/heatmap/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      }).then(response => {
        if (response.ok) {
          console.log('CustomHeatmap: Data sent successfully');
          this.clearData();
        }
      }).catch(err => {
        console.warn('CustomHeatmap: Failed to send data', err);
      });
    },

    // Generate heatmap visualization
    visualize: function(containerId = 'heatmap-container') {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('CustomHeatmap: Container not found:', containerId);
        return;
      }

      // Clear existing visualization
      container.innerHTML = '';
      container.style.position = 'relative';
      container.style.pointerEvents = 'none';

      // Create click heatmap
      heatmapData.clicks.forEach((click, index) => {
        const dot = document.createElement('div');
        dot.className = 'heatmap-click-dot';
        dot.style.cssText = `
          position: absolute;
          left: ${click.x}px;
          top: ${click.y}px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 0, 0, 0.7);
          transform: translate(-50%, -50%);
          z-index: 1000;
          animation: heatmap-pulse 2s infinite;
        `;
        container.appendChild(dot);
      });

      // Add CSS animation for dots
      if (!document.getElementById('heatmap-styles')) {
        const style = document.createElement('style');
        style.id = 'heatmap-styles';
        style.textContent = `
          @keyframes heatmap-pulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
            50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.5; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          }
          .heatmap-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
          }
        `;
        document.head.appendChild(style);
      }

      console.log('CustomHeatmap: Visualization generated with', heatmapData.clicks.length, 'click points');
    },

    // Create overlay for full-page heatmap
    createOverlay: function() {
      let overlay = document.getElementById('heatmap-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'heatmap-overlay';
        overlay.className = 'heatmap-overlay';
        document.body.appendChild(overlay);
      }
      this.visualize('heatmap-overlay');
      return overlay;
    },

    // Remove overlay
    removeOverlay: function() {
      const overlay = document.getElementById('heatmap-overlay');
      if (overlay) {
        overlay.remove();
      }
    },

    // Get heatmap statistics
    getStats: function() {
      const totalTime = Date.now() - heatmapData.startTime;
      return {
        sessionId: heatmapData.sessionId,
        pagePath: heatmapData.pagePath,
        totalClicks: heatmapData.clicks.length,
        totalMouseMoves: heatmapData.mouseMoves.length,
        totalScrollEvents: heatmapData.scrollData.length,
        sessionDuration: Math.round(totalTime / 1000),
        averageClicksPerMinute: Math.round((heatmapData.clicks.length / totalTime) * 60000),
        viewport: heatmapData.viewport
      };
    }
  };

  // Click tracking
  if (window.CustomHeatmap.config.clickTracking) {
    document.addEventListener('click', function(e) {
      if (!window.CustomHeatmap.isRecording) return;

      const clickData = {
        x: e.clientX,
        y: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY,
        timestamp: Date.now(),
        target: {
          tagName: e.target.tagName,
          id: e.target.id || null,
          className: e.target.className || null,
          innerText: e.target.innerText ? e.target.innerText.substring(0, 50) : null
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY
        }
      };

      heatmapData.clicks.push(clickData);

      // Auto-send if we have too many data points
      if (heatmapData.clicks.length > window.CustomHeatmap.config.maxDataPoints) {
        window.CustomHeatmap.sendData();
      }
    });
  }

  // Mouse move tracking (throttled)
  if (window.CustomHeatmap.config.mouseMoveTracking) {
    let mouseMoveTimeout;
    let lastMouseMove = 0;

    document.addEventListener('mousemove', function(e) {
      if (!window.CustomHeatmap.isRecording) return;

      const now = Date.now();
      if (now - lastMouseMove < window.CustomHeatmap.config.mouseMoveThrottle) {
        return;
      }
      lastMouseMove = now;

      const mouseMoveData = {
        x: e.clientX,
        y: e.clientY,
        timestamp: now,
        viewport: {
          scrollX: window.scrollX,
          scrollY: window.scrollY
        }
      };

      heatmapData.mouseMoves.push(mouseMoveData);

      // Keep only recent mouse moves (last 100)
      if (heatmapData.mouseMoves.length > 100) {
        heatmapData.mouseMoves = heatmapData.mouseMoves.slice(-100);
      }
    });
  }

  // Scroll tracking
  if (window.CustomHeatmap.config.scrollTracking) {
    let scrollTimeout;

    window.addEventListener('scroll', function() {
      if (!window.CustomHeatmap.isRecording) return;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollData = {
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          timestamp: Date.now(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          documentHeight: document.documentElement.scrollHeight,
          scrollPercentage: Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100)
        };

        heatmapData.scrollData.push(scrollData);

        // Keep only recent scroll events (last 50)
        if (heatmapData.scrollData.length > 50) {
          heatmapData.scrollData = heatmapData.scrollData.slice(-50);
        }
      }, 250);
    });
  }

  // Auto-send data periodically
  setInterval(() => {
    if (window.CustomHeatmap.isRecording && heatmapData.clicks.length > 0) {
      window.CustomHeatmap.sendData();
    }
  }, window.CustomHeatmap.config.sendInterval);

  // Send data before page unload
  window.addEventListener('beforeunload', function() {
    if (window.CustomHeatmap.isRecording) {
      window.CustomHeatmap.sendData();
    }
  });

  // Handle page visibility changes
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      window.CustomHeatmap.sendData();
    } else if (document.visibilityState === 'visible') {
      heatmapData.startTime = Date.now(); // Reset start time when page becomes visible
    }
  });

  // Update Analytics script to include heatmap data in custom events
  if (typeof window.Analytics !== 'undefined') {
    const originalTrack = window.Analytics.track;
    window.Analytics.track = function(eventType, pagePath, eventData) {
      // Add heatmap stats to analytics events
      const heatmapStats = window.CustomHeatmap.getStats();
      const enhancedEventData = {
        ...eventData,
        heatmap_stats: {
          clicks_count: heatmapStats.totalClicks,
          session_duration: heatmapStats.sessionDuration
        }
      };
      
      return originalTrack.call(this, eventType, pagePath, enhancedEventData);
    };
  }

  console.log('CustomHeatmap: Initialized with session', heatmapData.sessionId);

})();