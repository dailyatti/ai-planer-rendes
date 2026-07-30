import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { test, expect } from '@playwright/test';
import {
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
  normalizeAIConfig,
} from '../src/config/aiDefaults';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('normalizeAIConfig sets DeepSeek V4 defaults', () => {
  const config = normalizeAIConfig({
    provider: 'deepseek',
    apiKey: 'demo-key',
  });

  expect(config.provider).toBe('deepseek');
  expect(config.model).toBe(DEFAULT_DEEPSEEK_MODEL);
  expect(config.baseUrl).toBe(DEFAULT_DEEPSEEK_BASE_URL);
  expect(config.permissions).toEqual({
    plannerContext: true,
    financialContext: true,
    invoicingContext: true,
    writeActions: true,
  });
});

test('normalizeAIConfig does not reuse a retired provider key', () => {
  const migrated = normalizeAIConfig({
    provider: null,
    apiKey: 'legacy-key',
  });

  expect(migrated.provider).toBeNull();
  expect(migrated.apiKey).toBe('');
  expect(migrated.model).toBe('');
  expect(migrated.baseUrl).toBe('');
});

test('IntegrationsView exposes only current DeepSeek V4 models', async () => {
  const source = await fs.readFile(
    path.join(__dirname, '..', 'src', 'components', 'views', 'IntegrationsView.tsx'),
    'utf8',
  );

  expect(source).toContain("t('integrations.deepseekName')");
  expect(source).toContain("t('integrations.deepseekPro')");
  expect(source).toContain("t('integrations.deepseekFlash')");
  expect(source).toContain("t('integrations.permissionPlanner')");
  expect(source).toContain("t('integrations.permissionFinancial')");
  expect(source).toContain("t('integrations.permissionWrite')");
});
