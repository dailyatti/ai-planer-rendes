import { JsonProfile } from '../types/planner';

const getRecordId = (value: unknown): string | number | undefined => {
    if (!value || typeof value !== 'object' || !('id' in value)) return undefined;
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' || typeof id === 'number' ? id : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * DataTransferService
 * Handles the export and import of all application data.
 * "PhD-level" implementation with comprehensive error handling and validation.
 */
export const DataTransferService = {
    /**
     * Exports all application data to a JSON file.
     * Captures all localStorage keys starting with 'planner-' and 'invoice_sequence_'.
     */
    exportAll: () => {
        try {
            const data: Record<string, unknown> = {};
            const prefixPlanner = 'planner-';
            const prefixSequence = 'invoice_sequence_';
            const prefixDigital = 'digitalplanner-'; // New
            const prefixContent = 'contentplanner-'; // Legacy

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.startsWith(prefixPlanner) ||
                    key.startsWith(prefixSequence) ||
                    key.startsWith(prefixDigital) ||
                    key.startsWith(prefixContent)
                )) {
                    try {
                        // Attempt to parse JSON values to avoid double-stringification
                        const value = localStorage.getItem(key);
                        if (value) {
                            try {
                                data[key] = JSON.parse(value);
                            } catch {
                                // If not valid JSON, store as string
                                data[key] = value;
                            }
                        }
                    } catch (e) {
                        console.warn(`Skipping key ${key} due to read error`, e);
                    }
                }
            }

            // Create a blob and trigger download
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `digitalplanner_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true, count: Object.keys(data).length };
        } catch (error) {
            console.error('Export failed:', error);
            return { success: false, error };
        }
    },

    /**
     * Imports application data from a JSON object.
     * Clears existing data and restores from the provided object.
     * @param jsonData The parsed JSON object from the backup file
     */
    importAll: async (jsonData: unknown): Promise<{ success: boolean; message: string }> => {
        try {
            if (!jsonData || typeof jsonData !== 'object') {
                return { success: false, message: 'Invalid backup file format' };
            }
            const payload = jsonData as Record<string, unknown>;

            const keys = Object.keys(payload);
            const validKeys = keys.filter(k =>
                k.startsWith('planner-') ||
                k.startsWith('invoice_sequence_') ||
                k.startsWith('digitalplanner-') ||
                k.startsWith('contentplanner-')
            );

            if (validKeys.length === 0) {
                return { success: false, message: 'No valid Digital Planner Pro data found in file.' };
            }

            // Clear existing application data
            // We can't use StorageService.clear() because it might be too aggressive or scoped only to 'planner-'
            // Use a manual clear for safety based on our prefixes
            const prefixPlanner = 'planner-';
            const prefixSequence = 'invoice_sequence_';
            const prefixDigital = 'digitalplanner-';
            const prefixContent = 'contentplanner-';

            // Collect keys to remove first to avoid index shifting issues during iteration
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.startsWith(prefixPlanner) ||
                    key.startsWith(prefixSequence) ||
                    key.startsWith(prefixDigital) ||
                    key.startsWith(prefixContent)
                )) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));

            // Restore data
            validKeys.forEach(key => {
                const value = payload[key];
                // if value is object, stringify it, otherwise store as string
                const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                localStorage.setItem(key, stringValue);
            });

            return { success: true, message: `Successfully restored ${validKeys.length} items.` };
        } catch (error) {
            console.error('Import failed:', error);
            return { success: false, message: 'An unexpected error occurred during import.' };
        }
    },

    /**
     * Imports application data from a JSON object and MERGES it with existing data.
     * Arrays are concatenated (or deduplicated), and objects might be ignored if they are user-specific settings.
     */
    importMerge: async (jsonData: unknown): Promise<{ success: boolean; message: string }> => {
        try {
            if (!jsonData || typeof jsonData !== 'object') {
                return { success: false, message: 'Invalid backup file format' };
            }
            const payload = jsonData as Record<string, unknown>;

            const keys = Object.keys(payload);
            const validKeys = keys.filter(k => 
                k.startsWith('planner-') || 
                k.startsWith('invoice_sequence_') || 
                k.startsWith('digitalplanner-') ||
                k.startsWith('contentplanner-')
            );

            if (validKeys.length === 0) {
                return { success: false, message: 'No valid Digital Planner Pro data found in file.' };
            }

            // Define keys that should NOT be merged (e.g. user specific settings)
            const skipKeys = ['planner-budget-settings', 'planner-settings', 'digitalplanner-budget-settings'];

            let itemsMerged = 0;

            for (const key of validKeys) {
                if (skipKeys.includes(key)) {
                    continue; // Skip user-specific settings to keep the base user's settings intact
                }

                const newValue = payload[key];
                const existingValueStr = localStorage.getItem(key);

                if (!existingValueStr) {
                    // It doesn't exist locally, just add it.
                    localStorage.setItem(key, typeof newValue === 'string' ? newValue : JSON.stringify(newValue));
                    itemsMerged++;
                    continue;
                }

                // If it exists locally, we try to merge if it's an array
                try {
                    const existingValue: unknown = JSON.parse(existingValueStr);
                    
                    if (Array.isArray(existingValue) && Array.isArray(newValue)) {
                        // Merge arrays
                        // Could deduplicate by ID if objects have ID
                        const existingIds = new Set(
                            existingValue
                                .map(getRecordId)
                                .filter((id): id is string | number => id !== undefined)
                        );
                        const itemsToAdd = newValue.filter(item => {
                            const id = getRecordId(item);
                            if (id !== undefined) return !existingIds.has(id);
                            // If no ID, append it
                            return true;
                        });
                        
                        const mergedArray = [...existingValue, ...itemsToAdd];
                        localStorage.setItem(key, JSON.stringify(mergedArray));
                        itemsMerged++;
                    } else if (isRecord(existingValue) && isRecord(newValue)) {
                        // Merge objects
                        const mergedObj = { ...existingValue, ...newValue };
                        localStorage.setItem(key, JSON.stringify(mergedObj));
                        itemsMerged++;
                    } else {
                        // For primitives or unmergable types, we just overwrite (or ignore). Let's overwrite.
                        localStorage.setItem(key, typeof newValue === 'string' ? newValue : JSON.stringify(newValue));
                        itemsMerged++;
                    }
                } catch {
                    // Not a JSON string (maybe raw string), just overwrite
                    localStorage.setItem(key, String(newValue));
                    itemsMerged++;
                }
            }

            return { success: true, message: `Successfully merged ${itemsMerged} data groups.` };
        } catch (error) {
            console.error('Merge failed:', error);
            return { success: false, message: 'An unexpected error occurred during merge.' };
        }
    },

    // --- Profile Management ---
    PROFILES_STORAGE_KEY: 'planner-json-profiles',

    getProfiles: (): JsonProfile[] => {
        try {
            const dataStr = localStorage.getItem(DataTransferService.PROFILES_STORAGE_KEY);
            if (!dataStr) return [];
            const profiles = JSON.parse(dataStr) as JsonProfile[];
            // Parse dates
            return profiles.map(p => ({
                ...p,
                createdAt: new Date(p.createdAt)
            }));
        } catch (e) {
            console.error('Failed to load profiles:', e);
            return [];
        }
    },

    saveProfile: (name: string, jsonData: string): boolean => {
        try {
            const profiles = DataTransferService.getProfiles();
            const newProfile: JsonProfile = {
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
                name,
                data: jsonData,
                createdAt: new Date()
            };
            profiles.push(newProfile);
            
            // Note: Since each profile contains a full export, we must be mindful of localStorage limit (usually 5-10MB).
            // This is handled by a standard try-catch limit exception.
            localStorage.setItem(DataTransferService.PROFILES_STORAGE_KEY, JSON.stringify(profiles));
            return true;
        } catch (error) {
            console.error('Failed to save profile. Storage might be full.', error);
            return false;
        }
    },

    deleteProfile: (id: string): void => {
        try {
            const profiles = DataTransferService.getProfiles();
            const filtered = profiles.filter(p => p.id !== id);
            localStorage.setItem(DataTransferService.PROFILES_STORAGE_KEY, JSON.stringify(filtered));
        } catch (e) {
            console.error('Failed to delete profile:', e);
        }
    },

    renameProfile: (id: string, newName: string): void => {
        try {
            const profiles = DataTransferService.getProfiles();
            const updated = profiles.map(p => p.id === id ? { ...p, name: newName } : p);
            localStorage.setItem(DataTransferService.PROFILES_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to rename profile:', e);
        }
    }
};
