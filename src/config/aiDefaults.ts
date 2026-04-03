export const DEFAULT_OPENAI_MODEL = 'gpt-5.4';
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1/responses';

export const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-flash-latest';
export const DEFAULT_GEMINI_PRO_MODEL = 'gemini-3-pro-preview';
export const DEFAULT_GEMINI_TEXT_LIVE_MODEL = 'gemini-3.1-flash-live-preview';
export const DEFAULT_GEMINI_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

export const isLikelyResponsesEndpoint = (url?: string) =>
  Boolean(url && /\/responses(?:\?|$)/.test(url));

export const isGeminiLiveModel = (model?: string) =>
  Boolean(model && /(live|native-audio)/i.test(model));

export const isGeminiNativeAudioLiveModel = (model?: string) =>
  Boolean(model && /native-audio/i.test(model));

export const isGeminiTextLiveModel = (model?: string) =>
  Boolean(model && /live/i.test(model) && !/native-audio/i.test(model));
