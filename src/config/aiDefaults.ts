import { AIConfig, AIPermissions } from '../types/ai';

export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-pro';
export const FAST_DEEPSEEK_MODEL = 'deepseek-v4-flash';
export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com/chat/completions';

export const DEFAULT_AI_PERMISSIONS: AIPermissions = {
  plannerContext: true,
  financialContext: true,
  invoicingContext: true,
  writeActions: true,
};

export const EMPTY_AI_CONFIG: AIConfig = {
  provider: null,
  apiKey: '',
  model: '',
  baseUrl: '',
  permissions: { ...DEFAULT_AI_PERMISSIONS },
};

export const normalizeAIConfig = (config?: Partial<AIConfig> | null): AIConfig => {
  const provider = config?.provider ?? null;
  const apiKey = config?.apiKey?.trim() || '';
  const model = config?.model?.trim() || '';
  const baseUrl = config?.baseUrl?.trim() || '';

  if (provider === 'deepseek') {
    return {
      ...EMPTY_AI_CONFIG,
      provider,
      apiKey,
      model: model || DEFAULT_DEEPSEEK_MODEL,
      baseUrl: baseUrl || DEFAULT_DEEPSEEK_BASE_URL,
      permissions: {
        ...DEFAULT_AI_PERMISSIONS,
        ...config?.permissions,
      },
    };
  }

  // Keys from retired or unknown providers are intentionally not reused.
  return { ...EMPTY_AI_CONFIG };
};
