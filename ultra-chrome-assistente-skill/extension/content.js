// Chrome Assistente - Content Script (Isolated World)
// dom-engine pattern + agentic-purpose-id system

(function() {
  'use strict';
  
  // ============================================
  // CONFIGURATION
  // ============================================
  const INTERACTIVE_ROLES = [
    'button', 'link', 'textbox', 'checkbox', 'radio',
    'menuitem', 'tab', 'searchbox', 'slider', 'spinbutton', 'switch'
  ];
  
  const SKIP_PATTERNS = [
    /datepicker/i, /date.?picker/i, /calendar/i, /^date$/i
  ];
  
  const IFRAME_SKIP_PATTERNS = [
    /web-pixel/i, /analytics/i, /tracking/i, /gtm/i, /facebook/i,
    /doubleclick/i, /google.*tag/i, /hotjar/i, /segment/i, /sentry/i,
    /recaptcha/i, /gstatic/i, /app-bridge/i, /extensions\.shopifycdn/i
  ];
  
  const MAX_IFRAMES_TO_PROCESS = 8;
  const IFRAME_SNAPSHOT_TIMEOUT_MS = 3000;
  
  let elementCounter = 0;
  const elementRegistry = new Map(); // agentic-purpose-id -> element
  const idToElement = new WeakMap(); // element -> agentic-purpose-id
  
  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  function getImplicitRole(element) {
    const tag = element.tagName.toLowerCase();
    const type = element.getAttribute('type')?.toLowerCase();
    
    if (tag === 'a' && element.href) return 'link';
    if (tag === 'button') return 'button';
    if (tag === 'input') {
      switch (type) {
        case 'text': case 'email': case 'password': case 'search':
        case 'tel': case 'url': case 'number': return 'textbox';
        case 'checkbox': return 'checkbox';
        case 'radio': return 'radio';
        case 'submit': case 'button': return 'button';
        default: return 'textbox';
      }
    }
    if (tag === 'textarea') return 'textbox';
    if (tag === 'select') return 'combobox';
    if (element.isContentEditable) return 'textbox';
    if (element.onclick || element.getAttribute('onclick')) return 'button';
    return null;
  }
  
  function isInteractive(element) {
    const role = element.getAttribute('role') || getImplicitRole(element);
    if (!role) return false;
    if (!INTERACTIVE_ROLES.includes(role)) return false;
    if (element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
    return true;
  }
  
  function shouldSkipElement(element) {
    const text = (element.innerText || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    const className = (element.className || '').toLowerCase();
    const combined = `${text} ${id} ${className}`;
    return SKIP_PATTERNS.some(p => p.test(combined));
  }
  
  function shouldSkipIframe(src) {
    if (!src) return true;
    return IFRAME_SKIP_PATTERNS.some(p => p.test(src));
  }
  
  function extractAttributes(element) {
    const attrs = {};
    const importantAttrs = [
      'id', 'name', 'type', 'placeholder', 'value', 'href', 'src',
      'alt', 'title', 'role', 'aria-label', 'aria-labelledby',
      'data-testid', 'data-cy', 'data-qa'
    ];
    for (const attr of importantAttrs) {
      const value = element.getAttribute(attr);
      if (value !== null) attrs[attr] = value;
    }
    return attrs;
  }
  
  function getElementRect(element) {
    try {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        bottom: Math.round(rect.bottom),
        right: Math.round(rect.right)
      };
    } catch {
      return null;
    }
  }
  
  // ============================================
  // AGENTIC-PURPOSE-ID SYSTEM
  // ============================================
  function assignAgenticPurposeId(element) {
    if (idToElement.has(element)) {
      return idToElement.get(element);
    }
    const id = `elem_${++elementCounter}`;
    element.dataset.agenticPurposeId = id;
    idToElement.set(element, id);
    elementRegistry.set(id, element);
    return id;
  }
  
  function getElementByAgenticId(id) {
    return elementRegistry.get(id) || null;
  }
  
  function removeAgenticId(element) {
    const id = idToElement.get(element);
    if (id) {
      elementRegistry.delete(id);
      idToElement.delete(element);
      delete element.dataset.agenticPurposeId;
    }
  }
  
  // ============================================
  // DOM SNAPSHOT (dom-engine pattern)
  // ============================================
  function buildDomSnapshot(root = document) {
    const elements = [];
    
    function walk(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (shouldSkipElement(node)) return;
      
      if (isInteractive(node)) {
        const id = assignAgenticPurposeId(node);
        elements.push({
          id,
          role: node.getAttribute('role') || getImplicitRole(node),
          tag: node.tagName.toLowerCase(),
          text: node.innerText?.slice(0, 100) || '',
          attrs: extractAttributes(node),
          rect: getElementRect(node),
          visible: isElementVisible(node)
        });
      }
      
      // Walk children
      for (const child of node.children) {
        walk(child);
      }
    }
    
    walk(root);
    return elements;
  }
  
  function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  
  // ============================================
  // IFRAME HANDLING
  // ============================================
  async function processIframes() {
    const iframes = Array.from(document.querySelectorAll('iframe'));
    const results = [];
    
    for (const iframe of iframes.slice(0, MAX_IFRAMES_TO_PROCESS)) {
      try {
        if (shouldSkipIframe(iframe.src)) continue;
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) continue;
        
        const snapshot = buildIframeSnapshot(iframeDoc, iframe);
        if (snapshot.elements.length > 0) {
          results.push({
            iframe: {
              src: iframe.src,
              id: iframe.id,
              name: iframe.name,
              rect: getElementRect(iframe)
            },
            elements: snapshot
          });
        }
      } catch (e) {
        // Cross-origin iframe - skip
      }
    }
    
    return results;
  }
  
  function buildIframeSnapshot(doc, iframeElement) {
    const elements = [];
    
    function walk(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (shouldSkipElement(node)) return;
      
      if (isInteractive(node)) {
        const id = assignAgenticPurposeId(node);
        elements.push({
          id,
          role: node.getAttribute('role') || getImplicitRole(node),
          tag: node.tagName.toLowerCase(),
          text: node.innerText?.slice(0, 100) || '',
          attrs: extractAttributes(node),
          rect: getElementRect(node),
          visible: isElementVisible(node)
        });
      }
      
      for (const child of node.children) {
        walk(child);
      }
    }
    
    walk(doc.body || doc.documentElement);
    return { elements };
  }
  
  // ============================================
  // CHALLENGE DETECTION
  // ============================================
  function detectChallenge() {
    const challenges = [];
    
    // Cloudflare Turnstile
    if (document.querySelector('[data-ray]') || 
        document.querySelector('script[src*="challenges.cloudflare.com"]') ||
        document.body.innerHTML.includes('challenges.cloudflare.com')) {
      challenges.push({ type: 'cloudflare', confidence: 0.9 });
    }
    
    // reCAPTCHA
    if (document.querySelector('.g-recaptcha') ||
        document.querySelector('script[src*="recaptcha"]') ||
        window.grecaptcha) {
      challenges.push({ type: 'recaptcha', confidence: 0.9 });
    }
    
    // hCaptcha
    if (document.querySelector('.h-captcha') ||
        document.querySelector('script[src*="hcaptcha"]') ||
        window.hcaptcha) {
      challenges.push({ type: 'hcaptcha', confidence: 0.9 });
    }
    
    // Generic CAPTCHA
    if (document.body.innerText.toLowerCase().includes('captcha') ||
        document.body.innerText.toLowerCase().includes('verify you are human')) {
      challenges.push({ type: 'generic', confidence: 0.5 });
    }
    
    return challenges;
  }
  
  // ============================================
  // AUTH CAPTURE
  // ============================================
  function captureAuth(options = {}) {
    const result = {};
    
    if (options.cookies !== false) {
      result.cookies = captureCookies(options.domain);
    }
    
    if (options.localStorage !== false) {
      result.localStorage = captureLocalStorage(options.prefix);
    }
    
    if (options.sessionStorage !== false) {
      result.sessionStorage = captureSessionStorage(options.prefix);
    }
    
    return result;
  }
  
  function captureCookies(domain) {
    try {
      // Note: Can't access HttpOnly cookies from content script
      // This gets document.cookie (non-HttpOnly only)
      const cookies = document.cookie.split(';').map(c => c.trim()).filter(Boolean);
      return cookies.map(c => {
        const [name, ...rest] = c.split('=');
        return { name, value: rest.join('='), domain };
      });
    } catch {
      return [];
    }
  }
  
  function captureLocalStorage(prefix) {
    const result = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!prefix || key.startsWith(prefix)) {
          result[key] = localStorage.getItem(key);
        }
      }
    } catch {}
    return result;
  }
  
  function captureSessionStorage(prefix) {
    const result = {};
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (!prefix || key.startsWith(prefix)) {
          result[key] = sessionStorage.getItem(key);
        }
      }
    } catch {}
    return result;
  }
  
  // ============================================
  // ELEMENT ACTIONS
  // ============================================
  async function performElementAction(action) {
    const { elementId, action: actionType, value } = action;
    const element = getElementByAgenticId(elementId);
    
    if (!element) {
      throw new Error(`Element not found: ${elementId}`);
    }
    
    switch (actionType) {
      case 'click':
        element.click();
        return { success: true, action: 'click' };
        
      case 'fill':
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable) {
          element.focus();
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return { success: true, action: 'fill', value };
        
      case 'select':
        if (element.tagName === 'SELECT') {
          element.value = value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return { success: true, action: 'select', value };
        
      case 'hover':
        element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        return { success: true, action: 'hover' };
        
      default:
        throw new Error(`Unknown action: ${actionType}`);
    }
  }
  
  // ============================================
  // EXTRACT API KEY HELPER
  // ============================================
  function extractApiKey(patterns = []) {
    const text = document.body.innerText;
    const html = document.documentElement.outerHTML;
    const combined = `${text}\n${html}`;
    
    // Default patterns for common API key formats
    const defaultPatterns = [
      /[a-f0-9]{32,64}/gi,  // Hex keys
      /[A-Za-z0-9_-]{32,}/g, // Base64-like
      /sk-[a-zA-Z0-9]{32,}/g, // Stripe-style
      /pk-[a-zA-Z0-9]{32,}/g,
      /api[_-]?key["'\s:=]+([a-zA-Z0-9_-]{20,})/gi,
      /token["'\s:=]+([a-zA-Z0-9_-]{20,})/gi
    ];
    
    const allPatterns = [...defaultPatterns, ...patterns];
    const found = new Set();
    
    for (const pattern of allPatterns) {
      const matches = combined.matchAll(pattern);
      for (const match of matches) {
        const key = match[1] || match[0];
        if (key && key.length >= 16) {
          found.add(key.trim());
        }
      }
    }
    
    return Array.from(found);
  }
  
  // ============================================
  // MESSAGE HANDLING
  // ============================================
  function setupMessageListener() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleMessage(message, sendResponse);
      return true; // async
    });
    
    // Also listen for postMessage from page (for isolated world bridge)
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (!event.data?.chromeAssistente) return;
      
      handleMessage(event.data, (response) => {
        window.postMessage({ 
          chromeAssistente: true, 
          response: true, 
          requestId: event.data.requestId,
          payload: response 
        }, '*');
      });
    });
  }
  
  function handleMessage(message, sendResponse) {
    const { type, payload, requestId } = message;
    
    try {
      switch (type) {
        case 'GET_SNAPSHOT':
          const elements = buildDomSnapshot(payload?.root || document);
          const iframes = payload?.iframes !== false ? processIframes() : Promise.resolve([]);
          Promise.all([Promise.resolve(elements), iframes]).then(([els, frames]) => {
            sendResponse({ 
              elements: els, 
              iframes: frames,
              url: window.location.href,
              title: document.title,
              timestamp: Date.now()
            });
          });
          break;
          
        case 'ELEMENT_ACTION':
          performElementAction(payload).then(sendResponse).catch(sendResponse);
          break;
          
        case 'CAPTURE_AUTH':
          sendResponse({ success: true, auth: captureAuth(payload) });
          break;
          
        case 'DETECT_CHALLENGE':
          sendResponse({ success: true, challenges: detectChallenge() });
          break;
          
        case 'EXTRACT_API_KEY':
          sendResponse({ success: true, keys: extractApiKey(payload?.patterns) });
          break;
          
        case 'HEALTH_CHECK':
          sendResponse({ status: 'ok', timestamp: Date.now() });
          break;
          
        default:
          sendResponse({ error: 'Unknown message type', type });
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
  
  // ============================================
  // INITIALIZATION
  // ============================================
  function init() {
    // Re-assign IDs on DOM changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Assign IDs to new interactive elements
            if (isInteractive(node)) {
              assignAgenticPurposeId(node);
            }
            // Walk subtree
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
            while (walker.nextNode()) {
              if (isInteractive(walker.currentNode)) {
                assignAgenticPurposeId(walker.currentNode);
              }
            }
          }
        }
        // Handle removed nodes
        for (const node of mutation.removedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            removeAgenticId(node);
          }
        }
      }
    });
    
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
    
    setupMessageListener();
    
    // Initial ID assignment
    const initialElements = buildDomSnapshot();
    console.log('[Chrome Assistente] Content script initialized', { 
      elements: initialElements.length,
      url: window.location.href 
    });
    
    // Notify background script
    chrome.runtime.sendMessage({ type: 'CONTENT_READY', url: window.location.href });
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();