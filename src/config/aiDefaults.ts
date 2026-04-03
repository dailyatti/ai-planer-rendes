export const DEFAULT_OPENAI_MODEL = 'gpt-5.4';
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1/responses';

export const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-flash-latest';
export const DEFAULT_GEMINI_PRO_MODEL = 'gemini-3-pro-preview';
export const DEFAULT_GEMINI_LIVE_MODEL = 'gemini-3.1-flash-live-preview';

export const isLikelyResponsesEndpoint = (url?: string) =>
  Boolean(url && /\/responses(?:\?|$)/.test(url));
