/**
 * PhD‑level financial calculations used across the app.
 * All functions are pure and unit‑testable.
 */
export class FinancialMathService {
    /** Linear regression on cash‑flow series */
    static linearRegression(x: number[], y: number[]) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
        const sumXX = x.reduce((s, xi) => s + xi * xi, 0);
        const a = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const b = (sumY - a * sumX) / n;
        return { a, b, predict: (xVal: number) => a * xVal + b };
    }

    /** Compound growth (future value) */
    static futureValue(present: number, rate: number, periods: number) {
        return present * Math.pow(1 + rate, periods);
    }

    /** Burn‑rate (average monthly outflow) */
    static burnRate(transactions: { amount: number; type: 'income' | 'expense' }[], months: number) {
        const expenseSum = transactions
            .filter(t => t.type === 'expense')
            .reduce((s, t) => s + t.amount, 0);
        return expenseSum / months;
    }

    /** Runway in months */
    static runway(currentBalance: number, burnRate: number) {
        return burnRate === 0 ? Infinity : currentBalance / burnRate;
    }

    /** Net Present Value */
    static npv(cashFlows: number[], rate: number) {
        return cashFlows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i + 1), 0);
    }

    /** Internal Rate of Return – Newton‑Raphson approximation */
    static irr(cashFlows: number[], guess = 0.1) {
        let r = guess;
        for (let i = 0; i < 20; i++) {
            const npv = this.npv(cashFlows, r);
            const derivative = cashFlows.reduce(
                (sum, cf, idx) => sum - (idx + 1) * cf / Math.pow(1 + r, idx + 2),
                0,
            );
            const newR = r - npv / derivative;
            if (Math.abs(newR - r) < 1e-7) break;
            r = newR;
        }
        return r;
    }
}
