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
            const data: Record<string, any> = {};
            const prefixPlanner = 'planner-';
            const prefixSequence = 'invoice_sequence_';

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith(prefixPlanner) || key.startsWith(prefixSequence))) {
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
            a.download = `contentplanner_backup_${new Date().toISOString().split('T')[0]}.json`;
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
    importAll: async (jsonData: any): Promise<{ success: boolean; message: string }> => {
        try {
            if (!jsonData || typeof jsonData !== 'object') {
                return { success: false, message: 'Invalid backup file format' };
            }

            const keys = Object.keys(jsonData);
            const validKeys = keys.filter(k => k.startsWith('planner-') || k.startsWith('invoice_sequence_'));

            if (validKeys.length === 0) {
                return { success: false, message: 'No valid ContentPlanner data found in file.' };
            }

            // Clear existing application data
            // We can't use StorageService.clear() because it might be too aggressive or scoped only to 'planner-'
            // Use a manual clear for safety based on our prefixes
            const prefixPlanner = 'planner-';
            const prefixSequence = 'invoice_sequence_';

            // Collect keys to remove first to avoid index shifting issues during iteration
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith(prefixPlanner) || key.startsWith(prefixSequence))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));

            // Restore data
            validKeys.forEach(key => {
                const value = jsonData[key];
                // if value is object, stringify it, otherwise store as string
                const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
                localStorage.setItem(key, stringValue);
            });

            return { success: true, message: `Successfully restored ${validKeys.length} items.` };
        } catch (error) {
            console.error('Import failed:', error);
            return { success: false, message: 'An unexpected error occurred during import.' };
        }
    }
};
