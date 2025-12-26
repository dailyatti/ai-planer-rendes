export const InvoiceCalculator = {
    /**
     * Calculates the subtotal, tax amount, and total for an invoice.
     * @param items Array of invoice items { quantity, rate }
     * @param taxRate Tax rate percentage (e.g., 27 for 27%)
     * @param currency Currency code (e.g., 'HUF', 'USD', 'EUR')
     * @param discount Global discount amount (optional)
     */
    calculateTotals: (
        items: { quantity: number; rate: number }[],
        taxRate: number,
        currency: string,
        discount: number = 0
    ) => {
        // HUF uses 0 decimal places, others (USD, EUR) use 2
        const fractionDigits = currency === 'HUF' ? 0 : 2;

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

        // Calculate tax based on subtotal (after discount could be an option, but usually tax is on net)
        // Note: Logic might vary if discount is applied before or after tax. 
        // Standard simplified: (Subtotal - Discount) * TaxRate? Or Subtotal * TaxRate?
        // Let's assume Discount is on Net price usually.
        const taxableAmount = Math.max(0, subtotal - discount);
        const taxAmount = (taxableAmount * taxRate) / 100;
        const total = taxableAmount + taxAmount;

        // Helper to rounds numbers based on currency
        const round = (num: number) => {
            const factor = Math.pow(10, fractionDigits);
            return Math.round(num * factor) / factor;
        };

        return {
            subtotal: round(subtotal),
            taxAmount: round(taxAmount),
            total: round(total),
            fractionDigits
        };
    },

    /**
     * Formats a currency value based on standard locale rules.
     */
    formatCurrency: (value: number, currency: string, language: string = 'en-US'): string => {
        const fractionDigits = currency === 'HUF' ? 0 : 2;
        try {
            return new Intl.NumberFormat(language, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: fractionDigits,
                maximumFractionDigits: fractionDigits,
            }).format(value);
        } catch (error) {
            // Fallback if currency code is invalid
            return `${value} ${currency}`;
        }
    }
};
