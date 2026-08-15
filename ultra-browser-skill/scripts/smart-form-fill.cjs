#!/usr/bin/env node
/**
 * smart-form-fill.cjs — In-page JS injection for complex SPA forms
 *
 * Detects framework (React/Vue/Angular/Svelte/WebComponents) and injects
 * targeted JS to manipulate DOM state directly when standard Playwright
 * act() fails on controlled components.
 *
 * Usage:
 *   node scripts/smart-form-fill.cjs --selector "input[name='email']" --value "test@example.com"
 *   node scripts/smart-form-fill.cjs --selector "[data-testid='select']" --value "Option A" --framework react
 *   node scripts/smart-form-fill.cjs --detect
 *   node scripts/smart-form-fill.cjs --selector "#email" --value "x" --dry-run
 *
 * Outputs JSON with { success, framework, strategy, script } for Playwright evaluate().
 */

const fs = require('fs');
const path = require('path');

// --- Framework detection scripts (run inside browser context) ---
const DETECTION_SCRIPT = `(() => {
  const result = { detected: null, evidence: [] };

  // React
  if (document.querySelector('[data-reactroot]') ||
      document.querySelector('#__next') ||
      window.__NEXT_DATA__ ||
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    result.detected = 'react';
    result.evidence.push('reactRoot/nextData/hook');
  }
  // Check fiber
  const body = document.body;
  if (body) {
    const fiberKey = Object.keys(body).find(k => k.startsWith('__reactFiber$'));
    if (fiberKey) {
      if (!result.detected) result.detected = 'react';
      result.evidence.push('reactFiber');
    }
  }

  // Vue
  if (window.__VUE__ || window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
    result.detected = result.detected || 'vue';
    result.evidence.push('vueGlobal');
  }
  const vueEl = document.querySelector('#app');
  if (vueEl && vueEl.__vue_app__) {
    result.detected = result.detected || 'vue';
    result.evidence.push('vueApp');
  }

  // Angular
  if (window.ng || document.querySelector('[ng-version]')) {
    result.detected = result.detected || 'angular';
    result.evidence.push('ngProbe');
  }

  // Svelte
  const svelteEls = document.querySelectorAll('[class*="svelte-"]');
  if (svelteEls.length > 0) {
    result.detected = result.detected || 'svelte';
    result.evidence.push('svelteClass');
  }

  // Web Components (shadow DOM)
  const allEls = document.querySelectorAll('*');
  for (const el of allEls) {
    if (el.shadowRoot) {
      result.detected = result.detected || 'webcomponents';
      result.evidence.push('shadowRoot:' + el.tagName);
      break;
    }
  }

  result.detected = result.detected || 'generic';
  return result;
})()`;

// --- Injection scripts per framework ---
const INJECT = {
  react: {
    setValue: `((el, val) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value === val;
    })(ELEMENT, VALUE)`,
    select: `((el, val) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value === val;
    })(ELEMENT, VALUE)`,
    textarea: `((el, val) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value === val;
    })(ELEMENT, VALUE)`,
    checkbox: `((el) => {
      if (!el.checked) el.click();
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.checked;
    })(ELEMENT)`,
    click: `((el) => {
      const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps$'));
      if (propsKey && el[propsKey]?.onClick) {
        el[propsKey].onClick({ target: el, preventDefault: () => {}, stopPropagation: () => {} });
      }
      el.click();
      return true;
    })(ELEMENT)`,
  },
  vue: {
    setValue: `((el, val) => {
      const vueKey = Object.keys(el).find(k => k.startsWith('__vue'));
      if (vueKey && el[vueKey]?.component?.emit) {
        el[vueKey].component.emit('update:modelValue', val);
      }
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })(ELEMENT, VALUE)`,
    click: `((el) => {
      el.click();
      return true;
    })(ELEMENT)`,
  },
  angular: {
    setValue: `((el, val) => {
      if (window.ng && window.ng.getComponent) {
        const comp = window.ng.getComponent(el.closest('[ng-reflect-model]') || el);
        if (comp) {
          const key = el.getAttribute('ng-reflect-model') || el.getAttribute('name');
          if (comp[key] !== undefined) comp[key] = val;
        }
      }
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })(ELEMENT, VALUE)`,
    click: `((el) => {
      el.click();
      el.dispatchEvent(new Event('click', { bubbles: true }));
      return true;
    })(ELEMENT)`,
  },
  svelte: {
    setValue: `((el, val) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })(ELEMENT, VALUE)`,
    click: `((el) => {
      el.click();
      return true;
    })(ELEMENT)`,
  },
  generic: {
    setValue: `((el, val) => {
      const tag = el.tagName.toLowerCase();
      let proto;
      if (tag === 'textarea') proto = window.HTMLTextAreaElement.prototype;
      else if (tag === 'select') proto = window.HTMLSelectElement.prototype;
      else proto = window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, val);
      else el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })(ELEMENT, VALUE)`,
    click: `((el) => {
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    })(ELEMENT)`,
  },
};

