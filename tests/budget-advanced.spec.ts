import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:5174';

type TxType = 'income' | 'expense';
type TxPeriod = 'oneTime' | 'daily' | 'weekly' | 'monthly';

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return toYmd(d);
}

function ymdMonthsAgo(months: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setMonth(d.getMonth() - months);
  return toYmd(d);
}

function addMonthsClamped(d: Date, months: number): Date {
  const date = new Date(d);
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() !== day) {
    date.setDate(0);
  }
  return date;
}

function advanceByPeriod(d: Date, period: TxPeriod): Date {
  const next = new Date(d);
  if (period === 'daily') {
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (period === 'weekly') {
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (period === 'monthly') {
    return addMonthsClamped(next, 1);
  }
  next.setDate(next.getDate() + 1);
  return next;
}

function countOccurrences(startYmd: string, period: TxPeriod): number {
  const [y, m, d] = startYmd.split('-').map(Number);
  let current = new Date(y, m - 1, d, 12, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  let count = 0;
  let guard = 0;

  while (current.getTime() <= end.getTime() && guard < 5000) {
    count += 1;
    guard += 1;
    current = advanceByPeriod(current, period);
  }

  return count;
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
  await page.waitForTimeout(600);
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

  const modalScrollable = modal.locator('.overflow-y-auto').first();
  await modalScrollable.evaluate(el => {
    (el as HTMLElement).scrollTop = 280;
  });
  await page.waitForTimeout(200);

  if (input.type === 'income') {
    await modal.locator('button:has-text("Income")').first().click({ force: true });
  } else {
    await modal.locator('button:has-text("Expense")').first().click({ force: true });
  }

  const periodSelect = modal.locator('select').nth(1);
  await periodSelect.selectOption(input.period);
}

async function submitModal(page: Page): Promise<void> {
  const modal = page.locator('.fixed:has(input[type="number"])').first();
  const modalScrollable = modal.locator('.overflow-y-auto').first();
  await modalScrollable.evaluate(el => {
    (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight;
  });
  await page.waitForTimeout(250);

  await modal.locator('div.p-6.border-t button').last().click({ force: true });
  await expect(modal).toBeHidden({ timeout: 10000 });
  await page.waitForTimeout(300);
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
  await page.waitForTimeout(1200);
}

async function exportBalanceStats(page: Page): Promise<{ income: number; expense: number; balance: number }> {
  await page.locator('button:has-text("Dashboard")').first().click();
  await page.waitForTimeout(1000);

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

async function deleteTransactionFromList(page: Page, description: string): Promise<void> {
  await openTransactionsTab(page);
  const title = page.locator(`h4:has-text("${description}")`).first();
  await expect(title).toBeVisible({ timeout: 5000 });

  const row = title.locator('xpath=ancestor::div[contains(@class,"p-4") and contains(@class,"justify-between")][1]');
  const deleteButton = row.locator('button').first();
  await row.hover();
  await expect(deleteButton).toBeVisible({ timeout: 5000 });

  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await deleteButton.evaluate((el) => (el as HTMLButtonElement).click());
  await page.waitForTimeout(900);

  await expect(page.locator(`h4:has-text("${description}")`)).toHaveCount(0, { timeout: 5000 });
}

async function editTransaction(page: Page, description: string, updates: { amount: string; time: string }): Promise<void> {
  await openTransactionsTab(page);
  await page.locator(`h4:has-text("${description}")`).first().click();
  await page.waitForTimeout(900);

  const modal = page.locator('.fixed:has(input[type="number"])').first();
  await modal.locator('input[type="number"]').first().fill(updates.amount);
  await modal.locator('input[type="time"]').first().fill(updates.time);

  await submitModal(page);
}

test.describe('Budget - Advanced Recurrence + Update Validation', () => {
  test('should create daily/weekly/monthly backdated flows and validate totals after updates', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 920 });

    await resetAppState(page);

    const dailyStart = ymdDaysAgo(6);
    const weeklyStart = ymdDaysAgo(28);
    const monthlyStart = ymdMonthsAgo(2);
    const updateItemDate = ymdDaysAgo(3);

    await createTransaction(page, {
      description: 'Advanced Daily Income',
      amount: '100',
      date: dailyStart,
      time: '08:00',
      type: 'income',
      period: 'daily',
    });

    await createTransaction(page, {
      description: 'Advanced Weekly Expense',
      amount: '50',
      date: weeklyStart,
      time: '07:30',
      type: 'expense',
      period: 'weekly',
    });

    await createTransaction(page, {
      description: 'Advanced Monthly Income',
      amount: '300',
      date: monthlyStart,
      time: '06:45',
      type: 'income',
      period: 'monthly',
    });

    await createTransaction(page, {
      description: 'Advanced Update Expense',
      amount: '40',
      date: updateItemDate,
      time: '09:10',
      type: 'expense',
      period: 'oneTime',
    });

    await editTransaction(page, 'Advanced Update Expense', {
      amount: '70',
      time: '11:35',
    });

    await openTransactionsTab(page);
    await expect(page.locator('h4:has-text("Advanced Update Expense")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=11:35').first()).toBeVisible({ timeout: 5000 });

    const expectedDaily = countOccurrences(dailyStart, 'daily');
    const expectedWeekly = countOccurrences(weeklyStart, 'weekly');
    const expectedMonthly = countOccurrences(monthlyStart, 'monthly');

    await expect(page.locator('h4:has-text("Advanced Daily Income")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h4:has-text("Advanced Weekly Expense")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h4:has-text("Advanced Monthly Income")').first()).toBeVisible({ timeout: 5000 });

    const expectedIncome = expectedDaily * 100 + expectedMonthly * 300;
    const expectedExpense = expectedWeekly * 50 + 70;
    const expectedBalance = expectedIncome - expectedExpense;

    const statsBeforeReload = await exportBalanceStats(page);
    expect(statsBeforeReload.income).toBeCloseTo(expectedIncome, 2);
    expect(statsBeforeReload.expense).toBeCloseTo(expectedExpense, 2);
    expect(statsBeforeReload.balance).toBeCloseTo(expectedBalance, 2);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await goToBudget(page);

    const statsAfterReload = await exportBalanceStats(page);
    expect(statsAfterReload.income).toBeCloseTo(expectedIncome, 2);
    expect(statsAfterReload.expense).toBeCloseTo(expectedExpense, 2);
    expect(statsAfterReload.balance).toBeCloseTo(expectedBalance, 2);

    await deleteTransactionFromList(page, 'Advanced Update Expense');

    const expectedExpenseAfterDelete = expectedExpense - 70;
    const expectedBalanceAfterDelete = expectedIncome - expectedExpenseAfterDelete;
    const statsAfterSingleDelete = await exportBalanceStats(page);

    expect(statsAfterSingleDelete.income).toBeCloseTo(expectedIncome, 2);
    expect(statsAfterSingleDelete.expense).toBeCloseTo(expectedExpenseAfterDelete, 2);
    expect(statsAfterSingleDelete.balance).toBeCloseTo(expectedBalanceAfterDelete, 2);
  });
});
