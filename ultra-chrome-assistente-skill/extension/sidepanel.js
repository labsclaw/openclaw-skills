// sidepanel.js - Sidepanel logic for Chrome Assistente

class ChromeAssistenteSidepanel {
  constructor() {
    this.currentTabId = null;
    this.tabs = [];
    this.init();
  }
  
  async init() {
    this.bindEvents();
    await this.loadTabs();
    await this.checkHealth();
  }
  
  bindEvents() {
    // Tab events
    document.getElementById('refreshTabs').addEventListener('click', () => this.loadTabs());
    
    // Navigation
    document.getElementById('navigateBtn').addEventListener('click', () => this.navigateAndExtract());
    document.getElementById('extractBtn').addEventListener('click', () => this.extractDom());
    
    // Element actions
    document.getElementById('clickBtn').addEventListener('click', () => this.elementAction('click'));
    document.getElementById('fillBtn').addEventListener('click', () => this.toggleFillMode());
    document.getElementById('elementId').addEventListener('input', () => this.updateActionButtons());
    
    // Tools
    document.getElementById('captureAuthBtn').addEventListener('click', () => this.captureAuth());
    document.getElementById('detectChallengeBtn').addEventListener('click', () => this.detectChallenge());
    document.getElementById('extractApiKeyBtn').addEventListener('click', () => this.extractApiKey());
    document.getElementById('healthCheckBtn').addEventListener('click', () => this.checkHealth());
    
    // Results
    document.getElementById('clearResults').addEventListener('click', () => this.clearResults());
  }
  
  // ============================================
  // TAB MANAGEMENT
  // ============================================
  async loadTabs() {
    try {
      this.tabs = await chrome.tabs.query({});
      this.renderTabs();
      this.showPanel('actionPanel');
    } catch (error) {
      this.showError('Erro ao carregar abas: ' + error.message);
    }
  }
  
  renderTabs() {
    const container = document.getElementById('tabsList');
    if (this.tabs.length === 0) {
      container.innerHTML = '<div class="empty">Nenhuma aba encontrada</div>';
      return;
    }
    
    container.innerHTML = this.tabs.map(tab => `
      <div class="tab-item ${tab.active ? 'active' : ''}" data-tab-id="${tab.id}">
        <div class="tab-favicon">
          ${tab.favIconUrl ? `<img src="${tab.favIconUrl}" alt="">` : '🌐'}
        </div>
        <div class="tab-info">
          <div class="tab-title">${this.escapeHtml(tab.title || 'Sem título')}</div>
          <div class="tab-url">${this.escapeHtml(tab.url || '')}</div>
        </div>
        ${tab.active ? '<span class="badge">atual</span>' : ''}
      </div>
    `).join('');
    
    // Click to select tab
    container.querySelectorAll('.tab-item').forEach(item => {
      item.addEventListener('click', () => {
        const tabId = parseInt(item.dataset.tabId);
        this.selectTab(tabId);
      });
    });
    
    // Auto-select active tab
    const activeTab = this.tabs.find(t => t.active);
    if (activeTab) this.currentTabId = activeTab.id;
  }
  
  async selectTab(tabId) {
    this.currentTabId = tabId;
    await chrome.tabs.update(tabId, { active: true });
    await this.loadTabs();
  }
  
