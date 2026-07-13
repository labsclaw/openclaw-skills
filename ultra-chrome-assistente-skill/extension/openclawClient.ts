// openclawClient.ts - OpenClaw Gateway Integration
// Substitui Groq → usa gateway OpenClaw local

interface OpenClawConfig {
  gatewayUrl: string;
  apiKey?: string;
  timeout?: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  thinking?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface StreamChunk {
  choices: Array<{
    delta: Partial<ChatMessage>;
    finishReason: string | null;
  }>;
}

/**
 * OpenClaw Gateway Client
 * Comunica com gateway local em http://localhost:18789
 */
export class OpenClawClient {
  private config: Required<OpenClawConfig>;
  private abortController: AbortController | null = null;
  
  constructor(config: OpenClawConfig) {
    this.config = {
      gatewayUrl: config.gatewayUrl || 'http://localhost:18789',
      apiKey: config.apiKey || '',
      timeout: config.timeout || 120000
    };
  }
  
  /**
   * Chat completion não-streaming
   */
  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const url = `${this.config.gatewayUrl}/v1/chat/completions`;
    
    const body = {
      model: options.model || 'opencode/big-pickle',
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: false,
      thinking: options.thinking ?? false
    };
    
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenClaw API error: ${response.status} - ${error}`);
    }
    
    return response.json();
  }
  
  /**
   * Chat completion streaming
   */
  async *chatCompletionStream(options: ChatCompletionOptions): AsyncGenerator<StreamChunk, void, unknown> {
    const url = `${this.config.gatewayUrl}/v1/chat/completions`;
    
    const body = {
      model: options.model || 'opencode/big-pickle',
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
      thinking: options.thinking ?? false
    };
    
    this.abortController = new AbortController();
    
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal: this.abortController.signal
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenClaw API error: ${response.status} - ${error}`);
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
            try {
              yield JSON.parse(data);
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  /**
   * Cancelar streaming em andamento
   */
  cancelStream() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
  
  /**
   * Health check do gateway
   */
  async healthCheck(): Promise<{ status: string; models: string[] }> {
    const url = `${this.config.gatewayUrl}/health`;
    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Listar modelos disponíveis
   */
  async listModels(): Promise<string[]> {
    const url = `${this.config.gatewayUrl}/v1/models`;
    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`List models failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data?.map((m: any) => m.id) || [];
  }
  
  // ============================================
  // PRIVATE METHODS
  // ============================================
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    return headers;
  }
  
  private async fetchWithTimeout(
    url: string, 
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Factory function para criar cliente com config padrão
 */
export function createOpenClawClient(overrides?: Partial<OpenClawConfig>): OpenClawClient {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
  const apiKey = process.env.OPENCLAW_API_KEY;
  
  return new OpenClawClient({
    gatewayUrl,
    apiKey,
    ...overrides
  });
}

/**
 * Cliente singleton para uso em content scripts
 */
let defaultClient: OpenClawClient | null = null;

export function getDefaultOpenClawClient(): OpenClawClient {
  if (!defaultClient) {
    defaultClient = createOpenClawClient();
  }
  return defaultClient;
}

export default OpenClawClient;