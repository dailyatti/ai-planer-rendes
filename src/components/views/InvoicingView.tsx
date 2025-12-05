import React, { useState, useMemo } from 'react';
import {
    FileText, Plus, TrendingUp, TrendingDown,
    Users, Clock, CheckCircle, AlertCircle,
    Send, Download, Search, Filter, MoreHorizontal,
    ChevronRight, Eye,
    PieChart, BarChart3, Wallet, X, Building2, User, Mail
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Invoice, Client } from '../../types/planner';

const InvoicingView: React.FC = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'clients' | 'analytics'>('dashboard');
    const [showCreateInvoice, setShowCreateInvoice] = useState(false);
    const [showAddClient, setShowAddClient] = useState(false);

    // Mock data
    const mockInvoices: Invoice[] = [
        {
            id: '1',
            invoiceNumber: 'INV-2024-001',
            clientId: '1',
            items: [],
            subtotal: 1500,
            taxRate: 27,
            tax: 405,
            total: 1905,
            status: 'paid',
            issueDate: new Date('2024-12-01'),
            dueDate: new Date('2024-12-15'),
            paidDate: new Date('2024-12-10'),
            notes: '',
            currency: 'EUR',
            createdAt: new Date(),
        },
        {
            id: '2',
            invoiceNumber: 'INV-2024-002',
            clientId: '2',
            items: [],
            subtotal: 2800,
            taxRate: 27,
            tax: 756,
            total: 3556,
            status: 'sent',
            issueDate: new Date('2024-12-03'),
            dueDate: new Date('2024-12-17'),
            notes: '',
            currency: 'EUR',
            createdAt: new Date(),
        },
        {
            id: '3',
            invoiceNumber: 'INV-2024-003',
            clientId: '1',
            items: [],
            subtotal: 950,
            taxRate: 27,
            tax: 256.5,
            total: 1206.5,
            status: 'overdue',
            issueDate: new Date('2024-11-15'),
            dueDate: new Date('2024-11-30'),
            notes: '',
            currency: 'EUR',
            createdAt: new Date(),
        },
    ];

    const mockClients: Client[] = [
        { id: '1', name: 'Nagy Gábor', email: 'gabor@techsolutions.hu', company: 'Tech Solutions Kft.', createdAt: new Date() },
        { id: '2', name: 'Kovács Anna', email: 'anna@creative.hu', company: 'Creative Agency Bt.', createdAt: new Date() },
    ];

    // Calculate statistics
    const stats = useMemo(() => {
        const totalRevenue = mockInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
        const pendingAmount = mockInvoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.total, 0);
        const overdueAmount = mockInvoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.total, 0);
        const totalClients = mockClients.length;

        return { totalRevenue, pendingAmount, overdueAmount, totalClients };
    }, []);

    const getStatusBadge = (status: Invoice['status']) => {
        const styles = {
            draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
            sent: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
            paid: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800',
            overdue: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800',
            cancelled: 'bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
        };

        const labels = {
            draft: t('invoicing.statusDraft'),
            sent: t('invoicing.statusSent'),
            paid: t('invoicing.statusPaid'),
            overdue: t('invoicing.statusOverdue'),
            cancelled: t('invoicing.statusCancelled'),
        };

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
                {status === 'paid' && <CheckCircle size={12} />}
                {status === 'overdue' && <AlertCircle size={12} />}
                {labels[status]}
            </span>
        );
    };

    return (
        <div className="view-container">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="view-title flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                                <FileText size={24} className="text-white" />
                            </div>
                            {t('invoicing.title')}
                        </h1>
                        <p className="view-subtitle">{t('invoicing.subtitle')}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => setShowAddClient(true)} className="btn-secondary">
                            <Users size={18} />
                            <span className="hidden sm:inline">{t('invoicing.addClient')}</span>
                        </button>
                        <button onClick={() => setShowCreateInvoice(true)} className="btn-primary">
                            <Plus size={18} />
                            {t('invoicing.createInvoice')}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-6">
                    <div className="tab-group">
                        {[
                            { id: 'dashboard', label: t('invoicing.dashboard'), icon: PieChart },
                            { id: 'invoices', label: t('invoicing.invoices'), icon: FileText },
                            { id: 'clients', label: t('invoicing.clients'), icon: Users },
                            { id: 'analytics', label: t('invoicing.analytics'), icon: BarChart3 },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                            >
                                <tab.icon size={16} className="inline mr-2" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="stat-card stat-card-success">
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <span className="text-sm font-medium opacity-90">{t('invoicing.totalRevenue')}</span>
                                <Wallet size={20} className="opacity-80" />
                            </div>
                            <div className="text-3xl font-bold relative z-10">€{stats.totalRevenue.toLocaleString()}</div>
                            <div className="text-sm opacity-80 mt-1 relative z-10">{t('invoicing.fromLastMonth')}</div>
                        </div>

                        <div className="stat-card stat-card-primary">
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <span className="text-sm font-medium opacity-90">{t('invoicing.pending')}</span>
                                <Clock size={20} className="opacity-80" />
                            </div>
                            <div className="text-3xl font-bold relative z-10">€{stats.pendingAmount.toLocaleString()}</div>
                            <div className="text-sm opacity-80 mt-1 relative z-10">{t('invoicing.invoicesAwaiting')}</div>
                        </div>

                        <div className="stat-card stat-card-warning">
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <span className="text-sm font-medium opacity-90">{t('invoicing.overdue')}</span>
                                <AlertCircle size={20} className="opacity-80" />
                            </div>
                            <div className="text-3xl font-bold relative z-10">€{stats.overdueAmount.toLocaleString()}</div>
                            <div className="text-sm opacity-80 mt-1 relative z-10">{t('invoicing.needsAttention')}</div>
                        </div>

                        <div className="stat-card stat-card-accent">
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <span className="text-sm font-medium opacity-90">{t('invoicing.totalClients')}</span>
                                <Users size={20} className="opacity-80" />
                            </div>
                            <div className="text-3xl font-bold relative z-10">{stats.totalClients}</div>
                            <div className="text-sm opacity-80 mt-1 relative z-10">{t('invoicing.activeClients')}</div>
                        </div>
                    </div>

                    {/* Revenue Forecast Card */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="section-title flex items-center gap-2 mb-0">
                                <TrendingUp size={20} className="text-primary-500" />
                                {t('invoicing.revenueForecast')}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800/30">
                                <div className="flex items-center gap-2 text-success-700 dark:text-success-400 mb-2">
                                    <TrendingUp size={18} />
                                    <span className="text-sm font-medium">{t('invoicing.expectedIncome')}</span>
                                </div>
                                <div className="text-2xl font-bold text-success-800 dark:text-success-300">€8,500</div>
                                <p className="text-sm text-success-600 dark:text-success-500 mt-1">{t('invoicing.basedOnPending')}</p>
                            </div>

                            <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800/30">
                                <div className="flex items-center gap-2 text-danger-700 dark:text-danger-400 mb-2">
                                    <TrendingDown size={18} />
                                    <span className="text-sm font-medium">{t('invoicing.expectedExpenses')}</span>
                                </div>
                                <div className="text-2xl font-bold text-danger-800 dark:text-danger-300">€3,200</div>
                                <p className="text-sm text-danger-600 dark:text-danger-500 mt-1">{t('invoicing.subscriptionsRecurring')}</p>
                            </div>

                            <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/30">
                                <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 mb-2">
                                    <Wallet size={18} />
                                    <span className="text-sm font-medium">{t('invoicing.projectedProfit')}</span>
                                </div>
                                <div className="text-2xl font-bold text-primary-800 dark:text-primary-300">€5,300</div>
                                <p className="text-sm text-primary-600 dark:text-primary-500 mt-1">{t('invoicing.netExpected')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Invoices */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="section-title mb-0">{t('invoicing.recentInvoices')}</h3>
                            <button className="btn-ghost text-sm" onClick={() => setActiveTab('invoices')}>
                                {t('invoicing.viewAll')}
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {mockInvoices.slice(0, 3).map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
                                            <p className="text-sm text-gray-500">{mockClients.find(c => c.id === invoice.clientId)?.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900 dark:text-white">€{invoice.total.toLocaleString()}</p>
                                        <div className="mt-1">{getStatusBadge(invoice.status)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder={t('invoicing.searchInvoices')} className="input-field pl-10" />
                        </div>
                        <button className="btn-secondary">
                            <Filter size={18} />
                            {t('invoicing.filter')}
                        </button>
                    </div>

                    <div className="table-container">
                        <table className="table-premium w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs font-semibold text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3">{t('invoicing.invoice')}</th>
                                    <th className="px-4 py-3">{t('invoicing.client')}</th>
                                    <th className="px-4 py-3">{t('invoicing.amount')}</th>
                                    <th className="px-4 py-3">{t('invoicing.status')}</th>
                                    <th className="px-4 py-3">{t('invoicing.dueDate')}</th>
                                    <th className="px-4 py-3 text-right">{t('invoicing.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{mockClients.find(c => c.id === invoice.clientId)?.name}</td>
                                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">€{invoice.total.toLocaleString()}</td>
                                        <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                                        <td className="px-4 py-3 text-gray-500 text-sm">{invoice.dueDate.toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
                                                    <Eye size={18} />
                                                </button>
                                                <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Clients Tab */}
            {activeTab === 'clients' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mockClients.map((client) => (
                            <div key={client.id} className="card hover-lift group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
                                            {client.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{client.name}</h4>
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{client.company}</p>
                                        </div>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        <MoreHorizontal size={20} />
                                    </button>
                                </div>
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Mail size={14} />
                                        {client.email}
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-500">
                                        {mockInvoices.filter(i => i.clientId === client.id).length} {t('invoicing.invoices')}
                                    </span>
                                    <button className="text-sm font-semibold text-primary-600 hover:underline">{t('invoicing.viewDetails')}</button>
                                </div>
                            </div>
                        ))}

                        {/* Add Client Card */}
                        <button onClick={() => setShowAddClient(true)} className="card border-2 border-dashed border-gray-300 dark:border-gray-700 bg-transparent hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 flex flex-col items-center justify-center min-h-[200px] gap-3 group transition-all">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center text-gray-500 group-hover:text-primary-600 transition-colors">
                                <Plus size={24} />
                            </div>
                            <span className="font-bold text-gray-600 dark:text-gray-400 group-hover:text-primary-700 dark:group-hover:text-primary-300">{t('invoicing.addClient')}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div className="card text-center py-16 animate-fade-in">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('invoicing.comingSoon')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{t('invoicing.chartsDesc')}</p>
                </div>
            )}

            {/* Add Client Modal */}
            {showAddClient && (
                <div className="modal-backdrop" onClick={() => setShowAddClient(false)}>
                    <div className="modal-panel max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600">
                                    <User size={18} />
                                </div>
                                {t('invoicing.addClient')}
                            </h3>
                            <button onClick={() => setShowAddClient(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="label-text">{t('invoicing.labelCompany')}</label>
                                <div className="relative">
                                    <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" className="input-field pl-10" placeholder={t('invoicing.phCompany')} autoFocus />
                                </div>
                            </div>
                            <div>
                                <label className="label-text">{t('invoicing.labelContact')}</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" className="input-field pl-10" placeholder={t('invoicing.phContact')} />
                                </div>
                            </div>
                            <div>
                                <label className="label-text">{t('invoicing.labelEmail')}</label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="email" className="input-field pl-10" placeholder={t('invoicing.phEmail')} />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button onClick={() => setShowAddClient(false)} className="btn-ghost flex-1">{t('common.cancel')}</button>
                                <button className="btn-primary flex-1">{t('common.save')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Invoice Modal */}
            {showCreateInvoice && (
                <div className="modal-backdrop" onClick={() => setShowCreateInvoice(false)}>
                    <div className="modal-panel max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                                    <FileText size={18} />
                                </div>
                                {t('invoicing.createInvoice')}
                            </h3>
                            <button onClick={() => setShowCreateInvoice(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="label-text">{t('invoicing.labelSelectClient')}</label>
                                <select className="input-field">
                                    <option value="">{t('invoicing.optionSelectClient')}</option>
                                    {mockClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label-text">{t('invoicing.dueDate')}</label>
                                <input type="date" className="input-field" />
                            </div>
                            <div>
                                <label className="label-text">{t('invoicing.invoiceNumber')}</label>
                                <input type="text" className="input-field bg-gray-50 dark:bg-gray-800" value="INV-2024-004" readOnly />
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('invoicing.sectionItems')}</h4>
                            <div className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                                {t('invoicing.placeholderItems')}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowCreateInvoice(false)} className="btn-ghost">{t('common.cancel')}</button>
                            <button className="btn-primary items-center flex gap-2">
                                <Send size={16} />
                                {t('invoicing.createSend')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoicingView;
