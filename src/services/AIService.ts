import {
  DEFAULT_PERPLEXITY_BASE_URL,
  DEFAULT_PERPLEXITY_MODEL,
  EMPTY_AI_CONFIG,
  normalizeAIConfig,
} from '../config/aiDefaults';
import { AIConfig, AIProvider } from '../types/ai';

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
  private config: AIConfig = { ...EMPTY_AI_CONFIG };

  setProvider(config: AIConfig): void {
    this.config = normalizeAIConfig(config);
    this.saveConfig();
  }

  clearProvider(): void {
    this.config = { ...EMPTY_AI_CONFIG };
    this.saveConfig();
  }

  getActiveProvider(): AIProvider {
    return this.config.provider;
  }

  getApiKey(): string {
    return this.config.apiKey;
  }

  isConfigured(): boolean {
    return this.config.provider === 'perplexity' && this.config.apiKey.length > 0;
  }

  loadConfig(): void {
    try {
      const saved = localStorage.getItem('digitalplanner_ai_config');
      if (saved) {
        this.config = normalizeAIConfig(JSON.parse(saved));
      }
    } catch (error) {
      console.error('AIService: Failed to load config', error);
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('digitalplanner_ai_config', JSON.stringify(this.config));
      localStorage.removeItem('contentplanner_ai_config');
    } catch (error) {
      console.error('AIService: Failed to save config', error);
    }
  }

  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    if (!this.isConfigured()) {
      throw new Error('No AI provider is configured. Open Integrations to connect Perplexity.');
    }

    return this.generateTextPerplexity(options);
  }

  private async generateTextPerplexity(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const url = this.config.baseUrl?.trim() || DEFAULT_PERPLEXITY_BASE_URL;
    const modelName = options.model || this.config.model || DEFAULT_PERPLEXITY_MODEL;
    const messages = [
      ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
      { role: 'user', content: options.prompt },
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        max_tokens: options.maxTokens ?? 1000,
        temperature: options.temperature ?? 0.2,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Perplexity API error');
    }

    const text = data.choices?.[0]?.message?.content || '';
    if (!text) {
      throw new Error('Perplexity returned an empty response.');
    }

    return {
      text,
      provider: 'perplexity',
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: 'No API key is configured.' };
    }

    try {
      await this.generateText({
        prompt: 'Reply with one word: ready',
        maxTokens: 32,
        temperature: 0,
      });

      return {
        success: true,
        message: 'Perplexity connected successfully.',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getVoiceConfig(): AIConfig {
    return { ...this.config };
  }
}

export const AIService = new AIServiceClass();

if (typeof window !== 'undefined') {
  AIService.loadConfig();
}

export default AIService;
