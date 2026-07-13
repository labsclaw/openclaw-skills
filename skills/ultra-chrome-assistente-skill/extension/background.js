// background.js - Service Worker for Chrome Assistente Extension
// WebSocket bridge on port 3032 for communication with content script

const WS_PORT = 3032;
let wsServer = null;
let connectedClients = new Map(); // tabId -> WebSocket

// Start WebSocket server
async function startWebSocketServer() {
  try {
    // Using chrome.sockets.tcpServer for WebSocket-like communication
    // Note: MV3 service workers don't support raw TCP, using chrome.runtime.connect instead
    console.log('[Chrome Assistente] Background service worker started');
    
    // Listen for messages from content scripts
    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      handleExternalMessage(message, sender, sendResponse);
      return true; // async response
    });
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleInternalMessage(message, sender, sendResponse);
      return true;
    });
    
    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        notifyTabReady(tabId, tab.url);
      }
    });
    
  } catch (error) {
    console.error('[Chrome Assistente] Failed to start:', error);
  }
}

// Handle messages from content script
function handleExternalMessage(message, sender, sendResponse) {
  const { type, payload, requestId } = message;
  
  switch (type) {
    case 'DOM_SNAPSHOT':
      handleDomSnapshot(sender.tab.id, payload, requestId, sendResponse);
      break;
    case 'ELEMENT_ACTION':
      handleElementAction(sender.tab.id, payload, requestId, sendResponse);
      break;
    case 'CAPTURE_AUTH':
      handleCaptureAuth(sender.tab.id, payload, requestId, sendResponse);
      break;
    case 'DETECT_CHALLENGE':
      handleDetectChallenge(sender.tab.id, requestId, sendResponse);
      break;
    case 'HEALTH_CHECK':
      sendResponse({ status: 'ok', bridge: 'connected', timestamp: Date.now() });
      break;
    default:
      sendResponse({ error: 'Unknown message type', type });
  }
}

// Handle internal messages (from sidepanel, popup)
function handleInternalMessage(message, sender, sendResponse) {
  const { type, payload, requestId } = message;
  
  switch (type) {
    case 'NAVIGATE_AND_EXTRACT':
      navigateAndExtract(payload.url, payload.options, requestId, sendResponse);
      break;
    case 'GET_TABS':
      getTabs(sendResponse);
      break;
    default:
      sendResponse({ error: 'Unknown internal message type' });
  }
}

// Navigate to URL and extract DOM snapshot
async function navigateAndExtract(url, options, requestId, sendResponse) {
  try {
    const tab = await chrome.tabs.create({ url, active: false });
    
    // Wait for page load
    await new Promise(resolve => {
      const listener = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(resolve, 1000); // Wait for JS execution
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    
    // Inject content script if not already there
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
      world: 'ISOLATED'
    });
    
    // Request DOM snapshot
    const snapshot = await sendToContentScript(tab.id, {
      type: 'GET_SNAPSHOT',
      options: options || {}
    });
    
    sendResponse({ success: true, snapshot, tabId: tab.id });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Send message to content script in specific tab
function sendToContentScript(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Handle DOM snapshot from content script
async function handleDomSnapshot(tabId, payload, requestId, sendResponse) {
  // Forward to any connected sidepanel or external client
  broadcastToClients({ type: 'DOM_SNAPSHOT', payload, tabId });
  sendResponse({ received: true });
}

// Handle element actions (click, fill, etc.)
async function handleElementAction(tabId, payload, requestId, sendResponse) {
  try {
    const result = await sendToContentScript(tabId, {
      type: 'ELEMENT_ACTION',
      payload
    });
    sendResponse({ success: true, result });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle auth capture (cookies, localStorage)
async function handleCaptureAuth(tabId, payload, requestId, sendResponse) {
  try {
    const result = await sendToContentScript(tabId, {
      type: 'CAPTURE_AUTH',
      payload
    });
    sendResponse({ success: true, auth: result });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle challenge detection
async function handleDetectChallenge(tabId, requestId, sendResponse) {
  try {
    const result = await sendToContentScript(tabId, {
      type: 'DETECT_CHALLENGE'
    });
    sendResponse({ success: true, challenge: result });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Notify clients tab is ready
function notifyTabReady(tabId, url) {
  broadcastToClients({ type: 'TAB_READY', tabId, url });
}

// Broadcast to all connected clients
function broadcastToClients(message) {
  // In MV3, we'd use chrome.runtime.sendMessage to sidepanel
  chrome.runtime.sendMessage(message).catch(() => {});
}

// Get all tabs
async function getTabs(sendResponse) {
  const tabs = await chrome.tabs.query({});
  sendResponse({ tabs: tabs.map(t => ({ id: t.id, url: t.url, title: t.title })) });
}

// Initialize
startWebSocketServer();

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Chrome Assistente] Installed/Updated:', details.reason);
  if (details.reason === 'install') {
    // Open sidepanel on first install
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

console.log('[Chrome Assistente] Background service worker initialized');