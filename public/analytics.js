// Comprehensive Analytics Tracker
(function() {
  'use strict';

  // Generate or retrieve visitor ID (persistent across sessions)
  let visitorId = localStorage.getItem('analytics_visitor_id');
  if (!visitorId) {
    visitorId = 'vis_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
    localStorage.setItem('analytics_visitor_id', visitorId);
  }

  // Generate session ID (per browser session)
  let sessionId = sessionStorage.getItem('analytics_session_id');
  let isNewSession = false;
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
    sessionStorage.setItem('analytics_session_id', sessionId);
    isNewSession = true;
  }

  // Page tracking state
  let pageStartTime = Date.now();
  let maxScrollDepth = 0;
  let pageViewCount = parseInt(sessionStorage.getItem('analytics_page_count') || '0');
  let scrollMilestones = { 25: false, 50: false, 75: false, 100: false };

  // Debounce helper
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Analytics object
  window.Analytics = {
    sessionId: sessionId,
    visitorId: visitorId,

    // Track page view
    trackPageView: function(pagePath) {
      pageViewCount++;
      sessionStorage.setItem('analytics_page_count', pageViewCount.toString());

      // Reset page-level tracking
      pageStartTime = Date.now();
      maxScrollDepth = 0;
      scrollMilestones = { 25: false, 50: false, 75: false, 100: false };

      this.track('page_view', pagePath || window.location.pathname, {
        title: document.title,
        url: window.location.href,
        referrer: document.referrer,
        visitor_id: visitorId,
        page_view_count: pageViewCount,
        is_new_session: isNewSession && pageViewCount === 1
      });

      // Track session start
      if (isNewSession && pageViewCount === 1) {
        this.track('session_start', pagePath || window.location.pathname, {
          entry_referrer: document.referrer,
          visitor_id: visitorId
        });
        isNewSession = false;
      }
    },

    // Track custom event
    track: function(eventType, pagePath, eventData) {
      const payload = {
        event_type: eventType,
        page_path: pagePath || window.location.pathname,
        session_id: this.sessionId,
        visitor_id: this.visitorId,
        event_data: eventData || {}
      };

      // Use sendBeacon for page exit events, fetch for others
      if (eventType === 'page_exit' || eventType === 'session_end') {
        navigator.sendBeacon('/api/analytics/track', JSON.stringify(payload));
      } else {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }).catch(err => {
          console.warn('Analytics tracking failed:', err);
        });
      }
    },

    // Track button clicks
    trackClick: function(element, eventData) {
      this.track('click', window.location.pathname, {
        element_id: element.id,
        element_class: element.className,
        element_text: element.innerText?.substring(0, 100),
        element_tag: element.tagName,
        ...eventData
      });
    },

    // Track form submissions
    trackForm: function(formElement, eventData) {
      this.track('form_submit', window.location.pathname, {
        form_id: formElement.id,
        form_action: formElement.action,
        form_method: formElement.method,
        ...eventData
      });
    },

    // Track API calls
    trackApiCall: function(endpoint, method, success, eventData) {
      this.track('api_call', window.location.pathname, {
        endpoint: endpoint,
        method: method,
        success: success,
        ...eventData
      });
    },

    // Track scroll depth
    trackScrollDepth: function(depth) {
      this.track('scroll', window.location.pathname, {
        scroll_depth: depth,
        visitor_id: this.visitorId
      });
    },

    // Track page exit with engagement data
    trackPageExit: function() {
      const timeOnPage = Math.round((Date.now() - pageStartTime) / 1000);
      this.track('page_exit', window.location.pathname, {
        time_on_page: timeOnPage,
        max_scroll_depth: maxScrollDepth,
        visitor_id: this.visitorId,
        page_view_count: pageViewCount
      });
    }
  };

  // Scroll depth tracking
  function calculateScrollDepth() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return 100;
    return Math.min(100, Math.round((window.scrollY / scrollHeight) * 100));
  }

  const handleScroll = debounce(function() {
    const depth = calculateScrollDepth();
    if (depth > maxScrollDepth) {
      maxScrollDepth = depth;

      // Track milestone events
      [25, 50, 75, 100].forEach(milestone => {
        if (depth >= milestone && !scrollMilestones[milestone]) {
          scrollMilestones[milestone] = true;
          Analytics.trackScrollDepth(milestone);
        }
      });
    }
  }, 250);

  window.addEventListener('scroll', handleScroll, { passive: true });

  // Track page exit on beforeunload
  window.addEventListener('beforeunload', function() {
    Analytics.trackPageExit();
  });

  // Track page exit on visibility change (for mobile)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      Analytics.trackPageExit();
    }
  });

  // Auto-track page views
  Analytics.trackPageView();

  // Track navigation for SPAs
  let currentPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== currentPath) {
      // Track exit from previous page
      Analytics.trackPageExit();

      currentPath = window.location.pathname;
      Analytics.trackPageView();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also listen for popstate for browser back/forward
  window.addEventListener('popstate', function() {
    if (window.location.pathname !== currentPath) {
      Analytics.trackPageExit();
      currentPath = window.location.pathname;
      Analytics.trackPageView();
    }
  });

  // Auto-track clicks on buttons and links
  document.addEventListener('click', function(e) {
    const element = e.target.closest('button, a, [data-track-click]');
    if (element) {
      Analytics.trackClick(element);
    }
  });

  // Auto-track form submissions
  document.addEventListener('submit', function(e) {
    Analytics.trackForm(e.target);
  });

})();

