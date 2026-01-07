import { Transaction, Invoice } from '../types/planner';
import { CurrencyService } from '../services/CurrencyService';
import { FinancialMathService } from './financialMath';

/**
 * FinancialEngine - PhD Level Mathematical Model
 * Handles currency conversion via CurrencyService, cash flow analysis, and forecasting.
 */
export class FinancialEngine {

    /**
     * Convert amount between currencies using CurrencyService
     */
    static convert(amount: number, from: string, to: string): number {
        return CurrencyService.convert(amount, from, to);
    }

    /**
     * Refresh exchange rates via CurrencyService
     */
    static async refreshRates(force: boolean = false) {
        return CurrencyService.fetchRealTimeRates(force);
    }

    /**
     * Get update source from CurrencyService
     */
    static getRateSource() {
        return CurrencyService.getUpdateSource();
    }

    /**
     * Calculate Total Revenue from Invoices
     * Aggregates invoices converting all to the target currency
     */
    static calculateTotalRevenue(invoices: Invoice[], targetCurrency: string): number {
        return invoices
            .filter(inv => ['paid', 'sent', 'overdue'].includes(inv.status))
            .reduce((sum, inv) => {
                const amount = inv.total || 0;
                const currency = inv.currency || targetCurrency;
                return sum + CurrencyService.convert(amount, currency, targetCurrency);
            }, 0);
    }

