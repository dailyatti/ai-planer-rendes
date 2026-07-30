/**
 * MigrationService
 * Handles the migration of data from legacy 'contentplanner-' keys to 'digitalplanner-' keys.
 * Runs once on application startup.
 */

export const MigrationService = {
    run: () => {
        try {
            if (typeof window === 'undefined') return;

            let migrationCount = 0;

            const copyIfMissing = (legacyKey: string, currentKey: string) => {
                const legacyValue = localStorage.getItem(legacyKey);
                if (legacyValue !== null && localStorage.getItem(currentKey) === null) {
                    localStorage.setItem(currentKey, legacyValue);
                    migrationCount += 1;
                }
            };

            // 1. Migrate AI Configuration
            copyIfMissing('contentplanner_ai_config', 'digitalplanner_ai_config');

            // 2. Migrate App Settings
            copyIfMissing('contentplanner-settings', 'digitalplanner-settings');

            // 3. Preserve legacy financial data. Never delete user data during startup.
            copyIfMissing('contentplanner-transactions', 'planner-transactions');

            // Retire the historical destructive migrations without executing them.
            localStorage.setItem('migration_1_1_82_purge', 'retired-without-deletion');
            localStorage.setItem('migration_1_1_91_nuclear', 'retired-without-deletion');

            if (migrationCount > 0) console.info(`Migration completed: ${migrationCount} items copied.`);

        } catch (error) {
            console.error('Migration failed:', error);
        }
    }
};
