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

    const absToView = useCallback((amount: number, fromCurrency: string) => {
        const abs = Math.abs(amount);
        return safeConvert(abs, ensureCurrency(fromCurrency), currency);
    }, [currency, safeConvert]);

    const sumByType = useCallback(
        (txs: Transaction[], type: 'income' | 'expense') => {
            if (!txs || txs.length === 0) return 0;
            return txs
                .filter(tr => tr.type === type)
                .reduce((acc, tr) => {
                    const from = ensureCurrency((tr as any).currency);
                    return acc + absToView(tr.amount, from);
                }, 0);
        },
        [absToView]
    );

    // Aggregations
    const { totalIncome, totalExpense, balance, volumeTransactions, cashTransactions } = useMemo(() => {
        if (!transactions || transactions.length === 0) {
            return { totalIncome: 0, totalExpense: 0, balance: 0, volumeTransactions: [], cashTransactions: [] };
        }
        const now = endOfToday();

        // 1) All valid transactions (excluding templates) -> Shown in list
        const volumeTransactions = transactions.filter(tr => !isMaster(tr));

        // 2) Cash-in-hand transactions (excluding future) -> Used for balance calculation
        const cashTransactions = transactions.filter(tr => !isMaster(tr) && !isFuture(tr, now));

        const cashIncome = sumByType(cashTransactions, 'income');
        const cashExpense = sumByType(cashTransactions, 'expense');

        return {
            totalIncome: cashIncome, // Show CASH income in cards
            totalExpense: cashExpense, // Show CASH expense in cards
            balance: cashIncome - cashExpense, // Show CASH balance
            volumeTransactions,
            cashTransactions
        };
    }, [transactions, sumByType]);

    const getTransactionAmountsByCurrency = (type: 'income' | 'expense') => {
        const result: Record<string, number> = {};
        if (!transactions) return result;
        transactions
            .filter(tr => tr.type === type)
            .filter(tr => !isMaster(tr))
            .forEach(tr => {
                const trCurrency = (tr as any).currency || 'USD';
                const amount = Math.abs(tr.amount);
                result[trCurrency] = (result[trCurrency] || 0) + amount;
            });
        return result;
    };

    // Category chart data
    const categoryData = useMemo(() => {
        if (!transactions) return [];
        const expensesByCategory: Record<string, number> = {};
        transactions
            .filter(tr => tr.type === 'expense' && !isMaster(tr))
            .forEach(tr => {
                const amount = Math.abs(tr.amount);
                const trCurrency = (tr as any).currency || 'USD';
                const converted = safeConvert(amount, trCurrency, currency);
                expensesByCategory[tr.category] = (expensesByCategory[tr.category] || 0) + converted;
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
        const eod = endOfToday();
        const monthsData: { name: string; income: number; expense: number }[] = [];
        if (!transactions || transactions.length === 0) return [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthIdx = date.getMonth();
            const year = date.getFullYear();
            const monthName = monthNames[monthIdx] ? monthNames[monthIdx].slice(0, 3) : `M${monthIdx + 1} `;
            let income = 0;
            let expense = 0;
            transactions.forEach(tr => {
                if (isMaster(tr)) return;
                const trDate = new Date(tr.date);
                if (trDate.getTime() > eod.getTime()) return;
                if (trDate.getMonth() === monthIdx && trDate.getFullYear() === year) {
                    const amount = Math.abs(tr.amount);
                    const trCurrency = (tr as any).currency || 'USD';
                    const converted = safeConvert(amount, trCurrency, currency);
                    if (tr.type === 'income') income += converted; else expense += converted;
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