// A/B Testing Helper
window.ABTest = {
  // Get variant for experiment
  getVariant: async function(experimentId) {
    try {
      const response = await fetch(`/api/ab-test/${experimentId}?session_id=${Analytics.sessionId}`);
      const data = await response.json();
      return data;
    } catch (err) {
      console.warn('A/B test failed:', err);
      return { variant: 'A' };
    }
  },

  // Apply variant content
  applyVariant: async function(experimentId, elementSelector) {
    const variant = await this.getVariant(experimentId);
    const element = document.querySelector(elementSelector);

    if (element && variant.content) {
      element.innerHTML = variant.content;

      // Track A/B test exposure
      Analytics.track('ab_test_exposure', window.location.pathname, {
        experiment_id: experimentId,
        variant: variant.variant
      });
    }

    return variant;
  },

  // Track conversion for an experiment
  trackConversion: async function(experimentId, conversionType, value) {
    try {
      await fetch('/api/ab-test/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experiment_id: experimentId,
          session_id: Analytics.sessionId,
          conversion_type: conversionType || 'conversion',
          value: value || 0
        })
      });

      // Also track as analytics event
      Analytics.track('ab_test_conversion', window.location.pathname, {
        experiment_id: experimentId,
        conversion_type: conversionType,
        value: value
      });
    } catch (err) {
      console.warn('A/B test conversion tracking failed:', err);
    }
  },

  // Auto-track signup conversions
  autoTrackSignups: function() {
    document.addEventListener('submit', function(e) {
      const form = e.target;
      if (form.matches('[data-ab-conversion]')) {
        const experimentId = form.dataset.experimentId || form.dataset.abConversion;
        const conversionType = form.dataset.conversionType || 'signup';
        if (experimentId) {
          ABTest.trackConversion(experimentId, conversionType);
        }
      }
    });
  }
};

// Initialize auto-tracking for A/B conversions
ABTest.autoTrackSignups();

