// src/components/views/useBudgetAnalytics.ts
import { useCallback, useMemo } from 'react';
import { Transaction } from '../../types/planner';
// CATEGORIES will be passed as a parameter to the hook (no import needed)

export const useBudgetAnalytics = (
    transactions: Transaction[],
    currency: string,
    safeConvert: (amount: number, fromCurrency: string, toCurrency: string) => number,
    t: (key: string) => string,
    CATEGORIES: Record<string, { label: string; color: string }>
) => {
    // Helper to safely parse dates
    const toDateSafe = (d: Date | string | number) => {
        const dt = d instanceof Date ? d : new Date(d);
        return Number.isNaN(dt.getTime()) ? null : dt;
    };

    const endOfToday = () => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        return now;
    };

    const ensureCurrency = (c?: string) => (c && c.trim() ? c : 'USD');

    const isMaster = (tr: Transaction) => (tr as any).kind === 'master';

    const isFuture = (tr: Transaction, now: Date) => {
        const dt = toDateSafe(tr.date as any);
        if (!dt) return false;
        return dt.getTime() > now.getTime();
    };

    /**
     * Projiciálja a tranzakció előfordulásait egy adott időtartamra.
     * @param tr A tranzakció sablon (master)
     * @param start Kezdő dátum (számítás kezdete)
     * @param end Záró dátum (számítás vége)
     * @returns Az előfordulások száma az intervallumban
     */
    const calculateOccurrences = (tr: Transaction, start: Date, end: Date) => {
        if (!tr.recurring || tr.period === 'oneTime') return 1;

        const trDate = toDateSafe(tr.date);
        if (!trDate) return 0;

        // Ha a tranzakció kezdete a vizsgált időszak után van, 0 előfordulás
        if (trDate.getTime() > end.getTime()) return 0;

        let count = 0;
        const current = new Date(trDate);

        // Léptetés a periódus alapján
        while (current.getTime() <= end.getTime()) {
            if (current.getTime() >= start.getTime()) {
                count++;
            }

            // Következő dátum számítása
            switch (tr.period) {
                case 'daily': current.setDate(current.getDate() + 1); break;
                case 'weekly': current.setDate(current.getDate() + 7); break;
                case 'monthly': current.setMonth(current.getMonth() + 1); break;
                case 'yearly': current.setFullYear(current.getFullYear() + 1); break;
                default: return count; // oneTime vagy ismeretlen
            }

            // Végtelen ciklus elleni védelem (max 1000 előfordulás / év)
            if (count > 1000) break;
        }

        return count;
    };

    const absToView = useCallback((amount: number, fromCurrency: string) => {
        const abs = Math.abs(amount);
        return safeConvert(abs, ensureCurrency(fromCurrency), currency);
    }, [currency, safeConvert]);

    const sumByType = useCallback(
        (txs: Transaction[], type: 'income' | 'expense', now?: Date) => {
            if (!txs || txs.length === 0) return 0;
            let total = 0;

            txs.filter(tr => tr.type === type).forEach(tr => {
                const from = ensureCurrency((tr as any).currency);
                const baseAmount = absToView(tr.amount, from);

                if (isMaster(tr) && now) {
                    const trDate = toDateSafe(tr.date);
                    if (trDate) {
                        const occurrences = calculateOccurrences(tr, trDate, now);
                        total += baseAmount * occurrences;
                    }
                } else {
                    total += baseAmount;
                }
            });
            return total;
        },
        [absToView]
    );

    // Aggregations
    const { totalIncome, totalExpense, balance, volumeTransactions, cashTransactions } = useMemo(() => {
        if (!transactions || transactions.length === 0) {
            return { totalIncome: 0, totalExpense: 0, balance: 0, volumeTransactions: [], cashTransactions: [] };
        }
        const now = endOfToday();

        // 1) All valid transactions -> Shown in list (Now INCLUDING master/recurring)
        const volumeTransactions = transactions.filter(tr => true);

        // 2) Cash-in-hand transactions
        const cashTransactions = transactions.filter(tr => !isFuture(tr, now));

        const cashIncome = sumByType(cashTransactions, 'income', now);
        const cashExpense = sumByType(cashTransactions, 'expense', now);

        return {
            totalIncome: cashIncome,
            totalExpense: cashExpense,
            balance: cashIncome - cashExpense,
            volumeTransactions,
            cashTransactions
        };
    }, [transactions, sumByType]);

    const getTransactionAmountsByCurrency = (type: 'income' | 'expense') => {
        const result: Record<string, number> = {};
        if (!transactions) return result;
        const now = endOfToday();

        transactions
            .filter(tr => tr.type === type)
            .forEach(tr => {
                const trCurrency = (tr as any).currency || 'USD';
                const amount = Math.abs(tr.amount);

                if (isMaster(tr)) {
                    const trDate = toDateSafe(tr.date);
                    if (trDate) {
                        const occurrences = calculateOccurrences(tr, trDate, now);
                        result[trCurrency] = (result[trCurrency] || 0) + (amount * occurrences);
                    }
                } else {
                    result[trCurrency] = (result[trCurrency] || 0) + amount;
                }
            });
        return result;
    };

    // Category chart data
    const categoryData = useMemo(() => {
        if (!transactions) return [];
        const expensesByCategory: Record<string, number> = {};
        const now = endOfToday();

        transactions
            .filter(tr => tr.type === 'expense')
            .forEach(tr => {
                const amount = Math.abs(tr.amount);
                const trCurrency = (tr as any).currency || 'USD';
                const converted = safeConvert(amount, trCurrency, currency);

                if (isMaster(tr)) {
                    const trDate = toDateSafe(tr.date);
                    if (trDate) {
                        const occurrences = calculateOccurrences(tr, trDate, now);
                        expensesByCategory[tr.category] = (expensesByCategory[tr.category] || 0) + (converted * occurrences);
                    }
                } else {
                    expensesByCategory[tr.category] = (expensesByCategory[tr.category] || 0) + converted;
                }
            });
        return Object.entries(expensesByCategory).map(([cat, val]) => ({
            name: (CATEGORIES as any)[cat]?.label || cat,
            value: val,
            color: (CATEGORIES as any)[cat]?.color || '#9ca3af',
        }));
    }, [transactions, CATEGORIES, currency, safeConvert]);

    // Cash‑flow chart data (last 6 months)
    const cashFlowData = useMemo(() => {
        const monthNames = [
            t('months.january') || 'Jan',
            t('months.february') || 'Feb',
            t('months.march') || 'Mar',
            t('months.april') || 'Apr',
            t('months.may') || 'May',
            t('months.june') || 'Jun',
            t('months.july') || 'Jul',
            t('months.august') || 'Aug',
            t('months.september') || 'Sep',
            t('months.october') || 'Oct',
            t('months.november') || 'Nov',
            t('months.december') || 'Dec',
        ];
        const now = new Date();
        const monthsData: { name: string; income: number; expense: number }[] = [];
        if (!transactions || transactions.length === 0) return [];

        for (let i = 5; i >= 0; i--) {
            const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const monthIdx = mDate.getMonth();
            const year = mDate.getFullYear();
            const monthName = monthNames[monthIdx] ? monthNames[monthIdx].slice(0, 3) : `M${monthIdx + 1}`;

            let income = 0;
            let expense = 0;

            transactions.forEach(tr => {
                const amount = Math.abs(tr.amount);
                const trCurrency = (tr as any).currency || 'USD';
                const converted = safeConvert(amount, trCurrency, currency);

                if (isMaster(tr)) {
                    // Recurring: count occurrences in THIS specific month
                    const occurrences = calculateOccurrences(tr, mDate, mEnd);
                    if (tr.type === 'income') income += (converted * occurrences); else expense += (converted * occurrences);
                } else {
                    // Single: check if it falls in THIS month
                    const trDate = new Date(tr.date);
                    if (trDate.getMonth() === monthIdx && trDate.getFullYear() === year) {
                        if (tr.type === 'income') income += converted; else expense += converted;
                    }
                }
            });
            monthsData.push({ name: monthName, income, expense });
        }
        return monthsData;
    }, [transactions, t, currency, safeConvert]);

    return {
        totalIncome,
        totalExpense,
        balance,
        volumeTransactions,
        cashTransactions,
        getTransactionAmountsByCurrency,
        categoryData,
        cashFlowData,
        isMaster,
        isFuture,
        absToView,
        ensureCurrency,
    };
};
