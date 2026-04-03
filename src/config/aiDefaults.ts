import { AIConfig } from '../types/ai';

export const DEFAULT_PERPLEXITY_MODEL = 'sonar-pro';
export const DEFAULT_PERPLEXITY_BASE_URL = 'https://api.perplexity.ai/chat/completions';

export const EMPTY_AI_CONFIG: AIConfig = {
  provider: null,
  apiKey: '',
  model: '',
  baseUrl: '',
};

export const normalizeAIConfig = (config?: Partial<AIConfig> | null): AIConfig => {
  const provider = config?.provider ?? null;
  const apiKey = config?.apiKey?.trim() || '';
  const model = config?.model?.trim() || '';
  const baseUrl = config?.baseUrl?.trim() || '';

  if (provider === 'perplexity') {
    return {
      ...EMPTY_AI_CONFIG,
      provider,
      apiKey,
      model: model || DEFAULT_PERPLEXITY_MODEL,
      baseUrl: baseUrl || DEFAULT_PERPLEXITY_BASE_URL,
    };
  }

  // Legacy migration: keep existing key but switch the provider to Perplexity.
  if (apiKey) {
    return {
      ...EMPTY_AI_CONFIG,
      provider: 'perplexity',
      apiKey,
      model: model || DEFAULT_PERPLEXITY_MODEL,
      baseUrl: baseUrl || DEFAULT_PERPLEXITY_BASE_URL,
    };
  }

  return { ...EMPTY_AI_CONFIG };
};
