// openclawClient.js - OpenClaw Gateway Integration (ESM, browser/service-worker ready)
// Substitui Groq -> usa gateway OpenClaw local.
// Converted from openclawClient.ts. Keep openclawClient.ts as the TS source of truth.
//
// NOTE on default model: `opencode/big-pickle` is a *stealth* OpenCode model.
// It does NOT appear in GET /v1/models but IS valid on the backend. We keep it
// as the default (matches the original skill intent) and automatically fall back
// to `opencode/hy3-free` if the primary model errors.

const FALLBACK_MODELS = ['opencode/big-pickle', 'opencode/hy3-free'];

export class OpenClawClient {
  constructor(config = {}) {
    this.config = {
      gatewayUrl: config.gatewayUrl || 'http://localhost:18789',
      apiKey: config.apiKey || '',
      timeout: config.timeout || 120000,
      model: config.model || 'opencode/big-pickle',
    };
    this.abortController = null;
  }

  _headers() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  async _fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Try each candidate model in order until one succeeds.
  async _chatCompletionWithFallback(bodyFactory, parse) {
    let lastError;
    const models = [this.config.model, ...FALLBACK_MODELS.filter(m => m !== this.config.model)];
    for (const model of models) {
      try {
        const body = bodyFactory(model);
        const response = await this._fetchWithTimeout(`${this.config.gatewayUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: this._headers(),
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`OpenClaw API error: ${response.status} - ${err}`);
        }
        return parse(response);
      } catch (err) {
        lastError = err;
        // Retry with next model only on model-level failures
        if (/model|not found|big-pickle|invalid/i.test(err.message)) continue;
        throw err;
      }
    }
    throw lastError;
  }

  async chatCompletion(options = {}) {
    return this._chatCompletionWithFallback(
      (model) => ({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: false,
        thinking: options.thinking ?? false,
      }),
      (response) => response.json()
    );
  }

  async *chatCompletionStream(options = {}) {
    const models = [this.config.model, ...FALLBACK_MODELS.filter(m => m !== this.config.model)];
    let lastError;
    for (const model of models) {
      try {
        this.abortController = new AbortController();
        const body = {
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: true,
          thinking: options.thinking ?? false,
        };
        const response = await this._fetchWithTimeout(`${this.config.gatewayUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: this._headers(),
          body: JSON.stringify(body),
          signal: this.abortController.signal,
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`OpenClaw API error: ${response.status} - ${err}`);
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') return;
                try { yield JSON.parse(data); } catch { /* skip invalid */ }
              }
            }
          }
          return; // success on first working model
        } finally {
          reader.releaseLock();
        }
      } catch (err) {
        lastError = err;
        if (/model|not found|big-pickle|invalid/i.test(err.message)) continue;
        throw err;
      }
    }
    throw lastError;
  }

  cancelStream() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async healthCheck() {
    const response = await this._fetchWithTimeout(`${this.config.gatewayUrl}/health`, {
      method: 'GET',
      headers: this._headers(),
    });
    if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
    return response.json();
  }

  async listModels() {
    const response = await this._fetchWithTimeout(`${this.config.gatewayUrl}/v1/models`, {
      method: 'GET',
      headers: this._headers(),
    });
    if (!response.ok) throw new Error(`List models failed: ${response.status}`);
    const data = await response.json();
    return (data.data || []).map((m) => m.id);
  }
}

export function createOpenClawClient(overrides = {}) {
  const gatewayUrl = (typeof process !== 'undefined' && process.env && process.env.OPENCLAW_GATEWAY_URL) || 'http://localhost:18789';
  const apiKey = (typeof process !== 'undefined' && process.env && process.env.OPENCLAW_API_KEY) || '';
  return new OpenClawClient({ gatewayUrl, apiKey, ...overrides });
}

let defaultClient = null;
export function getDefaultOpenClawClient() {
  if (!defaultClient) defaultClient = createOpenClawClient();
  return defaultClient;
}

export default OpenClawClient;
