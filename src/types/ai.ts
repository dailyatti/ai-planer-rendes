export type AIProvider = 'openai' | 'gemini' | null;

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  liveTextModel?: string;
  liveAudioModel?: string;
}
