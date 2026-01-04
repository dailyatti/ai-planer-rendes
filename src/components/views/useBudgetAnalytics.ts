// src/components/views/useBudgetAnalytics.ts
import { useCallback, useMemo } from 'react';
import { Transaction } from '../../types/planner';

/**
 * useBudgetAnalytics Hook - PhD Level Financial Engine
 * Refactored for O(1) performance on Daily/Weekly frequencies and 
 * Date-Drift prevention using Anchor Date logic.
 */
export const useBudgetAnalytics = (
    transactions: Transaction[],
    currency: string,
    safeConvert: (amount: number, fromCurrency: string, toCurrency: string) => number,
    t: (key: string) => string,
    CATEGORIES: Record<string, { color: string; label: string }>,
    projectionYears: number = 1
) => {
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
        [absToView, ensureCurrency, isMaster, calculateOccurrences, projectionYears]
    );

    // --- MEMOIZED DATA SETS ---

    const { totalIncome, totalExpense, balance, volumeTransactions, cashTransactions } = useMemo(() => {
        if (!transactions || transactions.length === 0) {
            return { totalIncome: 0, totalExpense: 0, balance: 0, volumeTransactions: [], cashTransactions: [] };
        }
        const now = endOfToday();

        // UI FIX: Strictly exclude Master templates from the lists (they are just definitions)
        const volumeTransactions = transactions.filter(tr => !isMaster(tr));
        const cashTransactions = transactions.filter(tr => !isFuture(tr, now) && !isMaster(tr));

        const projectedIncome = sumByType(transactions, 'income', true);
        const projectedExpense = sumByType(transactions, 'expense', true);
        const realizedIncome = sumByType(transactions, 'income', false);
        const realizedExpense = sumByType(transactions, 'expense', false);

        return {
            totalIncome: projectedIncome,
            totalExpense: projectedExpense,
            balance: realizedIncome - realizedExpense,
            volumeTransactions,
            cashTransactions
        };
    }, [transactions, sumByType]);

    const getTransactionAmountsByCurrency = (type: 'income' | 'expense') => {
        const result: Record<string, number> = {};
        if (!transactions) return result;

        transactions
            .filter(tr => tr.type === type && !isMaster(tr))
            .forEach(tr => {
                const trCurrency = ensureCurrency(tr.currency);
                const amount = Math.abs(tr.amount);
                result[trCurrency] = (result[trCurrency] || 0) + amount;
            });
        return result;
    };

    const categoryData = useMemo(() => {
        if (!transactions) return [];
        const expensesByCategory: Record<string, number> = {};

        transactions
            .filter(tr => tr.type === 'expense' && !isMaster(tr))
            .forEach(tr => {
                const amount = Math.abs(tr.amount);
                const trCurrency = ensureCurrency((tr as any).currency);
                const converted = safeConvert(amount, trCurrency, currency);
                expensesByCategory[tr.category] = (expensesByCategory[tr.category] || 0) + converted;
            });
        return Object.entries(expensesByCategory).map(([cat, val]) => ({
            name: CATEGORIES[cat]?.label || cat,
            value: val,
            color: CATEGORIES[cat]?.color || '#9ca3af',
        }));
    }, [transactions, CATEGORIES, currency, safeConvert]);

    const cashFlowData = useMemo(() => {
        const monthNames = [
            t('months.january') || 'Jan', t('months.february') || 'Feb', t('months.march') || 'Mar', t('months.april') || 'Apr',
            t('months.may') || 'May', t('months.june') || 'Jun', t('months.july') || 'Jul', t('months.august') || 'Aug',
            t('months.september') || 'Sep', t('months.october') || 'Oct', t('months.november') || 'Nov', t('months.december') || 'Dec',
        ];
        const now = new Date();
        const monthsData: { name: string; income: number; expense: number }[] = [];
        if (!transactions) return [];

        for (let i = 5; i >= 0; i--) {
            const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = mDate.getMonth();
            const y = mDate.getFullYear();
            const label = monthNames[m]?.slice(0, 3) || `M${m + 1}`;

            let inc = 0, exp = 0;
            transactions
                .filter(tr => !isMaster(tr))
                .forEach(tr => {
                    const dt = toDateSafe(tr.date);
                    if (dt && dt.getMonth() === m && dt.getFullYear() === y) {
                        const amt = absToView(tr.amount, ensureCurrency(tr.currency));
                        if (tr.type === 'income') inc += amt; else exp += amt;
                    }
                });
            monthsData.push({ name: label, income: inc, expense: exp });
        }
        return monthsData;
    }, [transactions, t, absToView]);

    const projectionData = useMemo(() => {
        const monthNames = [
            t('months.january') || 'Jan', t('months.february') || 'Feb', t('months.march') || 'Mar', t('months.april') || 'Apr',
            t('months.may') || 'May', t('months.june') || 'Jun', t('months.july') || 'Jul', t('months.august') || 'Aug',
            t('months.september') || 'Sep', t('months.october') || 'Oct', t('months.november') || 'Nov', t('months.december') || 'Dec',
        ];

        const now = new Date();
        const projData: { name: string; balance: number; income: number; expense: number }[] = [];
        if (!transactions) return [];

        let cumulativeBalance = balance;
        const isYearly = projectionYears > 3;
        const totalPoints = isYearly ? projectionYears : (projectionYears * 12);

        for (let i = 1; i <= totalPoints; i++) {
            let start: Date, end: Date, label: string;

            if (isYearly) {
                const year = now.getFullYear() + i;
                start = new Date(year, 0, 1);
                end = new Date(year, 11, 31, 23, 59, 59);
                label = `${year}`;
            } else {
                const target = new Date(now.getFullYear(), now.getMonth() + i, 1);
                start = target;
                end = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59);
                label = `${monthNames[target.getMonth()]?.slice(0, 3)} '${String(target.getFullYear()).slice(2)}`;
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
            projData.push({ name: label, balance: cumulativeBalance, income: inc, expense: exp });
        }
        return projData;
    }, [transactions, t, absToView, balance, projectionYears, calculateOccurrences]);

    return {
        totalIncome,
        totalExpense,
        balance,
        volumeTransactions,
        cashTransactions,
        getTransactionAmountsByCurrency,
        categoryData,
        cashFlowData,
        projectionData,
        isMaster,
        isFuture,
        absToView,
        ensureCurrency,
    };
};
