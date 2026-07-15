/**
 * dom-engine — Self-contained browser injection bundle
 * Source: @agentic-intelligence/dom-engine
 * 
 * Usage: Inject via browser act:evaluate, then call window.getInteractiveContext(), etc.
 * 
 * Exposes on window:
 *   - getInteractiveContext(options?)
 *   - scrollToNewContent()
 *   - executeActions(actions)
 */
(() => {
  if (window.__domEngineLoaded) return 'dom-engine already loaded';
  window.__domEngineLoaded = true;

  // ─── utils/helpers.js ───
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

  // ─── read/element-analyzer.js ───
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

  function getSiblingText(element) {
    return {
      leftBrother: element.previousElementSibling ? getElementText(element.previousElementSibling) : '',
      rightBrother: element.nextElementSibling ? getElementText(element.nextElementSibling) : ''
    };
  }

  function isElementVisible(element, context) {
    const ctx = context || { document, window };
    const rect = element.getBoundingClientRect();
    const style = ctx.window.getComputedStyle(element);
    return (
      rect.top >= 0 && rect.left >= 0 &&
      rect.bottom <= ctx.window.innerHeight && rect.right <= ctx.window.innerWidth &&
      style.display !== 'none' && style.visibility !== 'hidden' &&
      style.opacity !== '0' && !element.hidden &&
      rect.width > 0 && rect.height > 0
    );
  }

  function hasSvgIcon(element) {
    if (element.tagName !== 'BUTTON' && element.getAttribute('role') !== 'button') return false;
    return element.querySelector('svg') !== null;
  }

  // ─── read/interactive-finder.js ───
  function getInteractiveSelectors() {
    return [
      'input:not([type="hidden"])', 'input[type="checkbox"]', 'textarea', 'select', 'button',
      'a[href]', 'a[onclick]', 'a[class*="cursor-pointer"]',
      '[onclick]', '[onmousedown]', '[onmouseup]',
      '[role="button"]', '[role="link"]', '[role="menuitem"]', '[role="tab"]', '[role="option"]',
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex="-1"])',
      '[style*="cursor: pointer"]',
      '[data-action]', '[data-toggle]', '[data-target]'
    ];
  }

  function findInteractiveElements(options = {}) {
    const { injectTrackers = false, context } = options;
    const ctx = context || { document, window };
    const selectors = getInteractiveSelectors().join(', ');
    const allElements = ctx.document.body.querySelectorAll(selectors);

    const categorizers = {
      buttons: (el) => el.tagName === 'BUTTON' || el.getAttribute('role') === 'button',
      inputs: (el) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName),
      links: (el) => el.tagName === 'A',
      editable: (el) => el.contentEditable === 'true',
      custom: (el) => !!el.onclick || !!el.getAttribute('onclick'),
      selectable: () => true
    };

    const categorized = {};
    for (const key of Object.keys(categorizers)) categorized[key] = [];
    let total = 0;

    for (const element of allElements) {
      if (!isElementVisible(element, ctx)) continue;
      let text = getElementText(element);
      const isSvg = !text && hasSvgIcon(element);
      if (!text && !isSvg) continue;
      if (isSvg) text = '[Icon Button]';

      const domId = injectTrackers ? generateUniqueId() : '';
      if (injectTrackers) {
        element.setAttribute('agentic-purpose-id', domId);
        element.addEventListener('click', () => {
          window.clickDetected = true;
        });
      }

      const info = filterValidProperties({
        text, agenticPurposeId: injectTrackers ? domId : '',
        id: element.id?.substring(0, 40),
        className: filterStylingClasses(element.className),
        onclick: element.onclick ? 'Yes' : 'No',
        tabindex: element.tabIndex,
        role: element.getAttribute('role'),
        href: element.getAttribute('href'),
        title: element.getAttribute('title'),
        ariaLabel: element.getAttribute('aria-label'),
        ...(element.tagName === 'INPUT' ? getSiblingText(element) : {})
      });

      const category = Object.keys(categorizers).find(k => categorizers[k](element)) || 'selectable';
      categorized[category].push(info);
      total++;
    }
    return { ...categorized, total };
  }

  // ─── actions/scroll.js ───
  function calculateScrollInfo(context) {
    const ctx = context || { document, window };
    const base = {
      totalHeight: ctx.document.documentElement.scrollHeight,
      viewportHeight: ctx.window.innerHeight,
      scrollTop: ctx.window.pageYOffset || ctx.document.documentElement.scrollTop,
      scrollLeft: ctx.window.pageXOffset || ctx.document.documentElement.scrollLeft,
      totalWidth: ctx.document.documentElement.scrollWidth,
      viewportWidth: ctx.window.innerWidth
    };
    const remaining = base.totalHeight - (base.scrollTop + base.viewportHeight);
    const next = base.scrollTop + base.viewportHeight;
    return {
      ...base,
      verticalScrollPercentage: Math.round((base.scrollTop / (base.totalHeight - base.viewportHeight)) * 100),
      horizontalScrollPercentage: Math.round((base.scrollLeft / (base.totalWidth - base.viewportWidth)) * 100),
      visibleHeightPercentage: Math.round((base.viewportHeight / base.totalHeight) * 100),
      remainingHeight: remaining, nextContentPixel: next,
      remainingHeightPercentage: Math.round((remaining / base.totalHeight) * 100),
      scrollToSeeNewContent: remaining > 0 ? 1 : 0,
      currentScrollPosition: base.scrollTop,
      lastVisiblePixel: next - 1, firstNewContentPixel: next
    };
  }

  function scrollToNewContent(context) {
    const ctx = context || { document, window };
    const info = calculateScrollInfo(ctx);
    if (info.firstNewContentPixel >= info.totalHeight) {
      ctx.window.scrollTo({ top: 0, behavior: 'smooth' });
      return { success: true, scrolledTo: 0 };
    }
    ctx.window.scrollTo({ top: info.firstNewContentPixel, behavior: 'smooth' });
    return { success: true, scrolledTo: info.firstNewContentPixel };
  }

  // ─── actions/click.js ───
  function simulateHumanClick(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const events = [
      new MouseEvent('mouseover', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 0 }),
      new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 0 }),
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1 }),
      new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 0 }),
      new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 0 })
    ];
    events.forEach((e, i) => setTimeout(() => element.dispatchEvent(e), i * 10));
    if (element.tabIndex >= 0 || element instanceof HTMLInputElement || element instanceof HTMLButtonElement || element instanceof HTMLAnchorElement) {
      setTimeout(() => element.focus(), 50);
    }
  }

  function executeClickAction(element, id) {
    window.clickDetected = false;
    const methods = [
      () => element.click(),
      () => simulateHumanClick(element),
      () => { element.focus(); element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 })); },
      () => {
        const r = element.getBoundingClientRect();
        element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: r.left + r.width/2, clientY: r.top + r.height/2, button: 0 }));
      }
    ];
    for (const fn of methods) {
      if (window.clickDetected) break;
      try { fn(); } catch(e) {}
    }
    return { agenticPurposeId: id, success: true, action: 'click', message: 'Clicked' };
  }

  // ─── actions/type.js ───
  function simulateHumanType(element, value) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    [
      new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }),
      new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }),
      new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y, button: 0, buttons: 1 }),
      new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }),
      new MouseEvent('click', { bubbles: true, clientX: x, clientY: y })
    ].forEach(e => element.dispatchEvent(e));
    element.focus();
    element.value = value || '';
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function executeTypeAction(element, value, id) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      simulateHumanType(element, value);
      return { agenticPurposeId: id, success: true, action: 'type', message: `Typed "${value}"` };
    }
    if (element.contentEditable === 'true') {
      simulateHumanType(element, value);
      return { agenticPurposeId: id, success: true, action: 'type', message: `Typed "${value}" in contentEditable` };
    }
    return { agenticPurposeId: id, success: false, action: 'type', error: 'Not a text field' };
  }

  // ─── actions/executor.js ───
  function executeActions(actions, context) {
    const results = [];
    for (const action of actions) {
      const el = (context || document).querySelector(`[agentic-purpose-id="${action.agenticPurposeId}"]`);
      if (!el) { results.push({ agenticPurposeId: action.agenticPurposeId, success: false, action: action.actionType, error: `Element not found` }); continue; }
      try {
        results.push(action.actionType === 'click' ? executeClickAction(el, action.agenticPurposeId) : executeTypeAction(el, action.value, action.agenticPurposeId));
      } catch(e) {
        results.push({ agenticPurposeId: action.agenticPurposeId, success: false, action: action.actionType, error: e.message });
      }
    }
    return { success: results.some(r => r.success), results, message: `${results.filter(r=>r.success).length}/${actions.length} succeeded` };
  }

  // ─── core/dom-engine.js ───
  function getInteractiveContext(options = {}) {
    return {
      interactiveElements: findInteractiveElements(options),
      scrollInfo: calculateScrollInfo(options.context)
    };
  }

  // ─── Expose on window ───
  window.getInteractiveContext = getInteractiveContext;
  window.scrollToNewContent = scrollToNewContent;
  window.executeActions = executeActions;

  return 'dom-engine loaded ✓';
})();
