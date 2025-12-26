export const SequenceService = {
    /**
     * storage key prefix for invoice sequences
     */
    STORAGE_KEY_PREFIX: 'invoice_sequence_',

    /**
     * Generates a sequential invoice number based on company ID and year.
     * Format: INV-{YEAR}-{SEQUENCE} (e.g., INV-2025-0001)
     * 
     * @param companyId Unique identifier for the simple company context (can be 'default' if not multi-tenant)
     * @param year The year for the invoice number
     */
    getNextInvoiceNumber: (companyId: string = 'default', year: number = new Date().getFullYear()): string => {
        const key = `${SequenceService.STORAGE_KEY_PREFIX}${companyId}_${year}`;

        // Retrieve current sequence from localStorage
        const storedSequence = localStorage.getItem(key);
        let currentSequence = storedSequence ? parseInt(storedSequence, 10) : 0;

        // Increment sequence
        currentSequence++;

        // Save new sequence to localStorage
        localStorage.setItem(key, currentSequence.toString());

        // Format the invoice number
        const sequenceString = currentSequence.toString().padStart(4, '0');
        return `INV-${year}-${sequenceString}`;
    },

    /**
     * Returns the current (last generated) sequence number for display or debugging
     */
    getCurrentSequence: (companyId: string = 'default', year: number = new Date().getFullYear()): number => {
        const key = `${SequenceService.STORAGE_KEY_PREFIX}${companyId}_${year}`;
        const storedSequence = localStorage.getItem(key);
        return storedSequence ? parseInt(storedSequence, 10) : 0;
    }
};
