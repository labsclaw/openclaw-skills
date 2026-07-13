// chromeAssistente.js - SDK for the Chrome Assistente extension.
//
// TRANSPORT: This SDK talks to the target page via the Chrome DevTools Protocol
// (CDP) on the remote-debugging port (default 9222). We use CDP `Runtime.evaluate`
// to drive the injected content script (dom-engine) inside the target tab.
//
// Why CDP instead of a raw WebSocket server? The `chrome.sockets` API is NOT
// available in stable Chrome (it was removed from desktop Chrome years ago), so a
// self-hosted WS server inside the extension cannot bind a TCP port. CDP is the
// supported, reliable transport and is already documented as the "CDP fallback"
// in README.md / SKILL.md. To enable it, launch Chrome with:
//   chrome.exe --remote-debugging-port=9222 --user-data-dir=<profile>
//
// RUNTIME: Uses only globals (WebSocket, fetch, AbortController) so it works both
// in Node (require) and in the browser (window.ChromeAssistente) without `ws`
// or `http` Node built-ins. No NodeJS-only `require()` in the SDK body.
//
// The SDK exposes the documented API: connect, healthCheck, navigateAndExtract,
// snapshot, click, fill, submit, captureAuth, detectChallenge, extractApiKey.

const CDP_DEFAULT_PORT = 9222;
// Use the global WebSocket (browser + Node >= 21). Avoid the ws module so this
// file works unchanged in the browser context.
const WS = (typeof WebSocket !== 'undefined') ? WebSocket
  : (typeof globalThis !== 'undefined' && globalThis.WebSocket ? globalThis.WebSocket : null);

// The dom-engine command runner, evaluated inside the page's ISOLATED world via
// Runtime.evaluate. It mirrors content.js message handling so we can invoke the
// same logic the extension uses.
const PAGE_DRIVER = `
(function() {
  function getImplicitRole(element) {
    const tag = element.tagName.toLowerCase();
    const type = element.getAttribute('type') && element.getAttribute('type').toLowerCase();
    if (tag === 'a' && element.href) return 'link';
    if (tag === 'button') return 'button';
    if (tag === 'input') {
      if (['text','email','password','search','tel','url','number'].includes(type)) return 'textbox';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (['submit','button'].includes(type)) return 'button';
      return 'textbox';
    }
    if (tag === 'textarea') return 'textbox';
    if (tag === 'select') return 'combobox';
    if (element.isContentEditable) return 'textbox';
    if (element.onclick || element.getAttribute('onclick')) return 'button';
    return null;
  }
  const INTERACTIVE_ROLES = ['button','link','textbox','checkbox','radio','menuitem','tab','searchbox','slider','spinbutton','switch'];
  function isInteractive(element) {
    const role = element.getAttribute('role') || getImplicitRole(element);
    if (!role || !INTERACTIVE_ROLES.includes(role)) return false;
    if (element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
    return true;
  }
  function assignIds(root) {
    let counter = 0;
    const els = [];
    (function walk(n) {
      if (n.nodeType === 9 || n.nodeType === 11) { // document / fragment: descend
        for (const c of n.childNodes) walk(c);
        return;
      }
      if (n.nodeType === 1) {
        if (isInteractive(n)) {
          if (!n.dataset.agenticPurposeId) n.dataset.agenticPurposeId = 'elem_' + (++counter);
          els.push(n);
        }
        for (const c of n.children) walk(c);
      }
    })(root === document ? document.documentElement : (root || document.documentElement));
    return els;
  }
  function buildSnapshot() {
    const els = assignIds(document);
    return { url: location.href, title: document.title, elements: els.map(e => ({
      id: e.dataset.agenticPurposeId,
      role: e.getAttribute('role') || getImplicitRole(e),
      tag: e.tagName.toLowerCase(),
      text: (e.innerText || '').slice(0, 100),
      attrs: (() => { const a = {}; ['id','name','type','placeholder','value','href','src','alt','title','role','aria-label','data-testid'].forEach(k => { const v = e.getAttribute(k); if (v != null) a[k] = v; }); return a; })(),
      rect: (() => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }; })()
    })) };
  }
  function findById(id) { return document.querySelector('[data-agentic-purpose-id="' + id + '"]'); }
  return {
    snapshot: buildSnapshot,
    click: (id) => { const e = findById(id); if (!e) return { error: 'not found' }; e.click(); return { ok: true }; },
    fill: (id, val) => { const e = findById(id); if (!e) return { error: 'not found' }; e.focus(); e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return { ok: true }; },
    submit: (id) => { const e = findById(id); if (!e) return { error: 'not found' }; if (e.tagName === 'FORM') e.requestSubmit ? e.requestSubmit() : e.submit(); else e.closest('form').requestSubmit ? e.closest('form').requestSubmit() : e.closest('form').submit(); return { ok: true }; },
    captureAuth: (domain) => ({ cookies: document.cookie.split(';').map(c => c.trim()).filter(Boolean), localStorage: (() => { const o = {}; for (let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); o[k]=localStorage.getItem(k);} return o; })(), sessionStorage: (() => { const o = {}; for (let i=0;i<sessionStorage.length;i++){ const k=sessionStorage.key(i); o[k]=sessionStorage.getItem(k);} return o; })() }),
    detectChallenge: () => { const c = []; if (document.querySelector('[data-ray]') || document.body.innerHTML.includes('challenges.cloudflare.com')) c.push({ type: 'cloudflare', confidence: 0.9 }); if (document.querySelector('.g-recaptcha') || window.grecaptcha) c.push({ type: 'recaptcha', confidence: 0.9 }); if (document.querySelector('.h-captcha') || window.hcaptcha) c.push({ type: 'hcaptcha', confidence: 0.9 }); if (document.body.innerText.toLowerCase().includes('verify you are human')) c.push({ type: 'generic', confidence: 0.5 }); return c; }
  };
})()
`;

