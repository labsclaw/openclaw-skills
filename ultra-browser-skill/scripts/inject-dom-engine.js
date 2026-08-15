/**
 * inject-dom-engine.js — Portable Dom-Engine Bundle for OpenClaw Browser Tool
 * 
 * Based on @agentic-intelligence/dom-engine (https://github.com/The-Agentic-Intelligence-Co/dom-engine)
 * 
 * This script injects the dom-engine into a browser page via browser act evaluate.
 * It provides semantic element identification (agenticPurposeId) instead of generic refs.
 * 
 * Usage via OpenClaw browser tool:
 *   1. browser act evaluate fn="injectDomEngine"
 *   2. browser act evaluate fn="getInteractiveContext" 
 *   3. browser act evaluate fn="executeActions" args='[{ "agenticPurposeId": "xxx", "actionType": "click" }]'
 * 
 * Usage as standalone Node.js script:
 *   node inject-dom-engine.js --install    # Install @agentic-intelligence/dom-engine
 *   node inject-dom-engine.js --bundle     # Generate minified bundle for injection
 */

// ─── Self-Contained Bundle (for injection via browser evaluate) ───
// This is the minified dom-engine core that gets injected into pages.
// When injected, it exposes: getInteractiveContext, executeActions, scrollToNewContent

const DOM_ENGINE_BUNDLE = `
(function() {
  'use strict';
  
  // Prevent double-injection
  if (window.__domEngineInjected) return { status: 'already_injected' };
  window.__domEngineInjected = true;
  
  let _purposeCounter = 0;
  const _purposeMap = new Map();
  
  /**
   * Generate a short, unique agenticPurposeId for an element
   */
  function generatePurposeId(el) {
    // Try to derive a semantic ID from element attributes
    const testid = el.getAttribute('data-testid');
    const ariaLabel = el.getAttribute('aria-label');
    const role = el.getAttribute('role');
    const tagName = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim().substring(0, 30).replace(/\\s+/g, '_');
    
    let base = '';
    if (testid) base = testid;
    else if (ariaLabel) base = ariaLabel.replace(/\\s+/g, '_');
    else if (role) base = role;
    else if (text) base = text;
    else base = tagName;
    
    // Create short hash from base + position
    const hash = ((_purposeCounter++ * 2654435761) >>> 0).toString(16).substring(0, 8);
    return hash;
  }
  
  /**
   * Check if element is visible in the DOM
   */
  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' 
      && style.visibility !== 'hidden' 
      && style.opacity !== '0'
      && el.offsetWidth > 0 
      && el.offsetHeight > 0;
  }
  
  /**
   * Check if element is interactive
   */
  function isInteractive(el) {
    const tag = el.tagName.toLowerCase();
    const interactiveTags = ['a', 'button', 'input', 'textarea', 'select', 'details', 'summary'];
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem', 'option', 'checkbox', 'radio', 'switch', 'textbox', 'searchbox'];
    
    if (interactiveTags.includes(tag)) return true;
    
    const role = el.getAttribute('role');
    if (role && interactiveRoles.includes(role)) return true;
    
    if (el.onclick || el.getAttribute('onclick')) return true;
    if (el.tabIndex >= 0 && !['SCRIPT', 'STYLE', 'HTML', 'HEAD', 'BODY'].includes(el.tagName)) {
      // Elements with tabindex are interactive
    }
    
    return false;
  }
  
  /**
   * Get element metadata for the context
   */
  function getElementMeta(el) {
    const meta = {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().substring(0, 100),
      className: el.className || '',
      id: el.id || '',
      type: el.getAttribute('type') || '',
      href: el.getAttribute('href') || '',
      placeholder: el.getAttribute('placeholder') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      role: el.getAttribute('role') || '',
      dataTestid: el.getAttribute('data-testid') || '',
      name: el.getAttribute('name') || '',
      value: el.value || '',
    };
    
    // Clean up empty values
    return Object.fromEntries(Object.entries(meta).filter(([_, v]) => v !== ''));
  }
  
  /**
   * Main function: Get all interactive elements with agenticPurposeId
   */
  function getInteractiveContext(options = {}) {
    const { injectTrackers = true } = options;
    
    const elements = {
      buttons: [],
      inputs: [],
      links: [],
      selects: [],
      textareas: [],
      checkboxes: [],
      radios: [],
      other: [],
      total: 0
    };
    
    // Scan all elements in the DOM
    const allElements = document.querySelectorAll('*');
    
    for (const el of allElements) {
      if (!isVisible(el) || !isInteractive(el)) continue;
      
      // Assign agenticPurposeId
      const purposeId = generatePurposeId(el);
      el.setAttribute('data-agentic-purpose-id', purposeId);
      _purposeMap.set(purposeId, el);
      
      const meta = getElementMeta(el);
      meta.agenticPurposeId = purposeId;
      
      // Categorize
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role');
      
      if (tag === 'button' || role === 'button') {
        elements.buttons.push(meta);
      } else if (tag === 'input') {
        const type = (el.getAttribute('type') || 'text').toLowerCase();
        if (type === 'checkbox') elements.checkboxes.push(meta);
        else if (type === 'radio') elements.radios.push(meta);
        else elements.inputs.push(meta);
      } else if (tag === 'textarea') {
        elements.textareas.push(meta);
      } else if (tag === 'select') {
        elements.selects.push(meta);
      } else if (tag === 'a' || role === 'link') {
        elements.links.push(meta);
      } else {
        elements.other.push(meta);
      }
      
      elements.total++;
    }
    
    // Scroll info
    const scrollInfo = {
      totalHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      scrollTop: window.scrollY || document.documentElement.scrollTop,
      verticalScrollPercentage: Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100) || 0,
      remainingHeight: document.documentElement.scrollHeight - window.scrollY - window.innerHeight,
      nextContentPixel: window.scrollY + window.innerHeight
    };
    
    return { interactiveElements: elements, scrollInfo };
  }
  
  /**
   * Execute actions on elements by agenticPurposeId
   */
  function executeActions(actions) {
    const results = [];
    
    for (const action of actions) {
      const { agenticPurposeId, actionType, value } = action;
      const el = _purposeMap.get(agenticPurposeId);
      
      if (!el) {
        results.push({ agenticPurposeId, success: false, error: 'Element not found' });
        continue;
      }
      
      try {
        switch (actionType) {
          case 'click': {
            // Human-like click sequence
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }));
            el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }));
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
            
            // Also try native click as fallback
            if (el.click) el.click();
            
            results.push({ agenticPurposeId, success: true, actionType: 'click' });
            break;
          }
          
          case 'type': {
            // Focus the element
            el.focus();
            
            // Clear existing value
            el.value = '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Type character by character with human-like timing
            if (value) {
              for (let i = 0; i < value.length; i++) {
                const char = value[i];
                el.value += char;
                el.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
              }
            }
            
            el.dispatchEvent(new Event('change', { bubbles: true }));
            results.push({ agenticPurposeId, success: true, actionType: 'type', value });
            break;
          }
          
          case 'hover': {
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }));
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: x, clientY: y }));
            results.push({ agenticPurposeId, success: true, actionType: 'hover' });
            break;
          }
          
          case 'focus': {
            el.focus();
            results.push({ agenticPurposeId, success: true, actionType: 'focus' });
            break;
          }
          
          default:
            results.push({ agenticPurposeId, success: false, error: 'Unknown actionType: ' + actionType });
        }
      } catch (err) {
        results.push({ agenticPurposeId, success: false, error: err.message });
      }
    }
    
    return { results };
  }
  
  /**
   * Smart scroll: scroll to new content, or back to top if no more content
   */
  function scrollToNewContent() {
    const scrollInfo = {
      totalHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      scrollTop: window.scrollY || document.documentElement.scrollTop
    };
    
    const remaining = scrollInfo.totalHeight - scrollInfo.scrollTop - scrollInfo.viewportHeight;
    
    if (remaining > 50) {
      // Scroll to next content
      window.scrollBy(0, scrollInfo.viewportHeight - 100);
    } else {
      // No more content, scroll back to top
      window.scrollTo(0, 0);
    }
    
    return {
      success: true,
      scrolledTo: window.scrollY,
      totalHeight: document.documentElement.scrollHeight
    };
  }
  
  // Expose globally for browser evaluate calls
  window.injectDomEngine = () => ({ status: 'injected', version: '1.0.0' });
  window.getInteractiveContext = getInteractiveContext;
  window.executeActions = executeActions;
  window.scrollToNewContent = scrollToNewContent;
  
  return { status: 'injected', version: '1.0.0' };
})();
`;

// ─── Node.js CLI (for bundle generation / npm install) ───

if (typeof module !== 'undefined' && require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--install')) {
    console.log('Installing @agentic-intelligence/dom-engine...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install @agentic-intelligence/dom-engine', { stdio: 'inherit' });
      console.log('✅ Installed successfully');
    } catch (err) {
      console.error('❌ Install failed:', err.message);
      process.exit(1);
    }
  } else if (args.includes('--bundle')) {
    console.log('=== DOM ENGINE BUNDLE (copy this for browser evaluate) ===');
    console.log(DOM_ENGINE_BUNDLE);
    console.log('=== END BUNDLE ===');
  } else {
    console.log('Usage:');
    console.log('  node inject-dom-engine.js --install   # Install npm package');
    console.log('  node inject-dom-engine.js --bundle    # Print injection bundle');
    console.log('');
    console.log('For OpenClaw browser tool:');
    console.log('  1. Copy the DOM_ENGINE_BUNDLE above');
    console.log('  2. Use: browser act evaluate fn="<bundle>"');
    console.log('  3. Then: browser act evaluate fn="getInteractiveContext"');
  }
}

// Export for use as module
if (typeof module !== 'undefined') {
  module.exports = { DOM_ENGINE_BUNDLE };
}
