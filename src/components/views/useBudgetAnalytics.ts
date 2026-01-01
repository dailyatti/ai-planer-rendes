// src/components/views/useBudgetAnalytics.ts
import { useCallback, useMemo } from 'react';
import { Transaction } from '../../types/planner';
// CATEGORIES will be passed as a parameter to the hook (no import needed)

export const useBudgetAnalytics = (
    transactions: Transaction[],
    currency: string,
    safeConvert: (amount: number, fromCurrency: string, toCurrency: string) => number,
    t: (key: string) => string,
    CATEGORIES: any,
    projectionYears: number = 1
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

    // Helper to safely add months preventing date drift (e.g. Jan 31 -> Feb 28/29, not Mar 2)
    const addMonthsClamped = (d: Date, months: number) => {
        const date = new Date(d);
        const day = date.getDate();
        date.setMonth(date.getMonth() + months);
        if (date.getDate() !== day) {
            date.setDate(0);
        }
        return date;
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

        // Safety brake: calculate approx max steps to avoid infinite loops if logic fails
        // Daily: ~366/year. 50 years = ~18k steps. 1000 was too low.
        // Let's use a dynamic safety break based on time diff.
        const dayDiff = Math.ceil((end.getTime() - current.getTime()) / (24 * 3600 * 1000));
        const maxSteps = Math.max(1000, dayDiff + 100);
        let steps = 0;

        // Léptetés a periódus alapján
        while (current.getTime() <= end.getTime() && steps < maxSteps) {
            steps++;
            if (current.getTime() >= start.getTime()) {
                count++;
            }

            // Következő dátum számítása
            switch (tr.period) {
                case 'daily': current.setDate(current.getDate() + 1); break;
                case 'weekly': current.setDate(current.getDate() + 7); break;
                case 'monthly': {
                    const next = addMonthsClamped(current, 1);
                    current.setTime(next.getTime());
                    break;
                }
                case 'yearly': current.setFullYear(current.getFullYear() + 1); break;
                default: return count; // oneTime vagy ismeretlen
            }
        }

        return count;
    };

    const absToView = useCallback((amount: number, fromCurrency: string) => {
        const abs = Math.abs(amount);
        return safeConvert(abs, ensureCurrency(fromCurrency), currency);
    }, [currency, safeConvert]);

    const sumByType = useCallback(
        (txs: Transaction[], type: 'income' | 'expense', includeFutureMaster: boolean = false) => {
            if (!txs || txs.length === 0) return 0;
            let total = 0;
            const now = endOfToday();

            txs.filter(tr => tr.type === type).forEach(tr => {
                const from = ensureCurrency((tr as any).currency);
                const baseAmount = absToView(tr.amount, from);

                if (isMaster(tr)) {
                    if (includeFutureMaster) {
                        // PhD Logic: For "Total Volume" cards, user wants to see projected value?
                        // "csak az egyenleg résznél nem kell látszodjon" implies Cards show "Future Potential".
                        // Calculating occurrences for the next year (default view) or all time?
                        // Let's assume 1 year projection for "Total" cards to make them meaningful.
                        const occurrences = calculateOccurrences(tr, now, new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()));
                        total += baseAmount * occurrences;
                    }
                    // Else: Balance calculation (Cash) -> Master counts as 0 (History handled separately)
                } else {
                    total += baseAmount;
                }
            });
            return total;
        },
        [absToView, ensureCurrency, isMaster, calculateOccurrences]
    );

    // Aggregations
    const { totalIncome, totalExpense, balance, volumeTransactions, cashTransactions } = useMemo(() => {
        if (!transactions || transactions.length === 0) {
            return { totalIncome: 0, totalExpense: 0, balance: 0, volumeTransactions: [], cashTransactions: [] };
        }
        const now = endOfToday();

        const volumeTransactions = transactions.filter(tr => !isMaster(tr));
        const cashTransactions = transactions.filter(tr => !isFuture(tr, now) && !isMaster(tr));

        // Cash flow totals (for Balance: Realized Only)
        const cashIncome = sumByType(cashTransactions, 'income', false);
        const cashExpense = sumByType(cashTransactions, 'expense', false);

        // Volume/Planned totals (for Cards: Show everything including future potential)
        // We pass 'transactions' (includes Master) and enable future master calculation
        const volumeIncome = sumByType(transactions, 'income', true);
        const volumeExpense = sumByType(transactions, 'expense', true);

        return {
            totalIncome: volumeIncome,
            totalExpense: volumeExpense,
            balance: cashIncome - cashExpense, // Balance strictly Realized
            volumeTransactions,
            cashTransactions
        };
    }, [transactions, sumByType]);


    const getTransactionAmountsByCurrency = (type: 'income' | 'expense') => {
        const result: Record<string, number> = {};
        if (!transactions) return result;

        // Fix: Exclude masters to avoid double counting (DataContext generates history)
        transactions
            .filter(tr => tr.type === type && !isMaster(tr))
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

        // Fix: Exclude masters to avoid double counting (DataContext generates history)
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
        const monthsData: { name: string; income: number; expense: number }[] = [];
        if (!transactions || transactions.length === 0) return [];

        for (let i = 5; i >= 0; i--) {
            const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthIdx = mDate.getMonth();
            const year = mDate.getFullYear();
            const monthName = monthNames[monthIdx] ? monthNames[monthIdx].slice(0, 3) : `M${monthIdx + 1}`;

            let income = 0;
            let expense = 0;

            // Fix: Exclude masters for historical cash flow (DataContext generates history)
            transactions
                .filter(tr => !isMaster(tr))
                .forEach(tr => {
                    const amount = Math.abs(tr.amount);
                    const trCurrency = (tr as any).currency || 'USD';
                    const converted = safeConvert(amount, trCurrency, currency);

                    // Check if transaction falls in THIS month
                    const trDate = new Date(tr.date);
                    if (trDate.getMonth() === monthIdx && trDate.getFullYear() === year) {
                        if (tr.type === 'income') income += converted; else expense += converted;
                    }
                });
            monthsData.push({ name: monthName, income, expense });
        }
        return monthsData;
    }, [transactions, t, currency, safeConvert]);

    // PhD Level: Multi-Year Future Projection
    const projectionData = useMemo(() => {
        const monthNames = [
            t('months.january') || 'Jan', t('months.february') || 'Feb', t('months.march') || 'Mar', t('months.april') || 'Apr',
            t('months.may') || 'May', t('months.june') || 'Jun', t('months.july') || 'Jul', t('months.august') || 'Aug',
            t('months.september') || 'Sep', t('months.october') || 'Oct', t('months.november') || 'Nov', t('months.december') || 'Dec',
        ];

        const now = new Date();
        const projData: { name: string; balance: number; income: number; expense: number }[] = [];
        if (!transactions || transactions.length === 0) return [];

        let cumulativeBalance = balance;

        const isYearlyMode = projectionYears > 3;
        const totalPoints = isYearlyMode ? projectionYears : (projectionYears * 12);

        for (let i = 1; i <= totalPoints; i++) {
            let start: Date, end: Date, label: string;

            if (isYearlyMode) {
                // YEARLY calculation
                const y = now.getFullYear() + i;
                start = new Date(y, 0, 1);
                end = new Date(y, 11, 31, 23, 59, 59);
                label = `${y}`;
            } else {
                // MONTHLY calculation
                const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
                start = targetDate;
                end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
                const idx = targetDate.getMonth();
                const yShort = String(targetDate.getFullYear()).slice(2);
                label = `${monthNames[idx]?.slice(0, 3)} '${yShort}`;
            }

            let income = 0;
            let expense = 0;

            transactions.forEach(tr => {
                const amount = Math.abs(tr.amount);
                const trCurrency = (tr as any).currency || 'USD';
                const converted = safeConvert(amount, trCurrency, currency);

                if (isMaster(tr)) {
                    const occurrences = calculateOccurrences(tr, start, end);
                    if (tr.type === 'income') income += (converted * occurrences); else expense += (converted * occurrences);
                } else {
                    const trDate = new Date(tr.date);
                    if (trDate >= start && trDate <= end) {
                        if (tr.type === 'income') income += converted; else expense += converted;
                    }
                }
            });

            cumulativeBalance += income - expense;
            projData.push({ name: label, balance: cumulativeBalance, income, expense });
        }
        return projData;
    }, [transactions, t, currency, safeConvert, balance, projectionYears]);

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
