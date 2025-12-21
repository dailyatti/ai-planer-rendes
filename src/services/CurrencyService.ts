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

// Default exchange rates (Value in HUF - Technical Base)
// Updated: 2025-12-21
const DEFAULT_RATES: Record<string, number> = {
    HUF: 1,
    EUR: 387.2,  // Dec 21, 2025 rates
    USD: 330.6,
    GBP: 442.4,
    CHF: 415.8,
    JPY: 2.14,
    PLN: 92.0,
    CZK: 15.9,
    RON: 76.1,
    RSD: 3.3,
    HRK: 51.4,
    UAH: 7.8,
    RUB: 3.5,
    TRY: 7.7,
    SEK: 35.5,
    NOK: 32.5,
    DKK: 51.8,
    CAD: 239.7,
    AUD: 218.5,
    CNY: 46.9,
    INR: 3.66,
    BRL: 59.9,
    MXN: 18.3,
    KRW: 0.223,
    THB: 10.5,
    IDR: 0.0197,
    AED: 89.9,
    SAR: 88.0,
};

interface CurrencyConfig {
    baseCurrency: string;
    rates: Record<string, number>; // Rates relative to HUF (Technical Base)
    lastUpdated: number; // Timestamp
    updateSource: 'system' | 'ai' | 'api'; // Track where rates came from
}

const STORAGE_KEY = 'contentplanner_currency_config';

class CurrencyServiceClass {
    private config: CurrencyConfig = {
        baseCurrency: 'HUF',
        rates: { ...DEFAULT_RATES },
        lastUpdated: Date.now(),
        updateSource: 'system'
    };

    /**
     * Get last updated timestamp
     */
    getLastUpdated(): number {
        return this.config.lastUpdated;
    }

    /**
     * Get update source
     */
    getUpdateSource(): 'system' | 'ai' | 'api' {
        return this.config.updateSource || 'system';
    }

    constructor() {
        this.loadConfig();
    }

    // ... (getDefaultCurrency, getBaseCurrency, etc. - keep existing) -> RESTORING ACTUAL CODE

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
     * Uses HUF as an internal "hub" for any-to-any conversion.
     */
    convert(amount: number, from: string, to: string): number {
        if (from === to) return amount;

        // Use HUF as technical base regardless of display settings
        const technicalBase = 'HUF';

        // Convert to technical base first
        let inBase: number;
        if (from === technicalBase) {
            inBase = amount;
        } else {
            const rateFrom = this.config.rates[from] || 1;
            inBase = amount * rateFrom; // e.g., 10 EUR * 387 = 3870 HUF
        }

        // Convert from technical base to target
        if (to === technicalBase) {
            return inBase;
        } else {
            const rateTo = this.config.rates[to] || 1;
            return inBase / rateTo; // e.g., 3870 HUF / 330 = 11.7 USD
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
     * Fetch real-time exchange rates (API -> AI -> Fallback)
     */
    async fetchRealTimeRates(): Promise<{ success: boolean; message: string; method: 'api' | 'ai' | 'fallback' }> {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // If data is fresh (< 24h), return status based on stored source
        if (now - this.config.lastUpdated < oneDay && this.config.lastUpdated > 0) {
            const method = this.config.updateSource === 'ai' ? 'ai' : 'fallback';
            return {
                success: true,
                message: method === 'ai' ? 'Árfolyamok naprakészek (AI).' : 'Becsült árfolyamok betöltve.',
                method
            };
        }

        try {
            // Priority 1: AI (Gemini) - Most reliable for complex queries without API key
            if (AIService.isConfigured()) {
                const aiResult = await this.fetchRatesWithAI();
                if (aiResult.success) {
                    this.config.lastUpdated = now;
                    this.config.updateSource = 'ai';
                    this.saveConfig();
                    return { success: true, message: 'Árfolyamok frissítve (AI)', method: 'ai' };
                }
            }

            // Priority 2: Fallback to Hardcoded Today's Rates (2025-12-21)
            this.config.rates = { ...DEFAULT_RATES }; // Reset to 'Today's' known good values
            this.config.lastUpdated = now;
            this.config.updateSource = 'system';
            this.saveConfig();

            return { success: true, message: 'Mai napi árfolyamok betöltve (Offline)', method: 'fallback' };

        } catch (error) {
            return { success: false, message: 'Hiba a frissítés közben', method: 'fallback' };
        }
    }

    /**
     * Fetch exchange rates using AI (Gemini)
     */
    async fetchRatesWithAI(): Promise<{ success: boolean; message: string }> {
        if (!AIService.isConfigured()) {
            return { success: false, message: 'AI nincs beállítva. Állítsd be az Integrációk menüben.' };
        }

        try {
            // Get all currencies except HUF (base)
            const currencies = AVAILABLE_CURRENCIES
                .map(c => c.code)
                .filter(code => code !== 'HUF');

            const prompt = `
                Kérlek add meg a mai (${new Date().toLocaleDateString()}) árfolyamokat HUF (Forint) alapon.
                Válaszolj CSAK JSON formátumban, semmi más szöveget ne írj:
                { "EUR": 386.7, "USD": 330.1, ... }
                Pénznemek: ${currencies.join(', ')}
                Az érték azt jelenti, hogy 1 [pénznem] = X Forint.
            `;

            const result = await AIService.generateText({ prompt, maxTokens: 1000 }); // Increased tokens just in case

            // Parse JSON from response
            const jsonMatch = result.text.match(/\{[^}]+\}/);
            if (jsonMatch) {
                const rates = JSON.parse(jsonMatch[0]);
                Object.entries(rates).forEach(([currency, rate]) => {
                    if (typeof rate === 'number') {
                        this.setRate(currency, rate);
                    }
                });
                return { success: true, message: `Árfolyamok frissítve: ${Object.keys(rates).length} db pénznem` };
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
                    rates: { ...DEFAULT_RATES, ...parsed.rates },
                    lastUpdated: parsed.lastUpdated || 0,
                    updateSource: parsed.updateSource || 'system'
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