  // ============================================
  // MESSAGE SENDING
  // ============================================
  async sendToContentScript(message) {
    if (!this.currentTabId) {
      throw new Error('Nenhuma aba selecionada');
    }
    
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.currentTabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
  
  // ============================================
  // NAVIGATION & EXTRACTION
  // ============================================
  async navigateAndExtract() {
    const url = document.getElementById('navigateUrl').value.trim();
    if (!url) {
      this.showError('Digite uma URL');
      return;
    }
    
    this.showResult({ action: 'navigate', url, status: 'started' });
    
    try {
      // Navigate
      await chrome.tabs.update(this.currentTabId, { url });
      
      // Wait for navigation + load
      await this.waitForTabLoad(this.currentTabId);
      
      // Extract
      const result = await this.sendToContentScript({
        type: 'GET_SNAPSHOT',
        payload: { extract: ['links', 'inputs', 'buttons', 'forms'] }
      });
      
      this.showResult({ action: 'navigateAndExtract', url, elements: result?.elements?.length || 0, data: result });
    } catch (error) {
      this.showResult({ action: 'navigateAndExtract', url, error: error.message });
    }
  }
  
  async extractDom() {
    if (!this.currentTabId) {
      this.showError('Selecione uma aba');
      return;
    }
    
    this.showResult({ action: 'extract', status: 'started' });
    
    try {
      const result = await this.sendToContentScript({
        type: 'GET_SNAPSHOT',
        payload: { extract: ['links', 'inputs', 'buttons', 'forms'] }
      });
      
      this.showResult({ action: 'extract', elements: result?.elements?.length || 0, data: result });
    } catch (error) {
      this.showResult({ action: 'extract', error: error.message });
    }
  }
  
  waitForTabLoad(tabId) {
    return new Promise((resolve, reject) => {
      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(resolve, 500); // Wait for JS execution
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Timeout aguardando carregamento'));
      }, 30000);
    });
  }
  
  // ============================================
  // ELEMENT ACTIONS
  // ============================================
  toggleFillMode() {
    const group = document.getElementById('fillValueGroup');
    const btn = document.getElementById('fillBtn');
    const isVisible = group.style.display !== 'none';
    
    group.style.display = isVisible ? 'none' : 'block';
    btn.textContent = isVisible ? 'Fill' : 'Confirmar Fill';
    btn.classList.toggle('active', !isVisible);
    
    if (!isVisible) {
      document.getElementById('fillValue').focus();
    }
  }
  
  async elementAction(action) {
    const elementId = document.getElementById('elementId').value.trim();
    if (!elementId) {
      this.showError('Digite o Agentic Purpose ID (ex: elem_1)');
      return;
    }
    
    if (action === 'fill') {
      const value = document.getElementById('fillValue').value;
      if (!value) {
        this.showError('Digite o valor para preencher');
        return;
      }
      await this.performElementAction({ elementId, action: 'fill', value });
      this.toggleFillMode();
    } else {
      await this.performElementAction({ elementId, action });
    }
  }
  
  async performElementAction(payload) {
    this.showResult({ action: 'elementAction', payload, status: 'started' });
    
    try {
      const result = await this.sendToContentScript({
        type: 'ELEMENT_ACTION',
        payload
      });
      this.showResult({ action: 'elementAction', payload, result });
    } catch (error) {
      this.showResult({ action: 'elementAction', payload, error: error.message });
    }
  }
  
  updateActionButtons() {
    const elementId = document.getElementById('elementId').value.trim();
    const hasId = elementId.length > 0;
    
    document.getElementById('clickBtn').disabled = !hasId;
    document.getElementById('fillBtn').disabled = !hasId;
  }
  
  // ============================================
  // TOOLS
  // ============================================
  async captureAuth() {
    this.showResult({ action: 'captureAuth', status: 'started' });
    
    try {
      const result = await this.sendToContentScript({
        type: 'CAPTURE_AUTH',
        payload: { include: ['cookies', 'localStorage', 'sessionStorage'] }
      });
      this.showResult({ action: 'captureAuth', data: result });
    } catch (error) {
      this.showResult({ action: 'captureAuth', error: error.message });
    }
  }
  
  async detectChallenge() {
    this.showResult({ action: 'detectChallenge', status: 'started' });
    
    try {
      const result = await this.sendToContentScript({
        type: 'DETECT_CHALLENGE'
      });
      this.showResult({ action: 'detectChallenge', data: result });
    } catch (error) {
      this.showResult({ action: 'detectChallenge', error: error.message });
    }
  }
  
  async extractApiKey() {
    this.showResult({ action: 'extractApiKey', status: 'started' });
    
    try {
      const result = await this.sendToContentScript({
        type: 'EXTRACT_API_KEY'
      });
      this.showResult({ action: 'extractApiKey', data: result });
    } catch (error) {
      this.showResult({ action: 'extractApiKey', error: error.message });
    }
  }
  
  async checkHealth() {
    this.showResult({ action: 'healthCheck', status: 'started' });
    
    try {
      const result = await this.sendToContentScript({
        type: 'HEALTH_CHECK'
      });
      this.updateStatus('connected', 'Conectado ✅');
      this.showResult({ action: 'healthCheck', data: result });
    } catch (error) {
      this.updateStatus('error', 'Erro: ' + error.message);
      this.showResult({ action: 'healthCheck', error: error.message });
    }
  }
  
  // ============================================
  // UI HELPERS
  // ============================================
  showPanel(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
    document.getElementById(panelId).style.display = 'block';
  }
  
  showResult(data) {
    const output = document.getElementById('resultsOutput');
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const formatted = JSON.stringify(data, null, 2);
    output.textContent = `[${timestamp}] ${formatted}`;
    output.scrollTop = output.scrollHeight;
  }
  
  clearResults() {
    document.getElementById('resultsOutput').textContent = 'Aguardando ação...';
  }
  
  showError(message) {
    this.showResult({ error: message });
  }
  
  updateStatus(state, text) {
    const indicator = document.getElementById('statusIndicator');
    indicator.className = 'status-indicator ' + state;
    indicator.querySelector('.text').textContent = text;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new ChromeAssistenteSidepanel();
});