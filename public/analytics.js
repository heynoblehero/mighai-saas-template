// Simple Analytics Tracker
(function() {
  'use strict';

  // Generate session ID
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
    sessionStorage.setItem('analytics_session_id', sessionId);
  }

  // Analytics object
  window.Analytics = {
    sessionId: sessionId,
    
    // Track page view
    trackPageView: function(pagePath) {
      this.track('page_view', pagePath || window.location.pathname, {
        title: document.title,
        url: window.location.href,
        referrer: document.referrer
      });
    },

    // Track custom event
    track: function(eventType, pagePath, eventData) {
      const payload = {
        event_type: eventType,
        page_path: pagePath || window.location.pathname,
        session_id: this.sessionId,
        event_data: eventData || {}
      };

      // Send to server
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).catch(err => {
        console.warn('Analytics tracking failed:', err);
      });
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
    }
  };

  // Auto-track page views
  Analytics.trackPageView();

  // Track navigation for SPAs
  let currentPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== currentPath) {
      currentPath = window.location.pathname;
      Analytics.trackPageView();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Auto-track clicks on buttons and links
  document.addEventListener('click', function(e) {
    const element = e.target;
    if (element.tagName === 'BUTTON' || element.tagName === 'A') {
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
      return { variant: 'A' }; // Default to variant A
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
  }
};

// Heatmap Integration Helper
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

console.log('Analytics loaded with session:', Analytics.sessionId);