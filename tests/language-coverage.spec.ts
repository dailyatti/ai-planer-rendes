import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import ts from 'typescript';
import { expect, test } from '@playwright/test';
import {
  LANGUAGE_FLAGS,
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
} from '../src/contexts/LanguageContext';

const BASE_URL = 'http://localhost:5174';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('all advertised languages are accepted and have names and flags', () => {
  expect(new Set(SUPPORTED_LANGUAGES)).toEqual(new Set(Object.keys(LANGUAGE_NAMES)));
  expect(new Set(SUPPORTED_LANGUAGES)).toEqual(new Set(Object.keys(LANGUAGE_FLAGS)));
  expect(SUPPORTED_LANGUAGES).toContain('ko');
});

test('every translation key has complete English, Hungarian and German text', async () => {
  const sourcePath = path.join(__dirname, '..', 'src', 'contexts', 'LanguageContext.tsx');
  const source = await fs.readFile(sourcePath, 'utf8');
  const ast = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let translations: ts.ObjectLiteralExpression | undefined;

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node)
      && node.name.getText(ast) === 'translations'
      && node.initializer
      && ts.isObjectLiteralExpression(node.initializer)
    ) {
      translations = node.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);

  expect(translations).toBeDefined();
  const missing: string[] = [];
  for (const property of translations?.properties || []) {
    if (!ts.isPropertyAssignment(property) || !ts.isObjectLiteralExpression(property.initializer)) continue;
    const languages = new Set(
      property.initializer.properties
        .filter(ts.isPropertyAssignment)
        .map((entry) => entry.name.getText(ast).replace(/^['"]|['"]$/g, '')),
    );
    for (const language of ['en', 'hu', 'de']) {
      if (!languages.has(language)) {
        missing.push(`${property.name.getText(ast)}:${language}`);
      }
    }
  }

  expect(missing).toEqual([]);
});

test('other languages remain functional through the English fallback', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('language', 'ko');
  });
  await page.reload();

  await page.getByRole('button', { name: 'Integrations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'DeepSeek V4', exact: true })).toBeVisible();
  await expect(page.getByText('1M context', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
});

test('the DeepSeek integration has native German copy', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('language', 'de');
  });
  await page.reload();

  await page.getByRole('button', { name: 'Integrationen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'DeepSeek V4', exact: true })).toBeVisible();
  await expect(page.getByText('1M Kontext', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Verbinden', exact: true }).click();
  await expect(page.getByText('Assistentenzugriff', { exact: true })).toBeVisible();
  await expect(page.getByText('Budget, Rechnungen und Abonnements', { exact: true })).toBeVisible();
});
