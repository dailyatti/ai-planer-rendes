import { AIConfig } from '../types/ai';

export const DEFAULT_OPENAI_MODEL = 'gpt-5.4';
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1/responses';

export const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-3.1-pro-preview';
export const DEFAULT_GEMINI_PRO_MODEL = DEFAULT_GEMINI_TEXT_MODEL;
export const DEFAULT_GEMINI_TEXT_LIVE_MODEL = 'gemini-3.1-flash-live-preview';
export const DEFAULT_GEMINI_AUDIO_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

export const EMPTY_AI_CONFIG: AIConfig = {
  provider: null,
  apiKey: '',
  model: '',
  baseUrl: '',
  liveTextModel: '',
  liveAudioModel: '',
};

export const isLikelyResponsesEndpoint = (url?: string) =>
  Boolean(url && /\/responses(?:\?|$)/.test(url));

export const isGeminiLiveModel = (model?: string) =>
  Boolean(model && /(live|native-audio)/i.test(model));

export const isGeminiNativeAudioLiveModel = (model?: string) =>
  Boolean(model && /native-audio/i.test(model));

export const isGeminiTextLiveModel = (model?: string) =>
  Boolean(model && /live/i.test(model) && !/native-audio/i.test(model));

export const normalizeAIConfig = (config?: Partial<AIConfig> | null): AIConfig => {
  const provider = config?.provider ?? null;
  const apiKey = config?.apiKey?.trim() || '';
  const model = config?.model?.trim() || '';
  const baseUrl = config?.baseUrl?.trim() || '';
  const liveTextModel = config?.liveTextModel?.trim() || '';
  const liveAudioModel = config?.liveAudioModel?.trim() || '';

  if (provider === 'openai') {
    return {
      ...EMPTY_AI_CONFIG,
      provider,
      apiKey,
      model: model || DEFAULT_OPENAI_MODEL,
      baseUrl: baseUrl || DEFAULT_OPENAI_BASE_URL,
    };
  }

  if (provider === 'gemini') {
    const legacyLiveTextModel = isGeminiTextLiveModel(model) ? model : '';
    const legacyLiveAudioModel = isGeminiNativeAudioLiveModel(model) ? model : '';

    return {
      ...EMPTY_AI_CONFIG,
      provider,
      apiKey,
      model: isGeminiLiveModel(model) ? DEFAULT_GEMINI_TEXT_MODEL : (model || DEFAULT_GEMINI_TEXT_MODEL),
      baseUrl,
      liveTextModel: liveTextModel || legacyLiveTextModel || DEFAULT_GEMINI_TEXT_LIVE_MODEL,
      liveAudioModel: liveAudioModel || legacyLiveAudioModel || DEFAULT_GEMINI_AUDIO_LIVE_MODEL,
    };
  }

  return { ...EMPTY_AI_CONFIG };
};
