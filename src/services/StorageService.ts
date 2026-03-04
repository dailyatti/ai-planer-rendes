/**
 * StorageService.ts
 * PhD-level LocalStorage wrapper with strong typing, error handling, and serialization.
 */

export class StorageService {
    private static PREFIX = 'planner-';

    /**
     * Safe JSON parse with error handling
     */
    private static parse<T>(value: string | null): T | null {
        if (!value) return null;
        try {
            // Handle "undefined" string edge case
            if (value === 'undefined') return null;
            return JSON.parse(value) as T;
        } catch (error) {
            console.error(`StorageService Parse Error:`, error);
            return null;
        }
    }

    /**
     * Safe JSON stringify with error handling
     */
    private static stringify<T>(value: T): string | null {
        try {
            return JSON.stringify(value);
        } catch (error) {
            console.error(`StorageService Stringify Error:`, error);
            return null;
        }
    }

    /**
     * Get item from localStorage with type safety
     * @param key The key (without prefix)
     * @param fallback Optional fallback value if null or parse error
     */
    static get<T>(key: string, fallback: T | null = null): T | null {
        if (typeof window === 'undefined') return fallback;
        const value = localStorage.getItem(this.PREFIX + key);
        const parsed = this.parse<T>(value);
        return parsed ?? fallback;
    }

    /**
     * Set item in localStorage
     * @param key The key (without prefix)
     * @param value The value to store
     */
    static set<T>(key: string, value: T): void {
        if (typeof window === 'undefined') return;
        const stringified = this.stringify(value);
        if (stringified !== null) {
            localStorage.setItem(this.PREFIX + key, stringified);
        }
    }

    /**
     * Remove item from localStorage
     * @param key The key (without prefix)
     */
    static remove(key: string): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.PREFIX + key);
    }

    /**
     * Clear all app-specific keys (planner-, invoice_sequence_, digitalplanner-)
     * NOTE: Does NOT delete 'v1.*' migration flags - those must survive to prevent
     * MigrationService from running nuclear resets on the next page load.
     */
    static clear(): void {
        if (typeof window === 'undefined') return;
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.startsWith(this.PREFIX) ||
                key.startsWith('invoice_sequence_') ||
                key.startsWith('digitalplanner-')
            )) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }
}
