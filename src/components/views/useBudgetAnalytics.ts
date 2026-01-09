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
    // --- ZERO DATA GUARD ---
    // If no transactions, strictly return 0/empty values to prevent stale UI
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        // Return 12 months of zero data for charts
        const zeroCashFlow = Array.from({ length: 12 }).map((_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return { monthIndex: d.getMonth(), year: d.getFullYear(), income: 0, expense: 0 };
        }).reverse();

        return {
            totalIncome: 0,
            totalExpense: 0,
            balance: 0,
            averageMonthlyExpense: 0,
            savingsRate: 0,
            runwayMonths: 0,
            monthlyCashFlow: 0,
            categoryTotals: {},
            cashFlowData: zeroCashFlow, // Non-empty array of zeros to keep chart rendered but flat
            projectionData: [],
            isMaster: (tr: Transaction) => tr.kind === 'master',
            isFuture: () => false,
            absToView: () => 0,
            ensureCurrency: (c?: string) => c || 'USD',
        };
    }

    // --- BASIC HELPERS ---

    const toDateSafe = (d: Date | string | number): Date | null => {
        const dt = d instanceof Date ? d : new Date(d);
        return Number.isNaN(dt.getTime()) ? null : dt;
    };

    const endOfToday = (): Date => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        return now;
    };

    const ensureCurrency = (c?: string) => (c && c.trim() ? c : 'USD');

    const isMaster = (tr: Transaction) => tr.kind === 'master';

    // ... existing helpers ...

    // Derived Key Metrics (re-inserting to ensure scope availability if needed, but primarily for the return object update below)
    // Note: This replacement chunk spans widely to update the TOP zero-guard return. The bottom calculation needs to be updated too.


    const isFuture = (tr: Transaction, now: Date) => {
        const dt = toDateSafe(tr.date);
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
    const calculateOccurrences = (tr: Transaction, start: Date, end: Date): number => {
        // Standalone transactions always count as 1 if they fall in the window
        if (!tr.recurring || tr.period === 'oneTime') return 1;

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
                let yearsToSkip = Math.max(0, junctionStart.getFullYear() - trDate.getFullYear() - 1);

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
    };

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
                    const trDate = toDateSafe(tr.date);
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
        [absToView, projectionYears]
    );

    // --- MEMOIZED DATA SETS ---

    const { totalIncome, totalExpense, balance } = useMemo(() => {
        if (!transactions || transactions.length === 0) {
            return { totalIncome: 0, totalExpense: 0, balance: 0 };
        }

        const projectedIncome = sumByType(transactions, 'income', true);
        const projectedExpense = sumByType(transactions, 'expense', true);
        const realizedIncome = sumByType(transactions, 'income', false);
        const realizedExpense = sumByType(transactions, 'expense', false);

        return {
            totalIncome: projectedIncome,
            totalExpense: projectedExpense,
            balance: realizedIncome - realizedExpense,
        };
    }, [transactions, sumByType]);

    // PURE: Returns category keys, not translated labels
    const categoryTotals = useMemo(() => {
        const result: Record<string, number> = {};
        if (!transactions) return result;

        transactions
            .filter(tr => tr.type === 'expense' && !isMaster(tr))
            .forEach(tr => {
                const amount = Math.abs(tr.amount);
                const trCurrency = ensureCurrency(tr.currency);
                const converted = safeConvert(amount, trCurrency, currency);
                result[tr.category] = (result[tr.category] || 0) + converted;
            });
        return result;
    }, [transactions, currency, safeConvert]);

    // PURE: Returns month/year indices, not translated names
    // Now includes BOTH history items AND master transaction occurrences for each month
    const cashFlowData = useMemo(() => {
        const now = new Date();
        const monthsData: { monthIndex: number; year: number; income: number; expense: number }[] = [];
        if (!transactions) return [];

        for (let i = 5; i >= 0; i--) {
            const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = mDate.getMonth();
            const y = mDate.getFullYear();
            const monthStart = new Date(y, m, 1);
            const monthEnd = new Date(y, m + 1, 0, 23, 59, 59);

            let inc = 0, exp = 0;

            transactions.forEach(tr => {
                const amt = absToView(tr.amount, ensureCurrency(tr.currency));

                if (isMaster(tr)) {
                    // For master transactions, calculate occurrences in this specific month
                    const hits = calculateOccurrences(tr, monthStart, monthEnd);
                    if (tr.type === 'income') inc += (amt * hits); else exp += (amt * hits);
                } else {
                    // For history/standalone items, check if date falls in this month
                    const dt = toDateSafe(tr.date);
                    if (dt && dt.getMonth() === m && dt.getFullYear() === y) {
                        if (tr.type === 'income') inc += amt; else exp += amt;
                    }
                }
            });

            monthsData.push({ monthIndex: m, year: y, income: inc, expense: exp });
        }
        return monthsData;
    }, [transactions, absToView]);

    // PURE: Returns year/month indices for labeling in the UI
    const projectionData = useMemo(() => {
        const now = new Date();
        const projData: { year: number; monthIndex: number | null; balance: number; income: number; expense: number }[] = [];
        if (!transactions) return [];

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
            transactions.forEach(tr => {
                const amt = absToView(tr.amount, ensureCurrency(tr.currency));
                if (isMaster(tr)) {
                    const hits = calculateOccurrences(tr, start, end);
                    if (tr.type === 'income') inc += (amt * hits); else exp += (amt * hits);
                } else {
                    const dt = toDateSafe(tr.date);
                    if (dt && dt >= start && dt <= end) {
                        if (tr.type === 'income') inc += amt; else exp += amt;
                    }
                }
            });

            cumulativeBalance += inc - exp;
            projData.push({ year, monthIndex, balance: cumulativeBalance, income: inc, expense: exp });
        }
        return projData;
    }, [transactions, absToView, balance, projectionYears]);

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
