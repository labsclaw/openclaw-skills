// background.js - Service Worker for Chrome Assistente Extension
//
// NOTE ON TRANSPORT: A self-hosted WebSocket server (chrome.sockets) is NOT used
// because `chrome.sockets` is unavailable in stable desktop Chrome. The real
// bridge to external callers is the Chrome DevTools Protocol (CDP) on the
// remote-debugging port (default 9222), driven by chromeAssistente.js. Launch
// Chrome with --remote-debugging-port=9222 to enable it.
//
// This SW handles chrome.runtime messages from the sidepanel and ensures the
// content script is active on pages where automation is requested.

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Chrome Assistente] Installed/Updated:', details.reason);
  if (details.reason === 'install') {
    try { await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }); } catch {}
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message || {};
  (async () => {
    try {
      switch (type) {
        case 'GET_TABS':
          sendResponse({ tabs: (await chrome.tabs.query({})).map(t => ({ id: t.id, url: t.url, title: t.title })) });
          break;
        case 'HEALTH_CHECK':
          sendResponse({ status: 'ok', bridge: 'cdp', timestamp: Date.now() });
          break;
        case 'NAVIGATE_AND_EXTRACT': {
          let tabId = payload.tabId;
          if (tabId == null) {
            const tab = await chrome.tabs.create({ url: payload.url, active: false });
            tabId = tab.id;
            await new Promise((resolve) => {
              const listener = (tId, info) => {
                if (tId === tabId && info.status === 'complete') {
                  chrome.tabs.onUpdated.removeListener(listener);
                  setTimeout(resolve, 1200);
                }
              };
              chrome.tabs.onUpdated.addListener(listener);
            });
          } else {
            await chrome.tabs.update(tabId, { url: payload.url });
            await new Promise((resolve) => setTimeout(resolve, 2500));
          }
          // Make sure the content script is injected
          try {
            await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'], world: 'ISOLATED' });
          } catch {}
          const snapshot = await chrome.tabs.sendMessage(tabId, { type: 'GET_SNAPSHOT', options: payload.options || {} });
          sendResponse({ success: true, snapshot, tabId });
          break;
        }
        default:
          sendResponse({ error: 'Unknown internal message type' });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true;
});

console.log('[Chrome Assistente] Background service worker initialized');
