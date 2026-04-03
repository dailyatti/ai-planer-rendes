import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { test, expect } from '@playwright/test';
import {
  DEFAULT_GEMINI_AUDIO_LIVE_MODEL,
  DEFAULT_GEMINI_TEXT_LIVE_MODEL,
  DEFAULT_GEMINI_TEXT_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  normalizeAIConfig,
} from '../src/config/aiDefaults';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('normalizeAIConfig keeps Gemini text and live models separated', () => {
  const geminiConfig = normalizeAIConfig({
    provider: 'gemini',
    apiKey: 'demo-key',
    model: DEFAULT_GEMINI_TEXT_MODEL,
    liveTextModel: DEFAULT_GEMINI_TEXT_LIVE_MODEL,
    liveAudioModel: DEFAULT_GEMINI_AUDIO_LIVE_MODEL,
  });

  expect(geminiConfig.model).toBe(DEFAULT_GEMINI_TEXT_MODEL);
  expect(geminiConfig.liveTextModel).toBe(DEFAULT_GEMINI_TEXT_LIVE_MODEL);
  expect(geminiConfig.liveAudioModel).toBe(DEFAULT_GEMINI_AUDIO_LIVE_MODEL);
});

test('normalizeAIConfig migrates legacy live-only Gemini models away from text generation', () => {
  const migratedConfig = normalizeAIConfig({
    provider: 'gemini',
    apiKey: 'demo-key',
    model: DEFAULT_GEMINI_AUDIO_LIVE_MODEL,
  });

  expect(migratedConfig.model).toBe(DEFAULT_GEMINI_TEXT_MODEL);
  expect(migratedConfig.liveAudioModel).toBe(DEFAULT_GEMINI_AUDIO_LIVE_MODEL);
  expect(migratedConfig.liveTextModel).toBe(DEFAULT_GEMINI_TEXT_LIVE_MODEL);

  const openAiConfig = normalizeAIConfig({
    provider: 'openai',
    apiKey: 'demo-key',
  });

  expect(openAiConfig.model).toBe(DEFAULT_OPENAI_MODEL);
  expect(openAiConfig.baseUrl).toBe(DEFAULT_OPENAI_BASE_URL);
});

test('IntegrationsView uses localization keys for advanced assistant labels', async () => {
  const source = await fs.readFile(
    path.join(__dirname, '..', 'src', 'components', 'views', 'IntegrationsView.tsx'),
    'utf8',
  );

  expect(source).not.toContain('Haladó paraméterek');
  expect(source).not.toContain('Továbbfejlesztett bezárása');
  expect(source).not.toContain('Modell Név Felülírása');
  expect(source).toContain("t('integrations.advancedParameters')");
  expect(source).toContain("t('integrations.showAdvanced')");
  expect(source).toContain("t('integrations.textModelLabel')");
  expect(source).toContain("t('integrations.liveTextModelLabel')");
  expect(source).toContain("t('integrations.liveAudioModelLabel')");
});
