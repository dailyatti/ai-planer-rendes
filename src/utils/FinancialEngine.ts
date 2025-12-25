import { Transaction, Invoice } from '../types/planner';
import { CurrencyService } from '../services/CurrencyService';

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
        }

        // Calculate trend (simple linear regression slope)
        const n = historicalMonths.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = historicalMonths.reduce((a, b) => a + b, 0);
        const sumXY = historicalMonths.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = historicalMonths.reduce((sum, _, x) => sum + x * x, 0);

        const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
        const intercept = (sumY - slope * sumX) / n;

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
                const predictedValue = intercept + slope * (n + i);
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

        transactions.filter(t => t.type === type).forEach(t => {
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
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + CurrencyService.convert(Math.abs(t.amount), (t as any).currency || targetCurrency, targetCurrency), 0);

        // Assume transactions span ~last month (simplified for now)
        return expenses;
    }

    /**
     * Calculate runway in months
     */
    static calculateRunway(currentBalance: number, monthlyBurn: number): number | null {
        if (monthlyBurn <= 0) return null;
        return Math.floor(currentBalance / monthlyBurn);
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
        const r = annualInterestRate / 100 / 12; // Monthly interest rate decimal

        if (r === 0) {
            return currentBalance + (monthlyNet * months);
        }

        // Formula for future value with monthly deposits:
        // FV = P(1 + r)^n + PMT * [((1 + r)^n - 1) / r]
        // Where P is principal, r is monthly rate, n is number of months, PMT is monthly deposit

        const compoundFactor = Math.pow(1 + r, months);
        const futurePrincipal = currentBalance * compoundFactor;
        const futureContributions = monthlyNet * ((compoundFactor - 1) / r);

        return futurePrincipal + futureContributions;
    }

    /**
     * Calculate current total balance from transactions
     */
    static calculateCurrentBalance(transactions: Transaction[], targetCurrency: string): number {
        return transactions.reduce((sum, t) => {
            const amount = t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount);
            return sum + CurrencyService.convert(amount, t.currency || targetCurrency, targetCurrency);
        }, 0);
    }
}
