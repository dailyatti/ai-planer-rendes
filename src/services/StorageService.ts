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
     * Clear all app-specific keys
     */
    static clear(): void {
        if (typeof window === 'undefined') return;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    }
}
