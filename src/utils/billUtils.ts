import type {
  BillPaymentStatus,
  ExpenseKind,
  Transaction,
  TransactionPeriod,
} from '../types/planner';

export type BillState = 'paid' | 'overdue' | 'dueToday' | 'dueSoon' | 'upcoming';

type BillLike = Pick<
  Transaction,
  'status' | 'paymentStatus' | 'dueDateYMD' | 'effectiveDateYMD' | 'date' | 'kind'
>;

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const normalizeExpenseKind = (value: unknown): ExpenseKind => {
  if (value === 'bill' || value === 'subscription') return value;
  return 'standard';
};

export const normalizePaymentStatus = (
  value: unknown,
  fallbackStatus?: Transaction['status'],
): BillPaymentStatus => {
  if (value === 'paid' || value === 'unpaid') return value;
  return fallbackStatus === 'pending' ? 'unpaid' : 'paid';
};

export const toLocalYMD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalYMD = (value: string): Date | null => {
  if (!YMD_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getBillDueDateYMD = (bill: BillLike): string => {
  if (typeof bill.dueDateYMD === 'string' && YMD_PATTERN.test(bill.dueDateYMD)) {
    return bill.dueDateYMD;
  }
  if (typeof bill.effectiveDateYMD === 'string' && YMD_PATTERN.test(bill.effectiveDateYMD)) {
    return bill.effectiveDateYMD;
  }
  if (bill.date instanceof Date && !Number.isNaN(bill.date.getTime())) {
    return toLocalYMD(bill.date);
  }
  if (typeof bill.date === 'string') {
    return bill.date.slice(0, 10);
  }
  return '';
};

export const getBillState = (bill: BillLike, todayYMD: string): BillState => {
  const paymentStatus = normalizePaymentStatus(bill.paymentStatus, bill.status);
  if (paymentStatus === 'paid' && bill.kind !== 'master') return 'paid';

  const dueYMD = getBillDueDateYMD(bill);
  const due = parseLocalYMD(dueYMD);
  const today = parseLocalYMD(todayYMD);
  if (!due || !today) return 'upcoming';

  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return 'overdue';
  if (days === 0) return 'dueToday';
  if (days <= 7) return 'dueSoon';
  return 'upcoming';
};

export const monthlyEquivalent = (
  amount: number,
  period: TransactionPeriod | undefined,
): number => {
  const absolute = Math.abs(amount);
  switch (period) {
    case 'daily':
      return absolute * 30.4375;
    case 'weekly':
      return absolute * (52 / 12);
    case 'yearly':
      return absolute / 12;
    case 'monthly':
      return absolute;
    default:
      return 0;
  }
};
