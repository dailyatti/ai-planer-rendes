import { AIService } from './AIService';
import { AVAILABLE_CURRENCIES, DEFAULT_RATES, LANGUAGE_CURRENCY_MAP } from '../constants/currencyData';
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

// Definitions moved to constants/currencyData.ts

interface CurrencyConfig {
    baseCurrency: string;
    rates: Record<string, number>; // Rates relative to HUF (Technical Base)
    lastUpdated: number; // Timestamp
    updateSource: 'system' | 'ai' | 'api'; // Track where rates came from
}

const STORAGE_KEY = 'contentplanner_currency_config';

class CurrencyServiceClass {
    private config: CurrencyConfig = {
        baseCurrency: 'USD',
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

        // Defensive check for config presence
        if (!this.config || !this.config.rates) {
            console.warn('CurrencyService: Config or rates missing, returning raw amount');
            return amount;
        }

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
        const formatted = new Intl.NumberFormat('en-US', {
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
     * Fetch real-time exchange rates (Free API -> AI -> Fallback)
     */
    async fetchRealTimeRates(force: boolean = false): Promise<{ success: boolean; message: string; method: 'api' | 'ai' | 'fallback' }> {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // If data is fresh (<24h) and not forced, return status based on stored source
        if (!force && now - this.config.lastUpdated < oneDay && this.config.lastUpdated > 0) {
            const method = this.config.updateSource || 'fallback';
            return {
                success: true,
                message: method === 'api' ? 'Árfolyamok naprakészek (API).' : method === 'ai' ? 'Árfolyamok naprakészek (AI).' : 'Becsült árfolyamok betöltve.',
                method: method as 'api' | 'ai' | 'fallback'
            };
        }

        try {
            // Priority 1: Free Exchange Rate API (exchangerate.host - no API key required)
            const apiResult = await this.fetchRatesFromAPI();
            if (apiResult.success) {
                this.config.lastUpdated = now;
                this.config.updateSource = 'api';
                this.saveConfig();
                return { success: true, message: 'Árfolyamok frissítve (API)', method: 'api' };
            }

            // Priority 2: AI (Gemini) - Good for when API is unavailable
            if (AIService.isConfigured()) {
                const aiResult = await this.fetchRatesWithAI();
                if (aiResult.success) {
                    this.config.lastUpdated = now;
                    this.config.updateSource = 'ai';
                    this.saveConfig();
                    return { success: true, message: 'Árfolyamok frissítve (AI)', method: 'ai' };
                }
            }

            // Priority 3: Fallback to Hardcoded Today's Rates
            this.config.rates = { ...DEFAULT_RATES };
            this.config.lastUpdated = now;
            this.config.updateSource = 'system';
            this.saveConfig();

            return { success: true, message: 'Mai napi árfolyamok betöltve (Offline)', method: 'fallback' };

        } catch (error) {
            return { success: false, message: 'Hiba a frissítés közben', method: 'fallback' };
        }
    }

    /**
     * Fetch exchange rates from free API (exchangerate.host)
     * No API key required, 250 requests/month on free tier
     */
    async fetchRatesFromAPI(): Promise<{ success: boolean; message: string }> {
        try {
            // Using exchangerate.host - free, no key required
            const response = await fetch('https://api.exchangerate.host/latest?base=HUF');

            if (!response.ok) {
                return { success: false, message: `API hiba: ${response.status}` };
            }

            const data = await response.json();

            if (!data.success && data.success !== undefined) {
                return { success: false, message: 'API nem elérhető' };
            }

            // exchangerate.host returns rates FROM base, we need rates TO base (inverted)
            // data.rates = { EUR: 0.00258, USD: 0.00303, ... } means 1 HUF = 0.00258 EUR
            // We need: 1 EUR = 387.6 HUF, so we invert
            const rates = data.rates;
            if (rates) {
                Object.entries(rates).forEach(([currency, rate]) => {
                    if (typeof rate === 'number' && rate > 0 && currency !== 'HUF') {
                        const invertedRate = 1 / rate; // 1 EUR = X HUF
                        this.setRate(currency, invertedRate);
                    }
                });
                return { success: true, message: `Árfolyamok frissítve: ${Object.keys(rates).length} pénznem` };
            }

            return { success: false, message: 'Nincs adat az API válaszban' };
        } catch (error) {
            console.warn('CurrencyService: API fetch failed', error);
            return { success: false, message: error instanceof Error ? error.message : 'API hiba' };
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
                    baseCurrency: parsed.baseCurrency || 'USD',
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
