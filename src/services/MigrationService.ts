/**
 * MigrationService
 * Handles the migration of data from legacy 'contentplanner-' keys to 'digitalplanner-' keys.
 * Runs once on application startup.
 */

export const MigrationService = {
    run: async () => {
        try {
            if (typeof window === 'undefined') return;

            console.log('Checking for data migration...');
            let migrationCount = 0;

            // 1. Migrate AI Configuration
            const legacyAiConfig = localStorage.getItem('contentplanner_ai_config');
            const newAiConfig = localStorage.getItem('digitalplanner_ai_config');

            if (legacyAiConfig && !newAiConfig) {
                localStorage.setItem('digitalplanner_ai_config', legacyAiConfig);
                console.log('Migrated AI Config');
                migrationCount++;
            }

            // 2. Migrate App Settings
            const legacySettings = localStorage.getItem('contentplanner-settings');
            const newSettings = localStorage.getItem('digitalplanner-settings');

            if (legacySettings && !newSettings) {
                localStorage.setItem('digitalplanner-settings', legacySettings);
                console.log('Migrated App Settings');
                migrationCount++;
            }

            // 3. Migrate Generic Planner Data (optional, mostly 'planner-' is used which is generic)
            // But if we have specific 'contentplanner-' prefixed items in future, add here.

            // 3. Purge Legacy Transactions (For v1.1.81+ Hotfix)
            // Removes potentially corrupt data from previous buggy versions
            const purgeTransactionsKey = 'migration_1_1_82_purge';
            if (!localStorage.getItem(purgeTransactionsKey)) {
                console.warn('EXECUTING NUCLEAR TRANSACTION PURGE');
                localStorage.removeItem('planner-transactions'); // Main transaction store
                localStorage.removeItem('contentplanner-transactions'); // Possible legacy
                localStorage.removeItem('planner.financial.cache'); // Analytics cache

                localStorage.setItem(purgeTransactionsKey, 'true');
                console.log('PURGE COMPLETE: All transaction data has been wiped for safety.');
                migrationCount++;
            }

            // 4. NUCLEAR RESET v1.1.91 (User requested clear-all)
            const purge1191Key = 'migration_1_1_91_nuclear';
            if (!localStorage.getItem(purge1191Key)) {
                console.warn('EXECUTING NUCLEAR RESET v1.1.91');
                localStorage.removeItem('planner-transactions');
                localStorage.removeItem('contentplanner-transactions');
                localStorage.removeItem('planner.financial.cache');

                // Also clear settings to be safe
                localStorage.removeItem('digitalplanner-settings');
                localStorage.removeItem('contentplanner_ai_config');
                localStorage.removeItem('digitalplanner_ai_config');

                localStorage.setItem(purge1191Key, 'true');
                console.log('NUCLEAR RESET COMPLETE');
                migrationCount++;
            }

            if (migrationCount > 0) {
                console.log(`Migration completed: ${migrationCount} items migrated.`);
            } else {
                console.log('Migration active: system up to date.');
            }

        } catch (error) {
            console.error('Migration failed:', error);
        }
    }
};
