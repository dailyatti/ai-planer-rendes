import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:5174';

type TxType = 'income' | 'expense';
type TxPeriod = 'oneTime' | 'daily' | 'weekly' | 'monthly';

type MockClockWindow = Window & typeof globalThis & {
  __setMockNow?: (iso: string) => void;
};

function toYmdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

async function installMockClock(page: Page, now: Date): Promise<void> {
  const initialIso = now.toISOString();
  await page.addInitScript((startIso: string) => {
    const RealDate = Date;
    const storageKey = '__mock_now_iso';
    const persistedIso = window.localStorage.getItem(storageKey);
    let currentMs = new RealDate(persistedIso ?? startIso).getTime();

    class MockDate extends RealDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) {
          super(currentMs);
          return;
        }
        super(...args);
      }

      static now(): number {
        return currentMs;
      }
    }

    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;
    MockDate.prototype = RealDate.prototype;

    const mockWindow = window as MockClockWindow;
    mockWindow.__setMockNow = (iso: string) => {
      currentMs = new RealDate(iso).getTime();
      window.localStorage.setItem(storageKey, iso);
    };

    globalThis.Date = MockDate as unknown as DateConstructor;
  }, initialIso);
}

async function setMockNow(page: Page, now: Date): Promise<void> {
  const iso = now.toISOString();
  await page.evaluate((nextIso: string) => {
    const mockWindow = window as MockClockWindow;
    if (!mockWindow.__setMockNow) {
      throw new Error('Mock clock is not installed.');
    }
    mockWindow.__setMockNow(nextIso);
  }, iso);
}

async function goToBudget(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const budgetNav = page.locator('text=Budget Tracker').first();
  if (await budgetNav.isVisible({ timeout: 3000 }).catch(() => false)) {
    await budgetNav.click();
  }
  await page.waitForTimeout(1000);
}

async function resetAppState(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await goToBudget(page);
}

async function openAddModal(page: Page, type: TxType): Promise<void> {
  const label = type === 'income' ? 'Add Income' : 'Add Expense';
  const quickBtn = page.locator(`text=${label}`).first();
  if (await quickBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await quickBtn.click();
  } else {
    await page.locator('button:has-text("Add")').first().click();
  }
  await page.waitForTimeout(500);
}

async function fillModal(page: Page, input: {
  description: string;
  amount: string;
  date: string;
  time: string;
  type: TxType;
  period: TxPeriod;
}): Promise<void> {
  const modal = page.locator('.fixed:has(input[type="number"])').first();
  await expect(modal).toBeVisible({ timeout: 10000 });

  await modal.locator('input').first().fill(input.description);
  await modal.locator('input[type="number"]').first().fill(input.amount);
  await modal.locator('input[type="date"]').first().fill(input.date);
  await modal.locator('input[type="time"]').first().fill(input.time);

  const scrollable = modal.locator('.overflow-y-auto').first();
  await scrollable.evaluate(el => {
    (el as HTMLElement).scrollTop = 280;
  });
  await page.waitForTimeout(150);

  if (input.type === 'income') {
    await modal.locator('button:has-text("Income")').first().click({ force: true });
  } else {
    await modal.locator('button:has-text("Expense")').first().click({ force: true });
  }

  await modal.locator('select').nth(1).selectOption(input.period);
}

async function submitModal(page: Page): Promise<void> {
  const modal = page.locator('.fixed:has(input[type="number"])').first();
  const scrollable = modal.locator('.overflow-y-auto').first();
  await scrollable.evaluate(el => {
    (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight;
  });
  await page.waitForTimeout(200);

  await modal.locator('div.p-6.border-t button').last().click({ force: true });
  await expect(modal).toBeHidden({ timeout: 10000 });
  await page.waitForTimeout(250);
}

async function createTransaction(page: Page, input: {
  description: string;
  amount: string;
  date: string;
  time: string;
  type: TxType;
  period: TxPeriod;
}): Promise<void> {
  await openAddModal(page, input.type);
  await fillModal(page, input);
  await submitModal(page);
}

async function openTransactionsTab(page: Page): Promise<void> {
  await page.locator('button:has-text("Transactions")').first().click();
  await page.waitForTimeout(900);
}

async function exportBalanceStats(page: Page): Promise<{ income: number; expense: number; balance: number }> {
  await page.locator('button:has-text("Dashboard")').first().click();
  await page.waitForTimeout(800);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('button:has-text("Export")').first().click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  expect(downloadPath).not.toBeNull();

  const exportedRaw = fs.readFileSync(downloadPath as string, 'utf8');
  const exported = JSON.parse(exportedRaw) as {
    balanceStats: { income: number; expense: number; balance: number };
  };

  return exported.balanceStats;
}

test.describe('Budget - Minute Precision Recurrence Boundary', () => {
  test('daily income should only include today after due minute is reached', async ({ page }) => {
    test.setTimeout(120000);

    const beforeDue = new Date(2026, 2, 6, 10, 16, 0, 0);
    const dueMoment = new Date(2026, 2, 6, 10, 18, 0, 0);
    const startYmd = toYmdLocal(addDays(beforeDue, -1));

    await installMockClock(page, beforeDue);
    await resetAppState(page);

    await createTransaction(page, {
      description: 'Minute Boundary Income',
      amount: '100',
      date: startYmd,
      time: '10:18',
      type: 'income',
      period: 'daily',
    });

    await openTransactionsTab(page);
    await expect(page.locator('h4:has-text("Minute Boundary Income")')).toHaveCount(1);

    const beforeStats = await exportBalanceStats(page);
    expect(beforeStats.income).toBeCloseTo(100, 2);

    await setMockNow(page, dueMoment);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await goToBudget(page);

    await openTransactionsTab(page);
    await expect(page.locator('h4:has-text("Minute Boundary Income")')).toHaveCount(1);
    await expect(page.locator('text=(2)').first()).toBeVisible({ timeout: 5000 });

    const afterStats = await exportBalanceStats(page);
    expect(afterStats.income).toBeCloseTo(200, 2);
  });

  test('daily expense should only include today after due minute is reached', async ({ page }) => {
    test.setTimeout(120000);

    const beforeDue = new Date(2026, 2, 6, 10, 16, 0, 0);
    const dueMoment = new Date(2026, 2, 6, 10, 18, 0, 0);
    const startYmd = toYmdLocal(addDays(beforeDue, -1));

    await installMockClock(page, beforeDue);
    await resetAppState(page);

    await createTransaction(page, {
      description: 'Minute Boundary Expense',
      amount: '40',
      date: startYmd,
      time: '10:18',
      type: 'expense',
      period: 'daily',
    });

    await openTransactionsTab(page);
    await expect(page.locator('h4:has-text("Minute Boundary Expense")')).toHaveCount(1);

    const beforeStats = await exportBalanceStats(page);
    expect(beforeStats.expense).toBeCloseTo(40, 2);

    await setMockNow(page, dueMoment);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await goToBudget(page);

    await openTransactionsTab(page);
    await expect(page.locator('h4:has-text("Minute Boundary Expense")')).toHaveCount(1);
    await expect(page.locator('text=(2)').first()).toBeVisible({ timeout: 5000 });

    const afterStats = await exportBalanceStats(page);
    expect(afterStats.expense).toBeCloseTo(80, 2);
  });
});
