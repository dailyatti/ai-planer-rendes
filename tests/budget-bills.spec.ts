import { expect, test, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

const toYMD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

async function openBills(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await page.getByRole('button', { name: 'Budget Tracker', exact: true }).click();
  await page.getByRole('button', { name: 'Bills', exact: true }).click();
}

async function clearApp(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

async function fillPayableForm(
  page: Page,
  values: { description: string; amount: string; payee: string },
): Promise<void> {
  await page.getByPlaceholder('Example: Client Payment', { exact: true }).fill(values.description);
  await page.getByRole('spinbutton').fill(values.amount);
  await page
    .getByPlaceholder('e.g. Netflix, electricity provider', { exact: true })
    .fill(values.payee);
}

test.describe('Budget bills and subscriptions', () => {
  test.beforeEach(async ({ page }) => {
    await clearApp(page);
  });

  test('tracks an unpaid bill and realizes the expense only after payment', async ({ page }) => {
    await openBills(page);
    await page.getByRole('button', { name: 'Add bill', exact: true }).click();
    await fillPayableForm(page, {
      description: 'Electricity test bill',
      amount: '45',
      payee: 'Energy Test Co',
    });
    await page.getByRole('button', { name: 'Save Transaction', exact: true }).click();

    await expect(page.getByText('Electricity test bill', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark paid', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Mark paid', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Mark unpaid', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByRole('heading', { name: '$45', exact: true })).toBeVisible();
  });

  test('creates a future monthly auto-pay subscription without inflating realized expenses', async ({ page }) => {
    await openBills(page);
    await page.getByRole('button', { name: 'Add bill', exact: true }).click();
    await page
      .getByRole('button', {
        name: 'Subscription A recurring service or membership',
        exact: true,
      })
      .click();
    await fillPayableForm(page, {
      description: 'Cloud subscription test',
      amount: '30',
      payee: 'Cloud Test Co',
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator('input[type="date"]').fill(toYMD(tomorrow));
    await page
      .getByRole('checkbox', {
        name: 'Auto-pay The provider charges this amount automatically',
        exact: true,
      })
      .check();
    await page.getByRole('button', { name: 'Save Transaction', exact: true }).click();

    await expect(page.getByText('Cloud subscription test', { exact: true })).toBeVisible();
    await expect(page.getByText('Next occurrence', { exact: true })).toBeVisible();
    await expect(page.getByText('Auto-pay', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByRole('heading', { name: '$0', exact: true })).toHaveCount(4);
  });

  test('never deletes existing transactions during startup migration', async ({ page }) => {
    const seeded = JSON.stringify([
      {
        id: 'legacy-safe-transaction',
        description: 'Must survive migration',
        amount: -10,
        date: '2026-01-01',
        type: 'expense',
        category: 'other',
      },
    ]);

    await page.addInitScript((transactions) => {
      if (sessionStorage.getItem('__migration_test_seeded')) return;
      localStorage.setItem('planner-transactions', transactions);
      localStorage.removeItem('migration_1_1_82_purge');
      localStorage.removeItem('migration_1_1_91_nuclear');
      sessionStorage.setItem('__migration_test_seeded', 'true');
    }, seeded);

    await page.reload();

    const stored = await page.evaluate(() => localStorage.getItem('planner-transactions'));
    expect(stored).not.toBeNull();
    const migratedTransactions = JSON.parse(stored || '[]') as Array<{
      id: string;
      amount: number;
      date: string;
    }>;
    expect(migratedTransactions).toHaveLength(1);
    expect(migratedTransactions[0]).toMatchObject({
      id: 'legacy-safe-transaction',
      amount: -10,
    });
    expect(migratedTransactions[0].date.slice(0, 10)).toBe('2026-01-01');
    expect(await page.evaluate(() => localStorage.getItem('migration_1_1_82_purge')))
      .toBe('retired-without-deletion');
    expect(await page.evaluate(() => localStorage.getItem('migration_1_1_91_nuclear')))
      .toBe('retired-without-deletion');
  });
});