    /**
     * Calculate Paid Amount
     */
    static calculatePaid(invoices: Invoice[], targetCurrency: string): number {
        return invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => {
                const amount = inv.total || 0;
                const currency = inv.currency || targetCurrency;
                return sum + CurrencyService.convert(amount, currency, targetCurrency);
            }, 0);
    }

    /**
     * Calculate Pending Amount (sent invoices)
     */
    static calculatePending(invoices: Invoice[], targetCurrency: string): number {
        return invoices
            .filter(inv => inv.status === 'sent')
            .reduce((sum, inv) => {
                const amount = inv.total || 0;
                const currency = inv.currency || targetCurrency;
                return sum + CurrencyService.convert(amount, currency, targetCurrency);
            }, 0);
    }

    /**
     * Calculate Overdue Amount
     */
    static calculateOverdue(invoices: Invoice[], targetCurrency: string): number {
        return invoices
            .filter(inv => inv.status === 'overdue')
            .reduce((sum, inv) => {
                const amount = inv.total || 0;
                const currency = inv.currency || targetCurrency;
                return sum + CurrencyService.convert(amount, currency, targetCurrency);
            }, 0);
    }

    /**
     * Get aggregated amounts by currency
     * Useful for displaying breakdown like: "150.000 HUF + 200 EUR"
     */
    static getAmountsByCurrency(invoices: Invoice[], status?: 'paid' | 'sent' | 'overdue'): Record<string, number> {
        const result: Record<string, number> = {};

        invoices.forEach(inv => {
            if (status && inv.status !== status) return;

            const currency = inv.currency || 'USD';
            const amount = inv.total || 0;

            if (!result[currency]) {
                result[currency] = 0;
            }
            result[currency] += amount;
        });

        return result;
    }

    /**
     * Generate Revenue Forecast for next N months
     * Uses linear regression on historical data + pending invoices
     */
    /**
     * Generate Revenue Forecast for next N months
     * Uses FinancialMathService for linear regression
     */
    static generateForecast(
        invoices: Invoice[],
        targetCurrency: string,
        months: number = 6
    ): { labels: string[]; actual: number[]; predicted: number[] } {
        const labels: string[] = [];
        const actual: number[] = [];
        const predicted: number[] = [];

        const today = new Date();

        // Calculate historical monthly revenue (last 6 months)
        const historicalMonths: number[] = [];
        const xValues: number[] = [];

        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthRevenue = invoices
                .filter(inv => {
                    const invDate = new Date(inv.issueDate);
                    return inv.status === 'paid' &&
                        invDate.getMonth() === monthDate.getMonth() &&
                        invDate.getFullYear() === monthDate.getFullYear();
                })
                .reduce((sum, inv) => sum + CurrencyService.convert(inv.total, inv.currency || targetCurrency, targetCurrency), 0);

            historicalMonths.push(monthRevenue);
            xValues.push(i); // 0 to 5
        }

        // Use FinancialMathService for regression AND FinancialMathService works!
        const regression = FinancialMathService.linearRegression(xValues, historicalMonths);

        // Generate labels and data for past + future
        for (let i = -3; i <= months; i++) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
            labels.push(monthDate.toLocaleString('default', { month: 'short', year: '2-digit' }));

            if (i <= 0) {
                // Historical actual data
                const monthRevenue = invoices
                    .filter(inv => {
                        const invDate = new Date(inv.issueDate);
                        return inv.status === 'paid' &&
                            invDate.getMonth() === monthDate.getMonth() &&
                            invDate.getFullYear() === monthDate.getFullYear();
                    })
                    .reduce((sum, inv) => sum + CurrencyService.convert(inv.total, inv.currency || targetCurrency, targetCurrency), 0);

                actual.push(Math.round(monthRevenue));
                predicted.push(0); // No prediction for past
            } else {
                // Future prediction
                actual.push(0); // No actual for future
                // x value corresponds to index in the sequence where last known is 5.
                // i starts at 1 (next month), so x = 5 + i
                const predictedValue = regression.predict(5 + i);
                predicted.push(Math.max(0, Math.round(predictedValue)));
            }
        }

        return { labels, actual, predicted };
    }

    /**
     * Get aggregated transaction amounts by currency
     */
    static getTransactionAmountsByCurrency(transactions: Transaction[], type: 'income' | 'expense'): Record<string, number> {
        const result: Record<string, number> = {};

        transactions
            .filter(t => t.type === type && t.kind !== 'master')
            .forEach(t => {
                const currency = (t as any).currency || 'USD'; // Transaction might not have currency yet, default to USD
                const amount = Math.abs(t.amount);

                if (!result[currency]) {
                    result[currency] = 0;
                }
                result[currency] += amount;
            });

        return result;
    }

    /**
     * Calculate monthly burn rate from transactions
     */
    static calculateBurnRate(transactions: Transaction[], targetCurrency: string): number {
        const expenses = transactions
            .filter(t => t.type === 'expense' && t.kind !== 'master')
            .reduce((sum, t) => sum + CurrencyService.convert(Math.abs(t.amount), (t as any).currency || targetCurrency, targetCurrency), 0);

        // Assume transactions span ~last month (simplified for now)
        return expenses;
    }

    /**
     * Calculate runway in months (Delegates to FinancialMathService)
     */
    static calculateRunway(currentBalance: number, monthlyBurn: number): number | null {
        const res = FinancialMathService.runway(currentBalance, monthlyBurn);
        return res === Infinity ? null : Math.floor(res);
    }

    /**
     * Calculate Future Balance Forecast with Compound Interest
     * @param currentBalance Current total balance in target currency
     * @param monthlyNet Monthly net cashflow (recurring income - recurring expense)
     * @param months Number of months to forecast
     * @param annualInterestRate Annual interest rate (e.g. 5 for 5%)
     */
    static calculateFutureBalance(
        currentBalance: number,
        monthlyNet: number,
        months: number,
        annualInterestRate: number = 0
    ): number {
        // Use Future Value for Principal
        const r = annualInterestRate / 100 / 12; // Monthly interest rate decimal
        if (r === 0) {
            return currentBalance + (monthlyNet * months);
        }

        // FV = P(1+r)^n
        const futurePrincipal = FinancialMathService.futureValue(currentBalance, r, months);

        // Future value of a series (PMT)
        // PMT * [((1 + r)^n - 1) / r]
        const compoundFactor = Math.pow(1 + r, months);
        const futureContributions = monthlyNet * ((compoundFactor - 1) / r);

        return futurePrincipal + futureContributions;
    }

    /**
     * Calculate current total balance from transactions
     */
    static calculateCurrentBalance(transactions: Transaction[], targetCurrency: string): number {
        return transactions
            .filter(t => t.kind !== 'master') // EXCLUDE TEMPLATES
            .reduce((sum, t) => {
                const amount = t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount);
                return sum + CurrencyService.convert(amount, t.currency || targetCurrency, targetCurrency);
            }, 0);
    }
    /**
     * Generate Comprehensive Financial Report (PhD Level)
     * Calculates recurrent cash flow, projections, runway, and interest analytics.
     */
    static getFinancialReport(transactions: Transaction[], baseCurrency: string): FinancialReport {
        const currentBalance = this.calculateCurrentBalance(transactions, baseCurrency);

        // 1. Calculate Recurring Monthly Income
        const incomeTransactions = transactions.filter(t => t.type === 'income');
        const recurringIncomeTransactions = incomeTransactions.filter(t => t.recurring === true && t.period && t.period !== 'oneTime');

        const recurringIncome = recurringIncomeTransactions.reduce((sum, t) => {
            let amount = this.convert(t.amount, t.currency || baseCurrency, baseCurrency);
            switch (t.period) {
                case 'daily': return sum + (amount * 30);
                case 'weekly': return sum + (amount * 4);
                case 'monthly': return sum + amount;
                case 'yearly': return sum + (amount / 12);
                default: return sum;
            }
        }, 0);

        // 2. Calculate Recurring Monthly Expenses
        const expenseTransactions = transactions.filter(t => t.type === 'expense');
        const recurringExpenseTransactions = expenseTransactions.filter(t => t.recurring === true && t.period && t.period !== 'oneTime');

        const recurringExpenses = recurringExpenseTransactions.reduce((sum, t) => {
            let amount = this.convert(Math.abs(t.amount), t.currency || baseCurrency, baseCurrency);
            switch (t.period) {
                case 'daily': return sum + (amount * 30);
                case 'weekly': return sum + (amount * 4);
                case 'monthly': return sum + amount;
                case 'yearly': return sum + (amount / 12);
                default: return sum;
            }
        }, 0);

        // 3. Net Monthly Cash Flow
        const monthlyNet = recurringIncome - recurringExpenses;
        const monthlyBurn = recurringExpenses;

        // 4. Weighted Average Interest Rate
        const incomeWithInterest = transactions.filter(t => t.type === 'income' && t.interestRate);
        const totalIncomeWithInterest = incomeWithInterest.reduce((sum, t) => sum + this.convert(t.amount, t.currency || baseCurrency, baseCurrency), 0);
        const weightedSumRate = incomeWithInterest.reduce((sum, t) => {
            const amt = this.convert(t.amount, t.currency || baseCurrency, baseCurrency);
            return sum + (amt * (t.interestRate || 0));
        }, 0);
        const avgInterestRate = totalIncomeWithInterest > 0 ? (weightedSumRate / totalIncomeWithInterest) : 0;

        // 5. Projections
        const projected3Months = this.calculateFutureBalance(currentBalance, monthlyNet, 3, avgInterestRate);
        const projected1Year = this.calculateFutureBalance(currentBalance, monthlyNet, 12, avgInterestRate);
        const projected3Years = this.calculateFutureBalance(currentBalance, monthlyNet, 36, avgInterestRate);
        const runway = this.calculateRunway(currentBalance, monthlyBurn);

        return {
            currentBalance,
            recurringIncome,
            recurringExpenses,
            monthlyNet,
            monthlyBurn,
            avgInterestRate,
            runway,
            projections: {
                threeMonths: projected3Months,
                oneYear: projected1Year,
                threeYears: projected3Years
            }
        };
    }
}

export interface FinancialReport {
    currentBalance: number;
    recurringIncome: number;
    recurringExpenses: number;
    monthlyNet: number;
    monthlyBurn: number;
    avgInterestRate: number;
    runway: number | null;
    projections: {
        threeMonths: number;
        oneYear: number;
        threeYears: number;
    };
}
