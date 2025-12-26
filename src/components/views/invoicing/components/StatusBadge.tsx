import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Invoice } from '../../../../types/planner';

interface StatusBadgeProps {
    status: Invoice['status'];
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const { t } = useLanguage();

    const styles: Record<Invoice['status'], string> = {
        draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        sent: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
        paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
        overdue: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
        cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 decoration-slice line-through',
    };

    const labels: Record<Invoice['status'], string> = {
        draft: t('invoicing.statusDraft'),
        sent: t('invoicing.pending'),
        paid: t('invoicing.paid'),
        overdue: t('invoicing.overdue'),
        cancelled: t('invoicing.statusCancelled'),
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
            {status === 'paid' && <CheckCircle size={12} />}
            {labels[status]}
        </span>
    );
};