// --- Custom dropdown (universal fallback) ---
const CUSTOM_DROPDOWN = `((el, val) => {
  el.click();
  return new Promise(resolve => {
    setTimeout(() => {
      const opts = document.querySelectorAll(
        '[role="option"], [class*="option"], [class*="menu-item"], li[id*="option"]'
      );
      for (const opt of opts) {
        if (opt.textContent.trim().toLowerCase() === val.toLowerCase()) {
          opt.click();
          resolve(true);
          return;
        }
      }
      resolve(false);
    }, 300);
  });
})(ELEMENT, VALUE)`;

function resolveStrategy(framework, fieldType, value) {
  const tag = fieldType.toLowerCase();
  const isDropdown = tag.includes('combobox') || tag.includes('listbox') || tag.includes('select');
  const isCheckbox = tag.includes('checkbox');
  const isTextarea = tag.includes('textarea');
  const isClickable = tag.includes('radio') || tag.includes('button');

  if (isDropdown) return { strategy: 'customDropdown', script: CUSTOM_DROPDOWN };
  if (isCheckbox) return { strategy: 'checkbox', script: (INJECT[framework] || INJECT.generic).checkbox || INJECT.generic.click };
  if (isClickable) return { strategy: 'click', script: (INJECT[framework] || INJECT.generic).click };
  if (isTextarea) return { strategy: 'setValue', script: (INJECT[framework] || INJECT.generic).textarea || (INJECT[framework] || INJECT.generic).setValue };

  return { strategy: 'setValue', script: (INJECT[framework] || INJECT.generic).setValue };
}

function buildScript(script, selector, value) {
  return script
    .replace(/ELEMENT/g, `document.querySelector(${JSON.stringify(selector)})`)
    .replace(/VALUE/g, JSON.stringify(value));
}

// --- CLI ---
function main() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--detect') { flags.detect = true; }
    else if (args[i] === '--dry-run') { flags.dryRun = true; }
    else if (args[i] === '--framework') { flags.framework = args[++i]; }
    else if (args[i] === '--selector') { flags.selector = args[++i]; }
    else if (args[i] === '--value') { flags.value = args[++i]; }
    else if (args[i] === '--field-type') { flags.fieldType = args[++i]; }
    else if (args[i] === '--json') { /* already default */ }
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(JSON.stringify({
        usage: 'node smart-form-fill.cjs --selector <css> --value <text> [--framework react] [--field-type input\\[text\\]] [--dry-run]',
        detect: 'node smart-form-fill.cjs --detect',
        options: {
          '--selector': 'CSS selector for target element',
          '--value': 'Value to set',
          '--framework': 'Force framework (react|vue|angular|svelte|generic)',
          '--field-type': 'Field type hint (input[text], select, textarea, checkbox, [role="combobox"])',
          '--dry-run': 'Output script without executing',
          '--detect': 'Detect framework only',
          '--json': 'Output as JSON (default)',
        }
      }));
      return;
    }
  }

  if (flags.detect) {
    console.log(JSON.stringify({
      action: 'detect',
      script: DETECTION_SCRIPT,
    }, null, 2));
    return;
  }

  if (!flags.selector) {
    console.error(JSON.stringify({ error: '--selector is required' }));
    process.exit(1);
  }

  const framework = flags.framework || 'auto';
  const fieldType = flags.fieldType || 'input[text]';
  const value = flags.value || '';

  const { strategy, script } = resolveStrategy(framework, fieldType, value);
  const fullScript = buildScript(script, flags.selector, value);

  const output = {
    action: 'inject',
    selector: flags.selector,
    value,
    framework: framework === 'auto' ? 'detect-first' : framework,
    strategy,
    script: fullScript,
    notes: strategy === 'customDropdown'
      ? 'Uses open+type+select fallback for custom dropdowns'
      : `Uses ${framework === 'auto' ? 'generic' : framework}-specific ${strategy} injection`,
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
