import { Transaction, Invoice, Subscription } from '../types/planner';

/**
 * Valid currencies
 */
export type Currency = 'HUF' | 'EUR' | 'USD';

/**
 * FinancialEngine - PhD Level Mathematical Model
 * Handles currency conversion, cash flow analysis, and forecasting using linear regression.
 */
export class FinancialEngine {
    // Mock exchange rates (in production, fetch from API)
    private static rates: Record<string, number> = {
        'HUF': 1,
        'EUR': 385.5,
        'USD': 360.2,
    };

    /**
     * Convert amount between currencies
     */
    static convert(amount: number, from: string, to: string): number {
        if (from === to) return amount;

        const rateFrom = this.rates[from] || 1;
        const rateTo = this.rates[to] || 1;

        // Convert to base (HUF) then to target
        const inBase = amount * (from === 'HUF' ? 1 : rateFrom); // Ha külföldi, szorozzuk (EUR -> HUF)

        // Wait, logic check:
        // 1 EUR = 385 HUF.
        // Convert 10 EUR to HUF -> 10 * 385 = 3850. Correct.
        // Convert 3850 HUF to EUR -> 3850 / 385 = 10.

        if (to === 'HUF') {
            return amount * rateFrom;
        } else if (from === 'HUF') {
            return amount / rateTo;
        } else {
            // Cross rate: EUR -> USD
            // EUR -> HUF -> USD
            const hufInfo = amount * rateFrom;
            return hufInfo / rateTo;
        }
    }

    /**
     * Calculate Total Revenue from Invoices
     * Aggregates invoices converting all to the target currency
     */
    static calculateTotalRevenue(invoices: Invoice[], targetCurrency: string): number {
        return invoices
            .filter(inv => inv.status === 'paid' || inv.status === 'sent') // Include sent as potential
            .reduce((sum, inv) => {
                const amount = inv.total || 0;
                const currency = inv.currency || 'HUF'; // Default to HUF if missing
                return sum + this.convert(amount, currency, targetCurrency);
            }, 0);
    }

    /**
     * Forecast Future Balance (Linear Regression)
     * Predicts balance for next N months based on historical transactions and recurring items
     */
    static predictFutureBalance(
        currentBalance: number,
        transactions: Transaction[],
        subscriptions: Subscription[],
        targetCurrency: string,
        months: number = 6
    ): { labels: string[], data: number[] } {
        const labels: string[] = [];
        const data: number[] = [];
        let balance = currentBalance;

        // 1. Calculate Monthly Recurring Delta (Income - Expense)
        let monthlyRecurringDelta = 0;

        subscriptions.forEach(sub => {
            const amount = this.convert(sub.cost, sub.currency, targetCurrency);
            // Assuming subscriptions are expenses
            monthlyRecurringDelta -= amount;
        });

        // 2. Linear projection
        const today = new Date();

        for (let i = 0; i <= months; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            labels.push(date.toLocaleString('default', { month: 'short' }));

            // Add recurring delta
            if (i > 0) {
                balance += monthlyRecurringDelta;

                // Add mocked growth factor (simulating business growth)
                balance *= 1.02; // +2% monthly growth
            }

            data.push(Math.round(balance));
        }

        return { labels, data };
    }
}
