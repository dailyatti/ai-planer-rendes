import { AIService } from './AIService';

/**
 * CurrencyService - Professional Currency Management
 * 
 * Features:
 * - Unlimited currencies (not just 3)
 * - Manual exchange rate input
 * - Language-based default currency
 * - AI-powered rate fetching (via Gemini)
 * - localStorage persistence
 */

// Common world currencies
export const AVAILABLE_CURRENCIES = [
    { code: 'HUF', name: 'Magyar Forint', symbol: 'Ft' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
    { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
    { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин' },
    { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn' },
    { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
];

// Language to default currency mapping
const LANGUAGE_CURRENCY_MAP: Record<string, string> = {
    hu: 'HUF',
    en: 'USD',
    de: 'EUR',
    fr: 'EUR',
    es: 'EUR',
    it: 'EUR',
    ro: 'RON',
    sk: 'EUR',
    hr: 'EUR',
    pl: 'PLN',
    cn: 'CNY',
    jp: 'JPY',
    pt: 'EUR',
    tr: 'TRY',
    ar: 'SAR',
    ru: 'RUB',
    hi: 'INR',
    bn: 'INR',
    ur: 'PKR',
    th: 'THB',
    id: 'IDR',
    ko: 'KRW',
};

// Default exchange rates (HUF as base, approximate)
const DEFAULT_RATES: Record<string, number> = {
    HUF: 1,
    EUR: 0.0026,
    USD: 0.0028,
    GBP: 0.0022,
    CHF: 0.0030,
    JPY: 0.42,
    PLN: 0.011,
    CZK: 0.063,
    RON: 0.013,
    TRY: 0.095,
    SEK: 0.029,
    NOK: 0.030,
    DKK: 0.019,
    CAD: 0.0038,
    AUD: 0.0043,
    CNY: 0.020,
    INR: 0.23,
};

interface CurrencyConfig {
    baseCurrency: string;
    rates: Record<string, number>; // Rates TO base currency (e.g., 1 EUR = 385 HUF means rates.EUR = 385)
}

const STORAGE_KEY = 'contentplanner_currency_config';

class CurrencyServiceClass {
    private config: CurrencyConfig = {
        baseCurrency: 'HUF',
        rates: { ...DEFAULT_RATES }
    };

    constructor() {
        this.loadConfig();
    }

    /**
     * Get default currency for a language
     */
    getDefaultCurrency(language: string): string {
        return LANGUAGE_CURRENCY_MAP[language] || 'USD';
    }

    /**
     * Get current base currency
     */
    getBaseCurrency(): string {
        return this.config.baseCurrency;
    }

    /**
     * Set base currency
     */
    setBaseCurrency(currency: string): void {
        this.config.baseCurrency = currency;
        this.saveConfig();
    }

    /**
     * Set exchange rate (amount in source currency = 1 base currency)
     * Example: setRate('EUR', 385) means 1 EUR = 385 HUF (if base is HUF)
     */
    setRate(currency: string, rateToBase: number): void {
        this.config.rates[currency] = rateToBase;
        this.saveConfig();
    }

    /**
     * Get rate for currency (how much base currency equals 1 of this currency)
     */
    getRate(currency: string): number {
        if (currency === this.config.baseCurrency) return 1;
        return this.config.rates[currency] || 1;
    }

    /**
     * Get all rates
     */
    getAllRates(): Record<string, number> {
        return { ...this.config.rates };
    }

    /**
     * Convert amount from one currency to another
     */
    convert(amount: number, from: string, to: string): number {
        if (from === to) return amount;

        const base = this.config.baseCurrency;

        // Convert to base first
        let inBase: number;
        if (from === base) {
            inBase = amount;
        } else {
            const rateFrom = this.config.rates[from] || 1;
            inBase = amount * rateFrom; // e.g., 10 EUR * 385 = 3850 HUF
        }

        // Convert from base to target
        if (to === base) {
            return inBase;
        } else {
            const rateTo = this.config.rates[to] || 1;
            return inBase / rateTo; // e.g., 3850 HUF / 385 = 10 EUR
        }
    }

    /**
     * Format amount with currency symbol
     */
    format(amount: number, currency: string): string {
        const cur = AVAILABLE_CURRENCIES.find(c => c.code === currency);
        const symbol = cur?.symbol || currency;

        // Format based on currency conventions
        const formatted = new Intl.NumberFormat('hu-HU', {
            minimumFractionDigits: currency === 'HUF' || currency === 'JPY' ? 0 : 2,
            maximumFractionDigits: currency === 'HUF' || currency === 'JPY' ? 0 : 2,
        }).format(amount);

        // Symbol placement
        if (['USD', 'GBP', 'CAD', 'AUD'].includes(currency)) {
            return `${symbol}${formatted}`;
        }
        return `${formatted} ${symbol}`;
    }

    /**
     * Fetch exchange rates using AI (Gemini)
     */
    async fetchRatesWithAI(baseCurrency: string = 'HUF'): Promise<{ success: boolean; message: string }> {
        if (!AIService.isConfigured()) {
            return { success: false, message: 'AI nincs beállítva. Állítsd be az Integrációk menüben.' };
        }

        try {
            const currencies = ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'CZK', 'RON'];
            const prompt = `
                Kérlek add meg a mai (${new Date().toLocaleDateString()}) árfolyamokat ${baseCurrency} alapján.
                Válaszolj CSAK JSON formátumban, semmi más szöveget ne írj:
                { "EUR": 385.5, "USD": 360.2, "GBP": 460.1, ... }
                Pénznemek: ${currencies.join(', ')}
                Az érték azt jelenti, hogy 1 [pénznem] = X ${baseCurrency}
            `;

            const result = await AIService.generateText({ prompt, maxTokens: 200 });

            // Parse JSON from response
            const jsonMatch = result.text.match(/\{[^}]+\}/);
            if (jsonMatch) {
                const rates = JSON.parse(jsonMatch[0]);
                Object.entries(rates).forEach(([currency, rate]) => {
                    if (typeof rate === 'number') {
                        this.setRate(currency, rate);
                    }
                });
                return { success: true, message: `Árfolyamok frissítve: ${Object.keys(rates).join(', ')}` };
            }

            return { success: false, message: 'Nem sikerült feldolgozni az AI válaszát.' };
        } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : 'Ismeretlen hiba' };
        }
    }

    /**
     * Load config from localStorage
     */
    private loadConfig(): void {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = {
                    baseCurrency: parsed.baseCurrency || 'HUF',
                    rates: { ...DEFAULT_RATES, ...parsed.rates }
                };
            }
        } catch (e) {
            console.error('CurrencyService: Failed to load config', e);
        }
    }

    /**
     * Save config to localStorage
     */
    private saveConfig(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
        } catch (e) {
            console.error('CurrencyService: Failed to save config', e);
        }
    }
}

export const CurrencyService = new CurrencyServiceClass();
export default CurrencyService;
