import React from 'react';
import { Search, Filter, Trash2, Download, Share2, Check, Send } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Invoice, Client } from '../../../../types/planner';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../../../../utils/formatters';

interface InvoiceListProps {
    invoices: Invoice[];
    clients: Client[];
    selectedIds: Set<string>;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onSelectAll: () => void;
    onToggleSelect: (id: string, e: React.MouseEvent) => void;
    onStatusChange: (id: string, status: Invoice['status']) => void;
    onDelete: (id: string) => void;
    onBulkDelete: () => void;
    onDeleteAll: () => void;
    onDownload: (invoice: Invoice) => void;
    onShare: (invoice: Invoice) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
    invoices,
    clients,
    selectedIds,
    searchQuery,
    onSearchChange,
    onSelectAll,
    onToggleSelect,
    onStatusChange,
    onDelete,
    onBulkDelete,
    onDeleteAll,
    onDownload,
    onShare
}) => {
    const { t } = useLanguage();

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="relative flex-1 w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        className="input-field pl-10 w-full"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={onBulkDelete}
                            className="btn-danger flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg transition-all animate-in fade-in"
                        >
                            <Trash2 size={16} />
                            <span>{t('invoicing.deleteSelected')} ({selectedIds.size})</span>
                        </button>
                    )}
                    {invoices.length > 0 && (
                        <button
                            onClick={onDeleteAll}
                            className="btn-secondary flex items-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title={t('invoicing.confirmDeleteAll')}
                        >
                            <Trash2 size={16} />
                            <span className="hidden sm:inline">{t('common.delete')} All</span>
                        </button>
                    )}
                    <button className="btn-secondary flex items-center gap-2">
                        <Filter size={18} /> {t('common.filter')}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                <th className="py-3 px-4 w-10">
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors cursor-pointer"
                                            checked={invoices.length > 0 && selectedIds.size === invoices.length}
                                            onChange={onSelectAll}
                                        />
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('invoicing.invoiceNumber')}</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('invoicing.clients')}</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('invoicing.invoiceDate')}</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{t('invoicing.total')}</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">{t('invoicing.status')}</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-500">{t('common.noData')}</td>
                                </tr>
                            ) : (
                                invoices.map(invoice => (
                                    <tr
                                        key={invoice.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                        onClick={() => onDownload(invoice)}
                                    >
                                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors cursor-pointer"
                                                    checked={selectedIds.has(invoice.id)}
                                                    onClick={(e) => onToggleSelect(invoice.id, e)}
                                                    onChange={() => { }}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{invoice.invoiceNumber}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{clients.find(c => c.id === invoice.clientId)?.name || 'Unknown'}</td>
                                        <td className="py-3 px-4 text-gray-500">{formatDate(invoice.issueDate)}</td>
                                        <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total, invoice.currency)}</td>
                                        <td className="py-3 px-4 text-center"><StatusBadge status={invoice.status} /></td>
                                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {invoice.status !== 'paid' && (
                                                    <button
                                                        onClick={() => onStatusChange(invoice.id, 'paid')}
                                                        className="p-1.5 text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-lg transition-all"
                                                        title={t('invoicing.markAsPaid')}
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                )}
                                                {invoice.status === 'draft' && (
                                                    <button
                                                        onClick={() => onStatusChange(invoice.id, 'sent')}
                                                        className="p-1.5 text-blue-500 hover:text-white hover:bg-blue-500 rounded-lg transition-all"
                                                        title={t('invoicing.markAsSent')}
                                                    >
                                                        <Send size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => onDownload(invoice)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title={t('invoicing.downloadPdf')}><Download size={16} /></button>
                                                <button onClick={() => onShare(invoice)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title={t('invoicing.share')}><Share2 size={16} /></button>
                                                <button
                                                    onClick={() => onDelete(invoice.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