// Heatmap Integration Helper (for third-party services)
window.HeatmapIntegration = {
  // Initialize Hotjar
  initHotjar: function(hjid, hjsv) {
    (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
      h._hjSettings={hjid:hjid,hjsv:hjsv};
      a=o.getElementsByTagName('head')[0];
      r=o.createElement('script');r.async=1;
      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
      a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  },

  // Initialize Microsoft Clarity
  initClarity: function(clarityId) {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", clarityId);
  }
};

// In-house Heatmap Tracking
window.Heatmap = (function() {
  'use strict';

  let enabled = true;
  let clickBuffer = [];
  let movementBuffer = [];
  let movementPoints = [];
  let lastMovementTime = 0;
  let scrollData = {
    maxPercent: 0,
    foldViews: {}
  };

  // Configuration
  const config = {
    movementSampleRate: 100, // Sample every 100ms
    movementBatchSize: 50, // Send after 50 points
    clickBatchSize: 10, // Send after 10 clicks
    flushInterval: 5000, // Flush every 5 seconds
    maxMovementPoints: 200 // Max points per batch
  };

  // Get page dimensions
  function getPageDimensions() {
    return {
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      page_width: document.documentElement.scrollWidth,
      page_height: document.documentElement.scrollHeight
    };
  }

  // Track click
  function trackClick(e) {
    if (!enabled) return;

    const dims = getPageDimensions();
    const rect = document.documentElement.getBoundingClientRect();
    const x = e.pageX;
    const y = e.pageY;

    // Get element info
    const target = e.target;
    let elementText = '';
    if (target.innerText) {
      elementText = target.innerText.substring(0, 100).trim();
    }

    clickBuffer.push({
      session_id: Analytics.sessionId,
      visitor_id: Analytics.visitorId,
      page_path: window.location.pathname,
      page_url: window.location.href,
      x: x,
      y: y,
      x_percent: (x / dims.page_width) * 100,
      y_percent: (y / dims.page_height) * 100,
      viewport_width: dims.viewport_width,
      viewport_height: dims.viewport_height,
      page_width: dims.page_width,
      page_height: dims.page_height,
      element_tag: target.tagName,
      element_id: target.id || null,
      element_class: target.className || null,
      element_text: elementText || null
    });

    if (clickBuffer.length >= config.clickBatchSize) {
      flushClicks();
    }
  }

  // Track mouse movement (sampled)
  function trackMovement(e) {
    if (!enabled) return;

    const now = Date.now();
    if (now - lastMovementTime < config.movementSampleRate) return;
    lastMovementTime = now;

    movementPoints.push({
      x: e.pageX,
      y: e.pageY,
      t: now
    });

    if (movementPoints.length >= config.movementBatchSize) {
      flushMovements();
    }
  }

  // Track scroll
  function trackScroll() {
    if (!enabled) return;

    const dims = getPageDimensions();
    const scrollTop = window.scrollY;
    const scrollPercent = Math.min(100, Math.round((scrollTop + dims.viewport_height) / dims.page_height * 100));

    if (scrollPercent > scrollData.maxPercent) {
      scrollData.maxPercent = scrollPercent;
    }

    // Track which "folds" have been viewed
    const currentFold = Math.ceil((scrollTop + dims.viewport_height) / dims.viewport_height);
    scrollData.foldViews[currentFold] = true;
  }

  // Flush click data
  function flushClicks() {
    if (clickBuffer.length === 0) return;

    const data = {
      type: 'batch',
      data: { clicks: clickBuffer.slice() }
    };

    clickBuffer = [];

    fetch('/api/heatmap/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(err => console.warn('Heatmap click tracking failed:', err));
  }

  // Flush movement data
  function flushMovements() {
    if (movementPoints.length === 0) return;

    const dims = getPageDimensions();
    const data = {
      type: 'movement',
      data: {
        session_id: Analytics.sessionId,
        visitor_id: Analytics.visitorId,
        page_path: window.location.pathname,
        points: movementPoints.slice(0, config.maxMovementPoints),
        viewport_width: dims.viewport_width,
        viewport_height: dims.viewport_height
      }
    };

    movementPoints = [];

    fetch('/api/heatmap/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(err => console.warn('Heatmap movement tracking failed:', err));
  }

  // Flush scroll data
  function flushScroll() {
    const dims = getPageDimensions();
    const data = {
      type: 'scroll',
      data: {
        session_id: Analytics.sessionId,
        visitor_id: Analytics.visitorId,
        page_path: window.location.pathname,
        max_scroll_percent: scrollData.maxPercent,
        viewport_height: dims.viewport_height,
        page_height: dims.page_height,
        fold_views: Object.keys(scrollData.foldViews).map(Number)
      }
    };

    navigator.sendBeacon('/api/heatmap/track', JSON.stringify(data));
  }

  // Initialize tracking
  function init() {
    // Click tracking
    document.addEventListener('click', trackClick, { passive: true });

    // Movement tracking
    document.addEventListener('mousemove', trackMovement, { passive: true });

    // Scroll tracking
    window.addEventListener('scroll', trackScroll, { passive: true });

    // Periodic flush
    setInterval(function() {
      flushClicks();
      flushMovements();
    }, config.flushInterval);

    // Flush on page exit
    window.addEventListener('beforeunload', function() {
      flushClicks();
      flushMovements();
      flushScroll();
    });

    // Flush on visibility change (mobile)
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        flushClicks();
        flushMovements();
        flushScroll();
      }
    });

    console.log('Heatmap tracking initialized');
  }

  // Public API
  return {
    init: init,
    enable: function() { enabled = true; },
    disable: function() { enabled = false; },
    isEnabled: function() { return enabled; },
    flush: function() {
      flushClicks();
      flushMovements();
      flushScroll();
    }
  };
})();

// Note: Heatmap tracking is handled by separate heatmap.js file
// which is only loaded on non-admin pages via _app.js
// Heatmap.init() is NOT called here to avoid duplicate tracking

console.log('Analytics loaded - Session:', Analytics.sessionId, 'Visitor:', Analytics.visitorId);
