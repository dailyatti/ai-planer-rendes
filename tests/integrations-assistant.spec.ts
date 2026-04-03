import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { test, expect } from '@playwright/test';
import {
  DEFAULT_PERPLEXITY_BASE_URL,
  DEFAULT_PERPLEXITY_MODEL,
  normalizeAIConfig,
} from '../src/config/aiDefaults';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('normalizeAIConfig sets Perplexity defaults', () => {
  const config = normalizeAIConfig({
    provider: 'perplexity',
    apiKey: 'demo-key',
  });

  expect(config.provider).toBe('perplexity');
  expect(config.model).toBe(DEFAULT_PERPLEXITY_MODEL);
  expect(config.baseUrl).toBe(DEFAULT_PERPLEXITY_BASE_URL);
});

test('normalizeAIConfig migrates legacy provider configs to Perplexity', () => {
  const migrated = normalizeAIConfig({
    provider: null,
    apiKey: 'legacy-key',
  });

  expect(migrated.provider).toBe('perplexity');
  expect(migrated.model).toBe(DEFAULT_PERPLEXITY_MODEL);
  expect(migrated.baseUrl).toBe(DEFAULT_PERPLEXITY_BASE_URL);
});

test('IntegrationsView is Perplexity-only', async () => {
  const source = await fs.readFile(
    path.join(__dirname, '..', 'src', 'components', 'views', 'IntegrationsView.tsx'),
    'utf8',
  );

  expect(source).toContain('Perplexity Sonar Pro');
});
