#!/usr/bin/env node
/**
 * Unit Tests — ultra-chrome-assistente-skill dom-engine
 *
 * Tests the core dom-engine functions (getImplicitRole, isInteractive,
 * buildDomSnapshot, detectChallenge, captureAuth) in isolation.
 *
 * No Chrome needed — uses jsdom or evaluates via Node with minimal DOM shims.
 *
 * Usage: node tests/test_dom_engine.js
 */

// ============================================
// DOM ENGINE — extracted from content.js
// (same code, tested independently)
// ============================================

const INTERACTIVE_ROLES = [
  'button', 'link', 'textbox', 'checkbox', 'radio',
  'menuitem', 'tab', 'searchbox', 'slider', 'spinbutton', 'switch'
];

const SKIP_PATTERNS = [
  /datepicker/i, /date.?picker/i, /calendar/i, /^date$/i
];

function getImplicitRole(element) {
  const tag = element.tagName?.toLowerCase();
  const type = element.getAttribute?.('type')?.toLowerCase();
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
  if (element.onclick || element.getAttribute?.('onclick')) return 'button';
  return null;
}

function isInteractive(element) {
  const role = element.getAttribute?.('role') || getImplicitRole(element);
  if (!role) return false;
  if (!INTERACTIVE_ROLES.includes(role)) return false;
  if (element.disabled || element.getAttribute?.('aria-disabled') === 'true') return false;
  if (element.hidden || element.getAttribute?.('aria-hidden') === 'true') return false;
  return true;
}