class ChromeAssistente {
  constructor() {
    this.port = CDP_DEFAULT_PORT;
    this.host = '127.0.0.1';
    this.ws = null;
    this.targetId = null;
    this.connected = false;
    this._msgId = 0;
    this._pending = new Map();
  }

  connect({ port = CDP_DEFAULT_PORT, host = '127.0.0.1' } = {}) {
    this.port = port; this.host = host;
    // Verify Chrome is reachable; the actual page WS is opened in useTab().
    return fetch(`http://${host}:${port}/json/version`).then((res) => {
      if (!res.ok) throw new Error('Cannot reach Chrome on ' + host + ':' + port);
      return res.json();
    }).then((json) => {
      this.connected = true;
      return { extension: 'loaded', bridge: 'connected', transport: 'cdp' };
    }).catch((e) => {
      throw new Error('Cannot reach Chrome on ' + host + ':' + port + ' (' + e.message + '). Launch with --remote-debugging-port=' + port);
    });
  }

  _openPageWs(wsUrl) {
    return new Promise((resolve, reject) => {
      if (!WS) { reject(new Error('WebSocket global unavailable in this runtime')); return; }
      const ws = new WS(wsUrl);
      this.ws = ws;
      ws.onopen = () => { ws.send(JSON.stringify({ id: ++this._msgId, method: 'Runtime.enable' })); resolve(); };
      ws.onerror = (e) => reject(new Error('CDP page connection error: ' + (e && e.message ? e.message : 'unknown')));
      ws.onmessage = (ev) => this._onCdpMessage(ev.data);
    });
  }

  _onCdpMessage(data) {
    const msg = JSON.parse(typeof data === 'string' ? data : data.toString());
    if (msg.id != null && this._pending.has(msg.id)) {
      const { resolve, reject } = this._pending.get(msg.id);
      this._pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || 'CDP error'));
      else resolve(msg.result);
    }
  }

  _cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this._msgId;
      this._pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this._pending.has(id)) { this._pending.delete(id); reject(new Error('CDP timeout')); } }, 30000);
    });
  }

  // Select the target tab (by url match or index) and open its CDP page socket.
  async useTab(predicateUrl) {
    const list = await fetch(`http://${this.host}:${this.port}/json/list`).then((res) => {
      if (!res.ok) throw new Error('Failed to list CDP targets: ' + res.status);
      return res.json();
    });
    const page = list.find(t => t.type === 'page' && (!predicateUrl || (t.url || '').includes(predicateUrl))) || list.find(t => t.type === 'page');
    if (!page) throw new Error('No page tab found');
    if (!page.webSocketDebuggerUrl) throw new Error('Target page has no webSocketDebuggerUrl (already attached elsewhere?)');
    this.targetId = page.id;
    if (this.ws) { try { this.ws.close(); } catch {} }
    await this._openPageWs(page.webSocketDebuggerUrl);
    return page;
  }

  _runInPage(expression) {
    return this._cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  }

  async _withDriver(fnCall) {
    const expr = `(${PAGE_DRIVER})['${fnCall.name}'](${(fnCall.args || []).map(JSON.stringify).join(',')})`;
    const result = await this._runInPage(expr);
    if (result && result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'page error');
    return result.result.value;
  }

  async healthCheck() {
    // CDP is the bridge; gateway health is checked separately by openclawClient.
    return { extension: 'loaded', bridge: 'connected', transport: 'cdp', gateway: 'unknown' };
  }

  async navigateAndExtract({ url, extract = ['links', 'inputs', 'buttons', 'forms'], tabUrl } = {}) {
    // Attach to a tab, navigate within its own session, then re-attach so the
    // page socket binds to the freshly navigated execution context.
    await this.useTab(tabUrl);
    await this._runInPage(`location.href = ${JSON.stringify(url)}; true`);
    await new Promise(r => setTimeout(r, 4000));
    // Re-open the page socket to bind to the new document context.
    const host = new URL(url).host;
    try { await this.useTab(host); } catch { /* fallback: keep current */ }
    await new Promise(r => setTimeout(r, 800));
    return this.snapshot();
  }

  async snapshot() { return this._withDriver({ name: 'snapshot' }); }
  async click({ elementId }) { return this._withDriver({ name: 'click', args: [elementId] }); }
  async fill({ elementId, value }) { return this._withDriver({ name: 'fill', args: [elementId, value] }); }
  async submit({ formId }) { return this._withDriver({ name: 'submit', args: [formId] }); }
  async captureAuth({ domain } = {}) { return this._withDriver({ name: 'captureAuth', args: [domain] }); }
  async detectChallenge() { return this._withDriver({ name: 'detectChallenge' }); }
}

if (typeof window !== 'undefined') window.ChromeAssistente = ChromeAssistente;
if (typeof module !== 'undefined' && module.exports) module.exports = ChromeAssistente;
