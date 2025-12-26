import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronRight, FileText, Trash2, Users, ArrowUpRight, Clock, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Invoice, Client } from '../../../../types/planner';
import { FinancialEngine } from '../../../../utils/FinancialEngine';
import { CurrencyService } from '../../../../services/CurrencyService'; // Assuming path
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../../../../utils/formatters';

interface InvoicingDashboardProps {
    invoices: Invoice[];
    clients: Client[];
    onNavigateToTab: (tab: 'dashboard' | 'invoices' | 'clients' | 'analytics') => void;
    onDownloadPdf: (invoice: Invoice) => void;
    onDeleteInvoice: (id: string) => void;
}

export const InvoicingDashboard: React.FC<InvoicingDashboardProps> = ({
    invoices,
    clients,
    onNavigateToTab,
    onDownloadPdf,
    onDeleteInvoice
}) => {
    const { t } = useLanguage();
    const [selectedStat, setSelectedStat] = useState<{ title: string; breakdown: Record<string, number>; rect: DOMRect } | null>(null);

    const popoverRef = useRef<HTMLDivElement>(null);

    // Close popover on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setSelectedStat(null);
            }
        };

        if (selectedStat) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [selectedStat]);

    const stats = useMemo(() => ({
        outstanding: formatCurrency(FinancialEngine.calculatePending(invoices, 'USD'), 'USD'),
        overdue: formatCurrency(FinancialEngine.calculateOverdue(invoices, 'USD'), 'USD'),
        paid: formatCurrency(FinancialEngine.calculatePaid(invoices, 'USD'), 'USD'),
        totalClients: clients.length
    }), [invoices, clients.length]);

    const statCards = [
        {
            label: t('invoicing.pending'),
            value: stats.outstanding,
            icon: Clock,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            status: 'sent' as const
        },
        {
            label: t('invoicing.paid'),
            value: stats.paid,
            icon: CheckCircle,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            status: 'paid' as const
        },
        {
            label: t('invoicing.overdue'),
            value: stats.overdue,
            icon: ArrowUpRight,
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            status: 'overdue' as const // Using overdue as status filter for breakdown
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <button
                        key={i}
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            // Logic: Get breakdown for specific status(es)
                            // Logic: Get breakdown for specific status
                            // FinancialEngine helper might need adjustment if it only accepts single status string.
                            // Assuming getAmountsByCurrency filters by the passed status.
                            // If original code passed 'sent' for pending, I do same.
                            const breakdown = FinancialEngine.getAmountsByCurrency(invoices, stat.status);
                            setSelectedStat({ title: stat.label, breakdown, rect });
                        }}
                        className="card p-6 border border-transparent shadow-sm hover:shadow-xl transition-all text-left relative group w-full bg-white dark:bg-gray-800 hover:-translate-y-1 duration-300 rounded-xl"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition-colors flex items-center gap-2">
                                {stat.label}
                                <Search size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                    </button>
                ))}

                {/* Clients Card */}
                <div
                    onClick={() => onNavigateToTab('clients')}
                    className="card p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-white dark:bg-gray-800 rounded-xl"
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition-colors">{t('invoicing.clients')}</span>
                        <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalClients}</div>
                </div>
            </div>

            {/* Popover */}
            {selectedStat && (
                <div
                    ref={popoverRef}
                    className="absolute top-full left-0 mt-4 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 p-4 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                        {t('invoicing.detailsOf')?.replace('{label}', selectedStat.title) || `${selectedStat.title} Details`}
                    </h4>
                    <div className="space-y-2">
                        {Object.entries(selectedStat.breakdown).map(([currency, amount]) => (
                            <div key={currency} className="flex justify-between items-center text-sm">
                                <span className="font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded">{currency}</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{CurrencyService.format(amount, currency)}</span>
                            </div>
                        ))}
                        {Object.keys(selectedStat.breakdown).length === 0 && (
                            <div className="text-gray-400 text-sm italic text-center py-2">{t('common.noData')}</div>
                        )}
                    </div>
                </div>
            )}

            {/* Recent Invoices */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('invoicing.invoices')}</h3>
                    <button onClick={() => onNavigateToTab('invoices')} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                        {t('common.viewAll')} <ChevronRight size={16} />
                    </button>
                </div>
                <div className="space-y-4">
                    {invoices.slice(0, 5).map(invoice => (
                        <div
                            key={invoice.id}
                            onClick={() => onDownloadPdf(invoice)}
                            className="group flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all shadow-sm hover:shadow-md cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-lg bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600">
                                    <FileText size={20} className="text-gray-500" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        {invoice.invoiceNumber}
                                        <span className="text-xs font-normal text-gray-500">• {formatDate(invoice.issueDate)}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {clients.find(c => c.id === invoice.clientId)?.name || 'Unknown'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total, invoice.currency)}</div>
                                    <div className="flex justify-end mt-1"><StatusBadge status={invoice.status} /></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(t('invoicing.confirmDelete'))) {
                                                onDeleteInvoice(invoice.id);
                                            }
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title={t('common.delete')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
                                </div>
                            </div>
                        </div>
                    ))}
                    {invoices.length === 0 && <p className="text-gray-500 text-center py-4">{t('common.noData')}</p>}
                </div>
            </div>
        </div>
    );
};
