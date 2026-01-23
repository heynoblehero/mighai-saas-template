// Session Recording Script
// Captures user interactions for replay in admin panel
(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    batchInterval: 5000,      // Send events every 5 seconds
    mouseMoveThrottle: 50,    // Throttle mouse moves (ms)
    maxEventsPerBatch: 500,   // Max events before forced send
    settingsEndpoint: '/api/session-recording/settings',
    recordEndpoint: '/api/session-recording/record'
  };

  // Recording state
  let isEnabled = false;
  let isRecording = false;
  let recordingId = null;
  let sessionId = null;
  let visitorId = null;
  let startTime = null;
  let events = [];
  let initialSnapshot = null;
  let lastMouseMove = 0;
  let maskSettings = {
    passwords: true,
    creditCards: true,
    emails: false
  };

  // Generate unique recording ID
  function generateId(prefix) {
    return prefix + '_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
  }

  // Get session/visitor IDs from Analytics if available
  function getIds() {
    if (typeof window.Analytics !== 'undefined') {
      sessionId = window.Analytics.sessionId;
      visitorId = window.Analytics.visitorId;
    } else {
      sessionId = sessionStorage.getItem('sr_session_id') || generateId('sess');
      visitorId = localStorage.getItem('sr_visitor_id') || generateId('vis');
      sessionStorage.setItem('sr_session_id', sessionId);
      localStorage.setItem('sr_visitor_id', visitorId);
    }
    recordingId = generateId('rec');
  }

  // Check if session recording is enabled
  async function checkEnabled() {
    try {
      const response = await fetch(CONFIG.settingsEndpoint);
      if (response.ok) {
        const data = await response.json();
        isEnabled = data.is_enabled === true || data.is_enabled === 1;
        if (data.mask_passwords !== undefined) maskSettings.passwords = data.mask_passwords;
        if (data.mask_credit_cards !== undefined) maskSettings.creditCards = data.mask_credit_cards;
        if (data.mask_emails !== undefined) maskSettings.emails = data.mask_emails;

        // Check sampling rate
        if (data.sampling_rate && data.sampling_rate < 100) {
          const shouldRecord = Math.random() * 100 < data.sampling_rate;
          if (!shouldRecord) {
            isEnabled = false;
          }
        }
      }
    } catch (error) {
      console.warn('SessionRecorder: Could not check settings', error);
      isEnabled = false;
    }
    return isEnabled;
  }

  // Mask sensitive content
  function maskValue(value, type) {
    if (!value) return '';
    if (type === 'password') {
      return '\u2022'.repeat(value.length || 8);
    }
    if (type === 'creditcard') {
      // Show last 4 digits only
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length >= 4) {
        return '\u2022'.repeat(cleaned.length - 4) + cleaned.slice(-4);
      }
      return '\u2022'.repeat(cleaned.length);
    }
    if (type === 'email') {
      const atIndex = value.indexOf('@');
      if (atIndex > 0) {
        return value[0] + '\u2022'.repeat(atIndex - 1) + value.slice(atIndex);
      }
    }
    return value;
  }

  // Check if element is sensitive
  function isSensitiveElement(element) {
    if (!element || !element.tagName) return { sensitive: false };

    const tag = element.tagName.toLowerCase();

    // Password fields
    if (tag === 'input' && element.type === 'password') {
      return { sensitive: true, type: 'password' };
    }

    // Credit card detection
    const name = (element.name || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    const autocomplete = (element.autocomplete || '').toLowerCase();

    if (autocomplete.includes('cc-') ||
        name.includes('card') || name.includes('credit') ||
        id.includes('card') || id.includes('credit') ||
        element.hasAttribute('data-sensitive')) {
      return { sensitive: true, type: 'creditcard' };
    }

    // Email fields (optional masking)
    if (maskSettings.emails &&
        (element.type === 'email' || autocomplete === 'email')) {
      return { sensitive: true, type: 'email' };
    }

    // Custom sensitive attribute
    if (element.hasAttribute('data-mask') || element.hasAttribute('data-sensitive')) {
      return { sensitive: true, type: 'custom' };
    }

    return { sensitive: false };
  }

  // Get element selector for identification
  function getSelector(element) {
    if (!element || !element.tagName) return '';

    let selector = element.tagName.toLowerCase();
    if (element.id) {
      selector += '#' + element.id;
    } else if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).slice(0, 2);
      if (classes.length) {
        selector += '.' + classes.join('.');
      }
    }
    return selector;
  }

  // Serialize DOM for initial snapshot
  function serializeDOM() {
    const clone = document.documentElement.cloneNode(true);

    // Remove scripts
    clone.querySelectorAll('script').forEach(el => el.remove());

    // Mask sensitive inputs in snapshot
    clone.querySelectorAll('input, textarea').forEach(el => {
      const { sensitive, type } = isSensitiveElement(el);
      if (sensitive) {
        el.value = maskValue(el.value, type);
      }
    });

    // Remove session recorder script reference
    clone.querySelectorAll('script[src*="session-recorder"]').forEach(el => el.remove());

    return clone.outerHTML;
  }

  // Add event to buffer
  function addEvent(type, data) {
    if (!isRecording) return;

    const event = {
      type,
      t: Date.now() - startTime,
      ...data
    };

    events.push(event);

    // Force send if too many events
    if (events.length >= CONFIG.maxEventsPerBatch) {
      sendEvents();
    }
  }

  // Send events to server
  async function sendEvents(isFinal = false) {
    if (events.length === 0 && !initialSnapshot) return;

    const payload = {
      recording_id: recordingId,
      session_id: sessionId,
      visitor_id: visitorId,
      page_url: window.location.href,
      page_path: window.location.pathname,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      is_final: isFinal
    };

    if (initialSnapshot) {
      payload.initial_snapshot = initialSnapshot;
      initialSnapshot = null;
    }

    if (events.length > 0) {
      payload.events = events;
      payload.duration_ms = Date.now() - startTime;
      events = [];
    }

    try {
      const response = await fetch(CONFIG.recordEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn('SessionRecorder: Failed to send events');
      }
    } catch (error) {
      console.warn('SessionRecorder: Error sending events', error);
    }
  }

  // Event handlers
  function handleMouseMove(e) {
    const now = Date.now();
    if (now - lastMouseMove < CONFIG.mouseMoveThrottle) return;
    lastMouseMove = now;

    addEvent('mousemove', {
      x: e.clientX,
      y: e.clientY
    });
  }

  function handleClick(e) {
    addEvent('click', {
      x: e.clientX,
      y: e.clientY,
      selector: getSelector(e.target),
      text: (e.target.innerText || '').substring(0, 50)
    });
  }

  function handleScroll() {
    addEvent('scroll', {
      x: window.scrollX,
      y: window.scrollY
    });
  }

  function handleInput(e) {
    const target = e.target;
    if (!target || !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    const { sensitive, type } = isSensitiveElement(target);
    let value = target.value;

    if (sensitive) {
      value = maskValue(value, type);
    }

    addEvent('input', {
      selector: getSelector(target),
      value: value,
      masked: sensitive
    });
  }

  function handleResize() {
    addEvent('resize', {
      width: window.innerWidth,
      height: window.innerHeight
    });
  }

  // DOM mutation observer
  let mutationObserver = null;

  function setupMutationObserver() {
    if (mutationObserver) return;

    mutationObserver = new MutationObserver((mutations) => {
      const changes = [];

      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              changes.push({
                action: 'add',
                html: node.outerHTML?.substring(0, 500),
                parent: getSelector(mutation.target)
              });
            }
          });

          mutation.removedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              changes.push({
                action: 'remove',
                selector: getSelector(node),
                parent: getSelector(mutation.target)
              });
            }
          });
        } else if (mutation.type === 'attributes') {
          changes.push({
            action: 'attr',
            selector: getSelector(mutation.target),
            attr: mutation.attributeName,
            value: mutation.target.getAttribute(mutation.attributeName)
          });
        }
      });

      if (changes.length > 0) {
        addEvent('mutation', { changes: changes.slice(0, 20) });
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'disabled']
    });
  }

  // Start recording
  function startRecording() {
    if (isRecording) return;

    getIds();
    startTime = Date.now();
    isRecording = true;

    // Capture initial DOM snapshot
    initialSnapshot = serializeDOM();

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('input', handleInput, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Setup mutation observer
    setupMutationObserver();

    // Setup periodic sending
    setInterval(() => sendEvents(), CONFIG.batchInterval);

    // Send on page unload
    window.addEventListener('beforeunload', () => {
      sendEvents(true);
    });

    // Send when page becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendEvents(true);
      }
    });

    console.log('SessionRecorder: Started recording', recordingId);
  }

  // Stop recording
  function stopRecording() {
    if (!isRecording) return;

    isRecording = false;

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick);
    window.removeEventListener('scroll', handleScroll);
    document.removeEventListener('input', handleInput);
    window.removeEventListener('resize', handleResize);

    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }

    sendEvents(true);
    console.log('SessionRecorder: Stopped recording');
  }

  // Expose API
  window.SessionRecorder = {
    isRecording: () => isRecording,
    getRecordingId: () => recordingId,
    stop: stopRecording
  };

  // Initialize
  async function init() {
    // Don't record on admin pages
    if (window.location.pathname.startsWith('/admin')) {
      return;
    }

    const enabled = await checkEnabled();
    if (enabled) {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startRecording);
      } else {
        startRecording();
      }
    }
  }

  init();
})();
