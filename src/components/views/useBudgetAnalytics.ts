// src/components/views/useBudgetAnalytics.ts
import { useCallback, useMemo } from 'react';
import { Transaction } from '../../types/planner';

/**
 * useBudgetAnalytics Hook - PhD Level Financial Engine (Pure Version)
 * Refactored for O(1) performance on Daily/Weekly frequencies and 
 * Date-Drift prevention using Anchor Date logic.
 * 
 * PURE API: Does not accept translation functions or UI config.
 * Returns raw data keyed by category IDs; consumers map to UI labels.
 */
export const useBudgetAnalytics = (
    transactions: Transaction[],
    currency: string,
    safeConvert: (amount: number, fromCurrency: string, toCurrency: string) => number,
    projectionYears: number = 1
) => {


    // --- BASIC HELPERS ---

    // --- BASIC HELPERS ---

    const toDateSafe = (d: Date | string | number): Date | null => {
        if (d instanceof Date) return Number.isNaN(d.getTime()) ? null : d;
        // Parse YMD strings as local time (noon) to avoid UTC drift
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
            const [y, m, day] = d.split('-').map(Number);
            return new Date(y, m - 1, day, 12, 0, 0, 0);
        }
        const dt = new Date(d);
        return Number.isNaN(dt.getTime()) ? null : dt;
    };

    const endOfToday = (): Date => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        return now;
    };

    const ensureCurrency = (c?: string) => (c && c.trim() ? c : 'USD');

    const isMaster = (tr: Transaction) => (
        tr.kind === 'master' &&
        tr.recurring === true &&
        tr.period !== 'oneTime'
    );

    // ... existing helpers ...

    // Derived Key Metrics (re-inserting to ensure scope availability if needed, but primarily for the return object update below)
    // Note: This replacement chunk spans widely to update the TOP zero-guard return. The bottom calculation needs to be updated too.


    const isFuture = (tr: Transaction, now: Date) => {
        const dt = toDateSafe((tr as any).effectiveDateYMD || tr.date);
        if (!dt) return false;
        return dt.getTime() > now.getTime();
    };

    /**
     * PH-D LEVEL DATE MATH: Prevents "Feb 28 drift".
     * If user creates on the 31st, it stays on the 31st (or end of month) forever.
     */
    const addMonthsWithAnchor = (anchorDate: Date, monthsToAdd: number): Date => {
        const result = new Date(anchorDate);
        const originalDay = anchorDate.getDate();
        result.setMonth(result.getMonth() + monthsToAdd);

        // If the month ended before the original day (e.g. Jan 31 + 1 month -> Mar 3 drift)
        // we snap it back to the last day of the intended month.
        if (result.getDate() !== originalDay) {
            result.setDate(0);
        }
        return result;
    };

    /**
     * PH-D LEVEL HIGH PERFORMANCE RECURRENCE ENGINE
     * Goal: O(1) performance for Daily/Weekly to prevent UI freezes on long projections.
     */
    const calculateOccurrences = useCallback((tr: Transaction, start: Date, end: Date): number => {
        // This helper is only for recurring master series; inconsistent inputs must not create phantom hits.
        if (!tr.recurring || tr.period === 'oneTime') return 0;

        const trDate = toDateSafe(tr.date);
        if (!trDate) return 0;

        // Boundary Check: If the recurring series starts after our window ends, 0 hits.
        if (trDate.getTime() > end.getTime()) return 0;

        // Effective start is the junction of (transaction start) and (window start).
        const junctionStart = new Date(Math.max(trDate.getTime(), start.getTime()));

        // If junction is past the window end, 0 hits.
        if (junctionStart.getTime() > end.getTime()) return 0;

        switch (tr.period) {
            // O(1) Mathematical Logic for Linear Recurrences
            case 'daily': {
                const diffTime = end.getTime() - junctionStart.getTime();
                return Math.floor(diffTime / (24 * 3600 * 1000)) + 1;
            }
            case 'weekly': {
                const diffTime = end.getTime() - junctionStart.getTime();
                return Math.floor(diffTime / (7 * 24 * 3600 * 1000)) + 1;
            }

            // Optimized Traversal for Non-Linear Calendar Recurrences
            case 'monthly': {
                let count = 0;
                // Fast-Forward Logic: Calculate initial month skip to avoid looping from transaction creation date
                let monthsToSkip = 0;
                if (junctionStart.getTime() > trDate.getTime()) {
                    const yearDiff = junctionStart.getFullYear() - trDate.getFullYear();
                    const monthDiff = junctionStart.getMonth() - trDate.getMonth();
                    // We step back 1 month to ensure we don't skip the landing month's occurrence
                    monthsToSkip = Math.max(0, yearDiff * 12 + monthDiff - 1);
                }

                let current = addMonthsWithAnchor(trDate, monthsToSkip);
                let iterations = 0;
                while (current.getTime() <= end.getTime() && iterations < 1200) { // 100 year hard cap
                    if (current.getTime() >= start.getTime()) {
                        count++;
                    }
                    iterations++;
                    current = addMonthsWithAnchor(trDate, monthsToSkip + iterations);
                }
                return count;
            }

            case 'yearly': {
                let count = 0;
                const yearsToSkip = Math.max(0, junctionStart.getFullYear() - trDate.getFullYear() - 1);

                let current = new Date(trDate);
                current.setFullYear(trDate.getFullYear() + yearsToSkip);

                let iterations = 0;
                while (current.getTime() <= end.getTime() && iterations < 100) {
                    if (current.getTime() >= start.getTime()) {
                        count++;
                    }
                    iterations++;
                    current = new Date(trDate);
                    current.setFullYear(trDate.getFullYear() + yearsToSkip + iterations);
                }
                return count;
            }
            default: return 1;
        }
    }, []); // Removed dependency on toDateSafe etc as they are defined inside/outside but not refs. Wait, addMonthsWithAnchor is const.

    const absToView = useCallback((amount: number, fromCurrency: string) => {
        const abs = Math.abs(amount);
        return safeConvert(abs, ensureCurrency(fromCurrency), currency);
    }, [currency, safeConvert]);

    /**
     * sumByType - Unified volume calculator
     * @param isProjectionMode If true, calculates FUTURE FLOW. If false, calculates REALIZED STOCK (Balance).
     */
    const sumByType = useCallback(
        (txs: Transaction[], type: 'income' | 'expense', isProjectionMode: boolean = false) => {
            if (!txs || txs.length === 0) return 0;
            let total = 0;
            const now = endOfToday();
            const projEnd = new Date(now.getFullYear() + projectionYears, now.getMonth(), now.getDate());

            txs.filter(tr => tr.type === type).forEach(tr => {
                const from = ensureCurrency(tr.currency);
                const baseAmount = absToView(tr.amount, from);

                if (isMaster(tr)) {
                    if (isProjectionMode) {
                        // Volume cards: Project flow from TODAY until window end
                        const occurrences = calculateOccurrences(tr, now, projEnd);
                        total += baseAmount * occurrences;
                    }
                    // Masters never contribute to current cash balance (only history items do)
                } else {
                    // Prefer effectiveDateYMD (drift-proof) over date
                    const trDate = toDateSafe((tr as any).effectiveDateYMD || tr.date);
                    if (!trDate) return;

                    if (isProjectionMode) {
                        // Volume cards: Include standalone planned items in [now, projEnd]
                        if (trDate.getTime() >= now.getTime() && trDate.getTime() <= projEnd.getTime()) {
                            total += baseAmount;
                        }
                    } else {
                        // Cash balance: Include all history items in the past
                        if (trDate.getTime() <= now.getTime()) {
                            total += baseAmount;
                        }
                    }
                }
            });
            return total;
        },
        [absToView, projectionYears, calculateOccurrences]
    );

    const activeTransactions = useMemo(
        () => (Array.isArray(transactions) ? transactions.filter(tr => tr.status !== 'cancelled') : []),
        [transactions]
    );

    // --- MEMOIZED DATA SETS ---

    const { totalIncome, totalExpense, balance } = useMemo(() => {
        if (activeTransactions.length === 0) {
            return { totalIncome: 0, totalExpense: 0, balance: 0 };
        }

        const realizedIncome = sumByType(activeTransactions, 'income', false);
        const realizedExpense = sumByType(activeTransactions, 'expense', false);

        return {
            totalIncome: realizedIncome,
            totalExpense: realizedExpense,
            balance: realizedIncome - realizedExpense,
        };
    }, [activeTransactions, sumByType]);

    // PURE: Returns category keys, not translated labels
    const categoryTotals = useMemo(() => {
        const result: Record<string, number> = {};
        if (activeTransactions.length === 0) return result;

        activeTransactions
            .filter(tr => tr.type === 'expense' && !isMaster(tr))
            .forEach(tr => {
                const amount = Math.abs(tr.amount);
                const trCurrency = ensureCurrency(tr.currency);
                const converted = safeConvert(amount, trCurrency, currency);
                result[tr.category] = (result[tr.category] || 0) + converted;
            });
        return result;
    }, [activeTransactions, currency, safeConvert]);

    // PURE: Returns month/year indices, not translated names
    // Now includes BOTH history items AND master transaction occurrences for each month
    const cashFlowData = useMemo(() => {
        // Handle empty/invalid transactions by returning 6 months of zeros (matching the real data path below)
        if (activeTransactions.length === 0) {
            return Array.from({ length: 6 }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (5 - i));
                return { monthIndex: d.getMonth(), year: d.getFullYear(), income: 0, expense: 0, balance: 0 };
            });
        }

        const now = new Date();
        const monthsData: { monthIndex: number; year: number; income: number; expense: number; balance: number }[] = [];

        // Calculate the balance exactly 6 months ago
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        let currentBalance = 0;

        // First, add up everything BEFORE the 6 months period to get our starting point
        activeTransactions.forEach(tr => {
            const amt = absToView(tr.amount, ensureCurrency(tr.currency));
            if (!isMaster(tr)) {
                const dt = toDateSafe((tr as any).effectiveDateYMD || tr.date);
                if (dt && dt.getTime() < sixMonthsAgo.getTime()) {
                    if (tr.type === 'income') currentBalance += amt; else currentBalance -= amt;
                }
            }
        });

        for (let i = 5; i >= 0; i--) {
            const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = mDate.getMonth();
            const y = mDate.getFullYear();
            const monthStart = new Date(y, m, 1);
            const monthEnd = new Date(y, m + 1, 0, 23, 59, 59);

            let inc = 0, exp = 0;

            activeTransactions.forEach(tr => {
                const amt = absToView(tr.amount, ensureCurrency(tr.currency));

                if (isMaster(tr)) {
                    // For master transactions, calculate occurrences in this specific month
                    // FIX: Prevent double-counting by only projecting FUTURE occurrences for masters
                    // (Past occurrences are covered by instantiated history items)
                    const effectiveStart = new Date(Math.max(monthStart.getTime(), now.getTime()));

                    // If effective start is past month end, this returns 0, which is correct (fully realized)
                    const hits = calculateOccurrences(tr, effectiveStart, monthEnd);
                    if (tr.type === 'income') inc += (amt * hits); else exp += (amt * hits);
                } else {
                    // For history/standalone items, check if date falls in this month
                    const dt = toDateSafe((tr as any).effectiveDateYMD || tr.date);
                    if (dt && dt.getMonth() === m && dt.getFullYear() === y) {
                        if (tr.type === 'income') inc += amt; else exp += amt;
                    }
                }
            });

            // Add net to current balance for this month's final state
            currentBalance += (inc - exp);

            monthsData.push({ monthIndex: m, year: y, income: inc, expense: exp, balance: currentBalance });
        }
        return monthsData;
    }, [activeTransactions, absToView, calculateOccurrences]);

    // PURE: Returns year/month indices for labeling in the UI
    const projectionData = useMemo(() => {
        const now = new Date();
        const projData: { year: number; monthIndex: number | null; balance: number; income: number; expense: number }[] = [];
        if (activeTransactions.length === 0) return [];

        let cumulativeBalance = balance;
        const isYearly = projectionYears > 3;
        const totalPoints = isYearly ? projectionYears : (projectionYears * 12);

        for (let i = 1; i <= totalPoints; i++) {
            let start: Date, end: Date, year: number, monthIndex: number | null;

            if (isYearly) {
                year = now.getFullYear() + i;
                monthIndex = null;
                start = new Date(year, 0, 1);
                end = new Date(year, 11, 31, 23, 59, 59);
            } else {
                const target = new Date(now.getFullYear(), now.getMonth() + i, 1);
                start = target;
                end = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59);
                year = target.getFullYear();
                monthIndex = target.getMonth();
            }

            let inc = 0, exp = 0;
            activeTransactions.forEach(tr => {
                const amt = absToView(tr.amount, ensureCurrency(tr.currency));
                if (isMaster(tr)) {
                    const hits = calculateOccurrences(tr, start, end);
                    if (tr.type === 'income') inc += (amt * hits); else exp += (amt * hits);
                } else {
                    const dt = toDateSafe((tr as any).effectiveDateYMD || tr.date);
                    if (dt && dt >= start && dt <= end) {
                        if (tr.type === 'income') inc += amt; else exp += amt;
                    }
                }
            });

            cumulativeBalance += inc - exp;
            projData.push({ year, monthIndex, balance: cumulativeBalance, income: inc, expense: exp });
        }
        return projData;
    }, [activeTransactions, absToView, balance, projectionYears, calculateOccurrences]);

    const averageMonthlyExpense = useMemo(() => {
        if (!cashFlowData || cashFlowData.length === 0) return 0;
        const totalExp = cashFlowData.reduce((acc, curr) => acc + curr.expense, 0);
        return totalExp / cashFlowData.length;
    }, [cashFlowData]);

    const monthlyCashFlow = useMemo(() => {
        if (!cashFlowData || cashFlowData.length === 0) return 0;
        const totalNet = cashFlowData.reduce((acc, curr) => acc + (curr.income - curr.expense), 0);
        return totalNet / cashFlowData.length;
    }, [cashFlowData]);

    const savingsRate = useMemo(() => {
        if (totalIncome === 0) return 0;
        return ((totalIncome - totalExpense) / totalIncome) * 100;
    }, [totalIncome, totalExpense]);

    const runwayMonths = useMemo(() => {
        if (averageMonthlyExpense === 0) return balance > 0 ? 999 : 0;
        return balance / averageMonthlyExpense;
    }, [balance, averageMonthlyExpense]);

    return {
        totalIncome,
        totalExpense,
        balance,
        averageMonthlyExpense,
        monthlyCashFlow,     // Added
        savingsRate,
        runwayMonths,
        categoryTotals,
        cashFlowData,
        projectionData,
        isMaster,
        isFuture,
        absToView,
        ensureCurrency,
    };
};
