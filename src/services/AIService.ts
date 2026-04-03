import {
  DEFAULT_GEMINI_TEXT_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  isLikelyResponsesEndpoint,
} from '../config/aiDefaults';

export type AIProvider = 'openai' | 'gemini' | null;

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface TextGenerationOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  model?: string;
}

interface TextGenerationResult {
  text: string;
  provider: AIProvider;
}

class AIServiceClass {
  private config: AIConfig = { provider: null, apiKey: '', model: '', baseUrl: '' };

  setProvider(provider: AIProvider, apiKey: string, model?: string, baseUrl?: string): void {
    this.config = { provider, apiKey, model: model || '', baseUrl: baseUrl || '' };
    this.saveConfig();
  }

  clearProvider(): void {
    this.config = { provider: null, apiKey: '', model: '', baseUrl: '' };
    this.saveConfig();
  }

  getActiveProvider(): AIProvider {
    return this.config.provider;
  }

  getApiKey(): string {
    return this.config.apiKey;
  }

  isConfigured(): boolean {
    return this.config.provider !== null && this.config.apiKey.length > 0;
  }

  loadConfig(): void {
    try {
      const saved = localStorage.getItem('digitalplanner_ai_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = {
          provider: parsed.provider || null,
          apiKey: parsed.apiKey || '',
          model: parsed.model || '',
          baseUrl: parsed.baseUrl || '',
        };
      }
    } catch (e) {
      console.error('AIService: Failed to load config', e);
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('digitalplanner_ai_config', JSON.stringify(this.config));
      localStorage.removeItem('contentplanner_ai_config');
    } catch (e) {
      console.error('AIService: Failed to save config', e);
    }
  }

  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    if (!this.isConfigured()) {
      throw new Error('Nincs AI szolgáltató beállítva. Menj az Integrációk menübe.');
    }

    if (this.config.provider === 'openai') {
      return this.generateTextOpenAI(options);
    }

    return this.generateTextGemini(options);
  }

  private async generateTextOpenAI(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const configuredUrl = this.config.baseUrl?.trim();
    if (configuredUrl && !isLikelyResponsesEndpoint(configuredUrl)) {
      throw new Error('A custom OpenAI URL-nak a Responses API végpontjára kell mutatnia.');
    }

    const url = configuredUrl || DEFAULT_OPENAI_BASE_URL;
    const modelName = options.model || this.config.model || DEFAULT_OPENAI_MODEL;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        input: [
          ...(options.systemPrompt
            ? [{ role: 'system', content: [{ type: 'input_text', text: options.systemPrompt }] }]
            : []),
          { role: 'user', content: [{ type: 'input_text', text: options.prompt }] },
        ],
        max_output_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API hiba');
    }

    const text =
      data.output_text ||
      data.output
        ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || [])
        ?.map((part: { text?: string }) => part.text || '')
        ?.join('') ||
      '';

    if (!text) {
      throw new Error('Üres választ küldött az OpenAI.');
    }

    return {
      text,
      provider: 'openai',
    };
  }

  private async generateTextGemini(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const modelName = options.model || this.config.model || DEFAULT_GEMINI_TEXT_MODEL;

    let url = this.config.baseUrl?.trim();
    if (!url) {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.config.apiKey}`;
    } else if (!url.includes('?key=')) {
      url = `${url}?key=${this.config.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: options.systemPrompt ? `${options.systemPrompt}\n\n${options.prompt}` : options.prompt }],
          }],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `Gemini API Error (${response.status})`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Üres választ küldött az AI.');
      }

      return {
        text,
        provider: 'gemini',
      };
    } catch (error: unknown) {
      console.error('Gemini API Error:', error);
      if (error instanceof Error) throw error;
      throw new Error('Unknown Gemini error');
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: 'Nincs API kulcs beállítva' };
    }

    try {
      await this.generateText({
        prompt: 'Válaszolj egyetlen szóval: működik',
        maxTokens: 10,
      });
      return {
        success: true,
        message: `${this.config.provider === 'openai' ? 'OpenAI' : 'Gemini'} sikeresen csatlakoztatva!`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Ismeretlen hiba',
      };
    }
  }

  getVoiceConfig(): { provider: AIProvider; apiKey: string; model?: string; baseUrl?: string } {
    return { ...this.config };
  }
}

export const AIService = new AIServiceClass();

if (typeof window !== 'undefined') {
  AIService.loadConfig();
}

export default AIService;