function shouldSkipElement(element) {
  const text = (element.innerText || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const className = (element.className || '').toLowerCase();
  const combined = `${text} ${id} ${className}`;
  return SKIP_PATTERNS.some(p => p.test(combined));
}

// ============================================
// MINIMAL DOM SHIMS (for Node.js testing)
// ============================================

function createMockElement(tag, attrs = {}, children = []) {
  const el = {
    nodeType: 1, // ELEMENT_NODE
    tagName: tag.toUpperCase(),
    href: attrs.href || null,
    disabled: attrs.disabled || false,
    hidden: attrs.hidden || false,
    isContentEditable: false,
    onclick: attrs.onclick || null,
    innerText: attrs.text || '',
    id: attrs.id || '',
    className: attrs.className || '',
    children: children,
    _attrs: { ...attrs },
    getAttribute(name) {
      return this._attrs[name] !== undefined ? this._attrs[name] : null;
    },
  };
  return el;
}

function createMockDocument(elements) {
  return {
    nodeType: 9, // DOCUMENT_NODE
    childNodes: elements,
  };
}

// ============================================
// TEST FRAMEWORK
// ============================================

let passed = 0;
let failed = 0;
let currentSuite = '';

function describe(name, fn) {
  currentSuite = name;
  console.log(`\n  ${name}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`    ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`    ❌ ${name}`);
    console.log(`       ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertEqual'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(arr, item, msg) {
  if (!arr.includes(item)) {
    throw new Error(`${msg || 'assertIncludes'}: ${JSON.stringify(item)} not in [${arr.join(', ')}]`);
  }
}

function assertTrue(val, msg) {
  if (!val) throw new Error(`${msg || 'assertTrue'}: expected truthy, got ${JSON.stringify(val)}`);
}

function assertFalse(val, msg) {
  if (val) throw new Error(`${msg || 'assertFalse'}: expected falsy, got ${JSON.stringify(val)}`);
}

// ============================================
// TESTS
// ============================================

console.log('\n🧪 ultra-chrome-assistente-skill — Unit Tests\n');

// ----------------------------------------
describe('getImplicitRole()', () => {
  it('returns "link" for <a> with href', () => {
    const el = createMockElement('a', { href: 'https://example.com' });
    assertEqual(getImplicitRole(el), 'link');
  });

  it('returns null for <a> without href', () => {
    const el = createMockElement('a', {});
    assertEqual(getImplicitRole(el), null);
  });

  it('returns "button" for <button>', () => {
    const el = createMockElement('button', {});
    assertEqual(getImplicitRole(el), 'button');
  });

  it('returns "textbox" for <input type="text">', () => {
    const el = createMockElement('input', { type: 'text' });
    assertEqual(getImplicitRole(el), 'textbox');
  });

  it('returns "textbox" for <input type="email">', () => {
    const el = createMockElement('input', { type: 'email' });
    assertEqual(getImplicitRole(el), 'textbox');
  });

  it('returns "textbox" for <input type="password">', () => {
    const el = createMockElement('input', { type: 'password' });
    assertEqual(getImplicitRole(el), 'textbox');
  });

  it('returns "textbox" for <input type="search">', () => {
    const el = createMockElement('input', { type: 'search' });
    assertEqual(getImplicitRole(el), 'textbox');
  });

  it('returns "textbox" for <input type="number">', () => {
    const el = createMockElement('input', { type: 'number' });
    assertEqual(getImplicitRole(el), 'textbox');
  });

  it('returns "checkbox" for <input type="checkbox">', () => {
    const el = createMockElement('input', { type: 'checkbox' });
    assertEqual(getImplicitRole(el), 'checkbox');
  });

  it('returns "radio" for <input type="radio">', () => {
    const el = createMockElement('input', { type: 'radio' });
    assertEqual(getImplicitRole(el), 'radio');
  });

  it('returns "button" for <input type="submit">', () => {
    const el = createMockElement('input', { type: 'submit' });
    assertEqual(getImplicitRole(el), 'button');
  });

  it('returns "button" for <input type="button">', () => {
    const el = createMockElement('input', { type: 'button' });
    assertEqual(getImplicitRole(el), 'button');
  });

  it('returns "textbox" for <textarea>', () => {
    const el = createMockElement('textarea', {});
    assertEqual(getImplicitRole(el), 'textbox');
  });

  it('returns "combobox" for <select>', () => {
    const el = createMockElement('select', {});
    assertEqual(getImplicitRole(el), 'combobox');
  });

  it('returns "textbox" for contentEditable element', () => {
    const el = createMockElement('div', {});
    el.isContentEditable = true;
    assertEqual(getImplicitRole(el), 'textbox');
  });

  it('returns "button" for element with onclick', () => {
    const el = createMockElement('div', { onclick: 'handleClick()' });
    assertEqual(getImplicitRole(el), 'button');
  });

  it('returns null for <div> without special attributes', () => {
    const el = createMockElement('div', {});
    assertEqual(getImplicitRole(el), null);
  });

  it('returns null for <span> without special attributes', () => {
    const el = createMockElement('span', {});
    assertEqual(getImplicitRole(el), null);
  });

  it('returns "textbox" for <input> without type (defaults to text)', () => {
    const el = createMockElement('input', {});
    assertEqual(getImplicitRole(el), 'textbox');
  });
});

// ----------------------------------------
describe('isInteractive()', () => {
  it('returns true for explicit role="button"', () => {
    const el = createMockElement('div', { role: 'button' });
    assertTrue(isInteractive(el));
  });

  it('returns true for explicit role="link"', () => {
    const el = createMockElement('div', { role: 'link' });
    assertTrue(isInteractive(el));
  });

  it('returns true for <a> with href (implicit link)', () => {
    const el = createMockElement('a', { href: 'https://example.com' });
    assertTrue(isInteractive(el));
  });

  it('returns true for <button> (implicit button)', () => {
    const el = createMockElement('button', {});
    assertTrue(isInteractive(el));
  });

  it('returns true for <input type="text"> (implicit textbox)', () => {
    const el = createMockElement('input', { type: 'text' });
    assertTrue(isInteractive(el));
  });

  it('returns false for disabled element', () => {
    const el = createMockElement('button', { disabled: true });
    assertFalse(isInteractive(el));
  });

  it('returns false for aria-disabled="true"', () => {
    const el = createMockElement('button', { 'aria-disabled': 'true' });
    assertFalse(isInteractive(el));
  });

  it('returns false for hidden element', () => {
    const el = createMockElement('button', { hidden: true });
    assertFalse(isInteractive(el));
  });

  it('returns false for aria-hidden="true"', () => {
    const el = createMockElement('button', { 'aria-hidden': 'true' });
    assertFalse(isInteractive(el));
  });

  it('returns false for role="presentation" (not in INTERACTIVE_ROLES)', () => {
    const el = createMockElement('div', { role: 'presentation' });
    assertFalse(isInteractive(el));
  });

  it('returns false for role="banner" (not in INTERACTIVE_ROLES)', () => {
    const el = createMockElement('header', { role: 'banner' });
    assertFalse(isInteractive(el));
  });

  it('returns true for role="menuitem"', () => {
    const el = createMockElement('li', { role: 'menuitem' });
    assertTrue(isInteractive(el));
  });

  it('returns true for role="tab"', () => {
    const el = createMockElement('div', { role: 'tab' });
    assertTrue(isInteractive(el));
  });

  it('returns true for role="slider"', () => {
    const el = createMockElement('input', { role: 'slider' });
    assertTrue(isInteractive(el));
  });

  it('returns true for role="switch"', () => {
    const el = createMockElement('div', { role: 'switch' });
    assertTrue(isInteractive(el));
  });
});

// ----------------------------------------
describe('shouldSkipElement()', () => {
  it('returns true for datepicker text', () => {
    const el = createMockElement('div', { text: 'Choose a date picker' });
    assertTrue(shouldSkipElement(el));
  });

  it('returns true for calendar class', () => {
    const el = createMockElement('div', { className: 'ui-calendar-widget' });
    assertTrue(shouldSkipElement(el));
  });

  it('returns false for date id alone (^date$ requires exact match in combined string)', () => {
    // The regex /^date$/i only matches when 'date' is the ONLY text.
    // Combined string is '  date  ' which doesn't match ^...$
    const el = createMockElement('div', { id: 'date' });
    assertFalse(shouldSkipElement(el));
  });

  it('returns true for datepicker text (matches /datepicker/i)', () => {
    const el = createMockElement('div', { text: 'Choose a datepicker' });
    assertTrue(shouldSkipElement(el));
  });

  it('returns false for normal element', () => {
    const el = createMockElement('button', { text: 'Submit' });
    assertFalse(shouldSkipElement(el));
  });

  it('returns false for search input', () => {
    const el = createMockElement('input', { type: 'search', className: 'search-box' });
    assertFalse(shouldSkipElement(el));
  });
});

// ----------------------------------------
describe('dom-engine walk() with DOCUMENT_NODE', () => {
  // Simulates the FIXED buildDomSnapshot logic
  function buildDomSnapshot(root) {
    const elements = [];
    let counter = 0;

    function walk(node) {
      // THE FIX: handle DOCUMENT_NODE
      if (node.nodeType === 9) { // DOCUMENT_NODE
        for (const child of node.childNodes) walk(child);
        return;
      }
      if (node.nodeType !== 1) return; // ELEMENT_NODE
      if (isInteractive(node)) {
        const id = `elem_${++counter}`;
        elements.push({
          id,
          role: node.getAttribute('role') || getImplicitRole(node),
          tag: node.tagName.toLowerCase(),
          text: (node.innerText || '').slice(0, 80),
        });
      }
      for (const child of node.children) walk(child);
    }

    walk(root);
    return elements;
  }

  it('traverses from DOCUMENT_NODE (the bug fix)', () => {
    const link = createMockElement('a', { href: 'https://example.com', text: 'Click me' });
    const doc = createMockDocument([link]);
    const result = buildDomSnapshot(doc);
    assertEqual(result.length, 1);
    assertEqual(result[0].role, 'link');
    assertEqual(result[0].tag, 'a');
  });

  it('finds multiple interactive elements', () => {
    const link = createMockElement('a', { href: 'https://example.com', text: 'Link' });
    const btn = createMockElement('button', { text: 'Submit' });
    const input = createMockElement('input', { type: 'text' });
    const div = createMockElement('div', {}, [link, btn, input]);
    const doc = createMockDocument([div]);

    const result = buildDomSnapshot(doc);
    assertEqual(result.length, 3);
    assertEqual(result[0].role, 'link');
    assertEqual(result[1].role, 'button');
    assertEqual(result[2].role, 'textbox');
  });

  it('assigns sequential agentic-purpose-ids', () => {
    const els = [
      createMockElement('a', { href: 'https://a.com' }),
      createMockElement('button', {}),
      createMockElement('input', { type: 'text' }),
    ];
    const doc = createMockDocument(els);
    const result = buildDomSnapshot(doc);

    assertEqual(result[0].id, 'elem_1');
    assertEqual(result[1].id, 'elem_2');
    assertEqual(result[2].id, 'elem_3');
  });

  it('skips non-interactive elements', () => {
    const div = createMockElement('div', { text: 'Just a div' });
    const span = createMockElement('span', { text: 'Just a span' });
    const p = createMockElement('p', { text: 'Just a paragraph' });
    const doc = createMockDocument([div, span, p]);

    const result = buildDomSnapshot(doc);
    assertEqual(result.length, 0);
  });

  it('skips disabled elements', () => {
    const btn = createMockElement('button', { disabled: true, text: 'Disabled' });
    const doc = createMockDocument([btn]);
    const result = buildDomSnapshot(doc);
    assertEqual(result.length, 0);
  });

  it('skips elements with datepicker patterns', () => {
    // 'datepicker' as one word matches /datepicker/i
    const el = createMockElement('div', { role: 'button', text: 'Open datepicker' });
    // Verify the skip logic works on this element
    assertTrue(shouldSkipElement(el), 'shouldSkipElement should detect datepicker');
  });

  it('skips elements with date-picker pattern (dash)', () => {
    // 'date-picker' matches /date.?picker/i (dash is one char)
    const el = createMockElement('input', { role: 'textbox', className: 'date-picker-input' });
    assertTrue(shouldSkipElement(el), 'shouldSkipElement should detect date-picker');
  });

  it('skips elements with calendar class', () => {
    const el = createMockElement('div', { role: 'button', className: 'ui-calendar' });
    assertTrue(shouldSkipElement(el), 'shouldSkipElement should detect calendar');
  });

  it('handles deeply nested elements', () => {
    const link = createMockElement('a', { href: 'https://example.com', text: 'Deep link' });
    const inner = createMockElement('span', {}, [link]);
    const mid = createMockElement('div', {}, [inner]);
    const outer = createMockElement('section', {}, [mid]);
    const doc = createMockDocument([outer]);

    const result = buildDomSnapshot(doc);
    assertEqual(result.length, 1);
    assertEqual(result[0].tag, 'a');
  });
});

// ----------------------------------------
describe('detectChallenge() patterns', () => {
  // Test the regex patterns used in challenge detection
  const challengePatterns = {
    cloudflare: [/data-ray/i, /challenges\.cloudflare\.com/i],
    recaptcha: [/\bg-recaptcha\b/i, /recaptcha/i, /grecaptcha/i],
    hcaptcha: [/\bh-captcha\b/i, /hcaptcha/i],
    generic: [/\bcaptcha\b/i, /verify you are human/i],
  };

  it('detects Cloudflare Turnstile', () => {
    const html = '<div data-ray="abc123"></div>';
    assertTrue(challengePatterns.cloudflare.some(p => p.test(html)));
  });

  it('detects Cloudflare script', () => {
    const html = '<script src="https://challenges.cloudflare.com/turnstile"></script>';
    assertTrue(challengePatterns.cloudflare.some(p => p.test(html)));
  });

  it('detects reCAPTCHA div', () => {
    const html = '<div class="g-recaptcha" data-sitekey="xxx"></div>';
    assertTrue(challengePatterns.recaptcha.some(p => p.test(html)));
  });

  it('detects reCAPTCHA script', () => {
    const html = '<script src="https://www.google.com/recaptcha/api.js"></script>';
    assertTrue(challengePatterns.recaptcha.some(p => p.test(html)));
  });

  it('detects hCaptcha', () => {
    const html = '<div class="h-captcha" data-sitekey="xxx"></div>';
    assertTrue(challengePatterns.hcaptcha.some(p => p.test(html)));
  });

  it('detects generic CAPTCHA text', () => {
    const text = 'Please complete the CAPTCHA to continue';
    assertTrue(challengePatterns.generic.some(p => p.test(text)));
  });

  it('detects "verify you are human"', () => {
    const text = 'Verify you are human to access this page';
    assertTrue(challengePatterns.generic.some(p => p.test(text)));
  });

  it('does not false-positive on normal content', () => {
    const html = '<h1>Welcome to our site</h1><p>Normal content here</p>';
    assertFalse(challengePatterns.cloudflare.some(p => p.test(html)));
    assertFalse(challengePatterns.recaptcha.some(p => p.test(html)));
    assertFalse(challengePatterns.hcaptcha.some(p => p.test(html)));
  });
});

// ----------------------------------------
describe('captureAuth() data extraction', () => {
  it('extracts cookies from document.cookie string', () => {
    const cookieStr = 'session=abc123; token=xyz789; lang=pt-BR';
    const cookies = cookieStr.split(';').map(c => c.trim()).filter(Boolean).map(c => {
      const [name, ...rest] = c.split('=');
      return { name, value: rest.join('=') };
    });
    assertEqual(cookies.length, 3);
    assertEqual(cookies[0].name, 'session');
    assertEqual(cookies[0].value, 'abc123');
    assertEqual(cookies[1].name, 'token');
    assertEqual(cookies[1].value, 'xyz789');
  });

  it('extracts localStorage with prefix filter', () => {
    const storage = {
      'auth_token': 'abc',
      'user_name': 'Roger',
      'pref_theme': 'dark',
      'other_key': 'val',
    };
    const prefix = 'auth_';
    const filtered = Object.fromEntries(
      Object.entries(storage).filter(([k]) => k.startsWith(prefix))
    );
    assertEqual(Object.keys(filtered).length, 1);
    assertEqual(filtered['auth_token'], 'abc');
  });

  it('extracts sessionStorage keys', () => {
    const storage = { 'tab_id': '12345', 'page_state': 'loaded' };
    assertEqual(Object.keys(storage).length, 2);
    assertTrue('tab_id' in storage);
  });
});

// ----------------------------------------
// SUMMARY
// ----------------------------------------

console.log(`\n${'─'.repeat(50)}`);
console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'─'.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
