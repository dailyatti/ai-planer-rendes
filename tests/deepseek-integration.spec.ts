import { expect, test } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

test('DeepSeek can use permitted app context and create a payable', async ({ page }) => {
  let requestBody: Record<string, unknown> | null = null;

  await page.route('https://api.deepseek.com/chat/completions', async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'I added the subscription.',
              actions: [{
                type: 'create_payable',
                data: {
                  description: 'DeepSeek test subscription',
                  amount: 19,
                  currency: 'USD',
                  kind: 'subscription',
                  payee: 'Test Cloud',
                  dueDate: '2026-08-15',
                  period: 'monthly',
                  autoPay: true,
                },
              }],
            }),
          },
        }],
      }),
    });
  });

  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole('button', { name: 'Integrations', exact: true }).click();
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.getByPlaceholder('sk-...', { exact: true }).fill('sk-test-key');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.getByTitle('DeepSeek V4').click();
  const chatInput = page.locator('input[type="text"]').last();
  await chatInput.fill('Please add my cloud service as a subscription.');
  await chatInput.press('Enter');

  await expect(page.getByText('Created payable: DeepSeek test subscription (19 USD).', { exact: true }))
    .toBeVisible();

  expect(requestBody).toMatchObject({
    model: 'deepseek-v4-pro',
    thinking: { type: 'enabled' },
    reasoning_effort: 'high',
  });
  const messages = requestBody?.messages as Array<{ role: string; content: string }>;
  expect(messages[0].content).toContain('Planner summary:');
  expect(messages[0].content).toContain('Financial summary:');
  expect(messages[0].content).toContain('Invoicing summary:');

  await page.getByRole('button', { name: 'Budget Tracker', exact: true }).click();
  await page.getByRole('button', { name: 'Bills', exact: true }).click();
  await expect(page.getByText('DeepSeek test subscription', { exact: true })).toBeVisible();
  await expect(page.getByText('Auto-pay', { exact: true }).first()).toBeVisible();
});
