/**
 * dom-engine — Self-contained browser injection bundle
 * Source: @agentic-intelligence/dom-engine
 * 
 * Inject via evaluate(), then use these window functions:
 *   - getInteractiveContext(options?) → { interactiveElements, scrollInfo }
 *   - executeActions([{ agenticPurposeId, actionType, value }]) → { success, results }
 *   - scrollToNewContent() → { success, scrolledTo }
 * 
 * Usage in script:
 *   await page.evaluate(injectDomEngine);
 *   const ctx = await page.evaluate(() => window.getInteractiveContext({ injectTrackers: true }));
 *   await page.evaluate(actions => window.executeActions(actions), [{ agenticPurposeId: "abc", actionType: "click" }]);
 */
function injectDomEngine() {
  if (window.__domEngineLoaded) return 'dom-engine already loaded';
  window.__domEngineLoaded = true;

  function generateUniqueId() {
    return crypto.randomUUID().substring(0, 8);
  }
  function cleanText(text) {
    return text?.replace(/\s+/g, ' ').trim() || '';
  }
  function filterValidProperties(obj) {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== 'N/A' && v !== '' && v != null)
    );
  }
  function filterStylingClasses(className) {
    if (!className) return '';
    return className.split(' ').filter(cls => {
      const t = cls.trim();
      return !t.match(/^[a-z]+-[a-z0-9/-]+$|^[a-z]+:\w+|^#[0-9a-f]{3,6}$|^(bg|text|border|w|h|p|m|flex|grid|absolute|relative|rounded|shadow|hover|focus|btn|card|container|row|col)-/) &&
        !['flex','grid','block','hidden','visible','absolute','relative','fixed','sticky','primary','secondary','success','warning','error'].includes(t);
    }).join(' ');
  }

  function getElementText(element) {
    const tagName = element.tagName;
    const effectiveTagName = element.contentEditable === 'true' ? 'CONTENTEDITABLE' : tagName;
    const extractors = {
      INPUT: () => {
        const inp = element;
        return [
          inp.placeholder && `Placeholder: ${inp.placeholder}`,
          inp.value && `Value: ${inp.value}`,
          inp.getAttribute('aria-label') && `Aria-label: ${inp.getAttribute('aria-label')}`,
          inp.name && `Name: ${inp.name}`
        ].filter(Boolean).join(' | ');
      },
      TEXTAREA: () => {
        const ta = element;
        return [
          ta.placeholder && `Placeholder: ${ta.placeholder}`,
          ta.value && `Value: ${ta.value}`,
          ta.getAttribute('aria-label') && `Aria-label: ${ta.getAttribute('aria-label')}`,
          ta.name && `Name: ${ta.name}`
        ].filter(Boolean).join(' | ');
      },
      SELECT: () => element.selectedOptions[0]?.textContent || '',
      A: () => {
        const a = element;
        return [
          a.textContent?.trim() && `Text: ${a.textContent.trim()}`,
          a.getAttribute('aria-label') && `Aria-label: ${a.getAttribute('aria-label')}`,
          a.title && `Title: ${a.title}`
        ].filter(Boolean).join(' | ');
      },
      CONTENTEDITABLE: () => {
        const t = element.textContent?.trim() || '';
        return [
          t && `Content: ${t}`,
          element.getAttribute('placeholder') && `Placeholder: ${element.getAttribute('placeholder')}`,
          element.getAttribute('aria-label') && `Aria-label: ${element.getAttribute('aria-label')}`,
          element.getAttribute('name') && `Name: ${element.getAttribute('name')}`,
          !t && '[Contenteditable Element]'
        ].filter(Boolean).join(' | ');
      },
      DEFAULT: () => element.textContent || ''
    };
    return cleanText((extractors[effectiveTagName] || extractors.DEFAULT)());
  }

  function isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    if (!rect) return false;
    try {
      const style = window.getComputedStyle(element);
      return (
        rect.top >= 0 && rect.left >= 0 &&
        rect.bottom <= window.innerHeight && rect.right <= window.innerWidth &&
        style.display !== 'none' && style.visibility !== 'hidden' &&
        style.opacity !== '0' && !element.hidden &&
        rect.width > 0 && rect.height > 0
      );
    } catch(e) { console.warn('dom-engine: isElementVisible failed for element', element, e); return false; }
  }

  function getInteractiveSelectors() {
    return [
      'input:not([type="hidden"])', 'textarea', 'select', 'button',
      'a[href]', 'a[onclick]',
      '[onclick]', '[role="button"]', '[role="link"]', '[role="tab"]', '[role="option"]',
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex="-1"])',
      '[data-testid]' // Include X.com's testid attributes
    ];
  }

  function findInteractiveElements(options = {}) {
    const { injectTrackers = false } = options;
    const selectors = getInteractiveSelectors().join(', ');
    const allElements = document.body.querySelectorAll(selectors);

    const categorized = { buttons: [], inputs: [], links: [], editable: [], custom: [], selectable: [] };
    let total = 0;

    for (const element of allElements) {
      if (!isElementVisible(element)) continue;
      let text = getElementText(element);
      if (!text) continue;

      const domId = injectTrackers ? generateUniqueId() : '';
      if (injectTrackers) {
        element.setAttribute('agentic-purpose-id', domId);
      }

      const info = filterValidProperties({
        text, agenticPurposeId: injectTrackers ? domId : '',
        id: element.id?.substring(0, 40),
        className: filterStylingClasses(element.className),
        dataTestid: element.getAttribute('data-testid'),
        onclick: element.onclick ? 'Yes' : 'No',
        tabindex: element.tabIndex,
        role: element.getAttribute('role'),
        href: element.getAttribute('href'),
        ariaLabel: element.getAttribute('aria-label'),
        tagName: element.tagName
      });

      let category = 'selectable';
      if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') category = 'buttons';
      else if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) category = 'inputs';
      else if (element.tagName === 'A') category = 'links';
      else if (element.contentEditable === 'true') category = 'editable';
      else if (element.getAttribute('onclick')) category = 'custom';

      categorized[category].push(info);
      total++;
    }
    return { ...categorized, total };
  }

  function calculateScrollInfo() {
    const base = {
      totalHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      scrollTop: window.pageYOffset || document.documentElement.scrollTop
    };
    const remaining = base.totalHeight - (base.scrollTop + base.viewportHeight);
    const next = base.scrollTop + base.viewportHeight;
    return {
      ...base,
      verticalScrollPercentage: Math.round((base.scrollTop / (base.totalHeight - base.viewportHeight)) * 100),
      remainingHeight: remaining,
      nextContentPixel: next,
      scrollToSeeNewContent: remaining > 0 ? 1 : 0,
      firstNewContentPixel: next
    };
  }

  function scrollToNewContent() {
    const info = calculateScrollInfo();
    if (info.firstNewContentPixel >= info.totalHeight) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return { success: true, scrolledTo: 0 };
    }
    window.scrollTo({ top: info.firstNewContentPixel, behavior: 'smooth' });
    return { success: true, scrolledTo: info.firstNewContentPixel };
  }

  function simulateHumanClick(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const events = [
      new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y, button: 0 }),
      new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y, button: 0 }),
      new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y, button: 0, buttons: 1 }),
      new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y, button: 0 }),
      new MouseEvent('click', { bubbles: true, clientX: x, clientY: y, button: 0 })
    ];
    events.forEach((e, i) => {
      const baseDelay = [8, 22, 35, 12, 18][i]; // varied per event type
      const jitter = Math.floor(Math.random() * 16) - 8; // ±8ms
      setTimeout(() => element.dispatchEvent(e), baseDelay + jitter);
    });

    if (element.tabIndex >= 0) {
      setTimeout(() => element.focus(), 30 + Math.floor(Math.random() * 40)); // 30-70ms
    }
  }

  function executeClickAction(element, id) {
    simulateHumanClick(element);
    return { agenticPurposeId: id, success: true, action: 'click', message: 'Clicked via dom-engine' };
  }

  function executeTypeAction(element, value, id) {
    // Focus + click first
    simulateHumanClick(element);

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      // Clear existing value
      element.value = '';
      // Type each character (simulates real typing)
      for (const char of (value || '')) {
        element.value += char;
        element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: char }));
      }
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return { agenticPurposeId: id, success: true, action: 'type', message: `Typed "${value}"` };
    }

    if (element.contentEditable === 'true') {
      element.textContent = value || '';
      return { agenticPurposeId: id, success: true, action: 'type', message: 'Set contentEditable' };
    }

    return { agenticPurposeId: id, success: false, action: 'type', error: 'Not a text field' };
  }

  function executeActions(actions) {
    const results = [];
    for (const action of actions) {
      const el = document.querySelector(`[agentic-purpose-id="${action.agenticPurposeId}"]`);
      if (!el) {
        results.push({ agenticPurposeId: action.agenticPurposeId, success: false, action: action.actionType, error: 'Element not found' });
        continue;
      }
      try {
        if (action.actionType === 'click') {
          results.push(executeClickAction(el, action.agenticPurposeId));
        } else if (action.actionType === 'type') {
          results.push(executeTypeAction(el, action.value, action.agenticPurposeId));
        } else {
          results.push({ agenticPurposeId: action.agenticPurposeId, success: false, action: action.actionType, error: `Unknown actionType: ${action.actionType}` });
        }
      } catch(e) {
        results.push({ agenticPurposeId: action.agenticPurposeId, success: false, action: action.actionType, error: e.message });
      }
    }
    return { success: results.some(r => r.success), results, message: `${results.filter(r=>r.success).length}/${actions.length} succeeded` };
  }

  function getInteractiveContext(options = {}) {
    return {
      interactiveElements: findInteractiveElements(options),
      scrollInfo: calculateScrollInfo()
    };
  }

  window.getInteractiveContext = getInteractiveContext;
  window.scrollToNewContent = scrollToNewContent;
  window.executeActions = executeActions;

  return 'dom-engine loaded ✓';
}

// Node.js export for require/import
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { injectDomEngine };
}
