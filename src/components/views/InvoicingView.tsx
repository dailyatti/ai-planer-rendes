import React, { useState, useMemo } from 'react';
import {
    FileText, Plus, TrendingUp, TrendingDown,
    Users, Clock, CheckCircle, AlertCircle,
    Send, Download, Search, Filter, MoreHorizontal,
    ChevronRight, Eye, Pencil, Trash2,
    PieChart, BarChart3, Wallet, X, Building2, User, Mail,
    Calendar, DollarSign, Percent, Briefcase, Share2, Copy, Check
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Invoice, Client, InvoiceItem } from '../../types/planner';

// Initial Mock Data
const INITIAL_CLIENTS: Client[] = [
    { id: '1', name: 'Tech Solutions Kft.', email: 'finance@techsolutions.hu', company: 'Tech Solutions Kft.', address: '1117 Budapest, Irinyi József u. 4-20.', createdAt: new Date() },
    { id: '2', name: 'Creative Agency Bt.', email: 'hello@creative.hu', company: 'Creative Agency Bt.', address: '1052 Budapest, Deák Ferenc tér 1.', createdAt: new Date() },
    { id: '3', name: 'Global Corp Inc.', email: 'accounts@globalcorp.com', company: 'Global Corp Inc.', address: 'New York, 5th Avenue 101.', createdAt: new Date() },
];

const INITIAL_INVOICES: Invoice[] = [
    {
        id: '1',
        invoiceNumber: 'INV-2024-001',
        clientId: '1',
        items: [{ id: '1', description: 'Consulting Services', quantity: 10, rate: 15000, amount: 150000 }],
        subtotal: 150000,
        taxRate: 27,
        tax: 40500,
        total: 190500,
        status: 'paid',
        issueDate: new Date('2024-12-01'),
        dueDate: new Date('2024-12-15'),
        paidDate: new Date('2024-12-10'),
        notes: 'Thank you for your business!',
        currency: 'HUF',
        createdAt: new Date(),
    },
    {
        id: '2',
        invoiceNumber: 'INV-2024-002',
        clientId: '2',
        items: [{ id: '2', description: 'Web Design Project', quantity: 1, rate: 450000, amount: 450000 }],
        subtotal: 450000,
        taxRate: 27,
        tax: 121500,
        total: 571500,
        status: 'sent',
        issueDate: new Date('2024-12-03'),
        dueDate: new Date('2024-12-17'),
        notes: 'Please transfer to the account number specified below.',
        currency: 'HUF',
        createdAt: new Date(),
    },
    {
        id: '3',
        invoiceNumber: 'INV-2024-003',
        clientId: '3',
        items: [{ id: '3', description: 'SEO Optimization', quantity: 5, rate: 100, amount: 500 }],
        subtotal: 500,
        taxRate: 0,
        tax: 0,
        total: 500,
        status: 'overdue',
        issueDate: new Date('2024-11-15'),
        dueDate: new Date('2024-11-30'),
        notes: 'International invoice, VAT reverse charge.',
        currency: 'EUR',
        createdAt: new Date(),
    }
];

const InvoicingView: React.FC = () => {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'clients' | 'analytics'>('dashboard');
    const [toast, setToast] = useState<string | null>(null);

    // State
    const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
    const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
    const [showCreateInvoice, setShowCreateInvoice] = useState(false);
    const [showAddClient, setShowAddClient] = useState(false);

    // Download PDF handler
    const handleDownloadPdf = (invoice: Invoice) => {
        window.print();
    };

    // Share handler
    const handleShare = (invoice: Invoice) => {
        const url = `${window.location.origin}/invoice/${invoice.id}`;
        navigator.clipboard.writeText(url);
        setToast(t('invoicing.linkCopied'));
        setTimeout(() => setToast(null), 3000);
    };

    // Form States
    const [newClient, setNewClient] = useState<Partial<Client>>({});
    const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
        items: [{ id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }],
        currency: 'HUF',
        taxRate: 27,
        status: 'draft',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days net
    });

    // Formatting
    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat(language === 'hu' ? 'hu-HU' : 'en-US').format(date);
    };

    // Calculations
    const stats = useMemo(() => {
        const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.currency === 'HUF' ? i.total : i.total * 400), 0); // Mock EUR conversion
        const pendingAmount = invoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + (i.currency === 'HUF' ? i.total : i.total * 400), 0);
        const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + (i.currency === 'HUF' ? i.total : i.total * 400), 0);
        const totalClients = clients.length;
        return { totalRevenue, pendingAmount, overdueAmount, totalClients };
    }, [invoices, clients]);

    // Handlers
    const handleAddClient = () => {
        if (newClient.name && newClient.email) {
            setClients([...clients, { ...newClient, id: Date.now().toString(), createdAt: new Date() } as Client]);
            setNewClient({});
            setShowAddClient(false);
        }
    };

    const handleAddItem = () => {
        const items = newInvoice.items || [];
        setNewInvoice({
            ...newInvoice,
            items: [...items, { id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }]
        });
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const items = [...(newInvoice.items || [])];
        items[index] = { ...items[index], [field]: value };
        items[index].amount = items[index].quantity * items[index].rate;

        // Recalculate totals
        const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
        const tax = subtotal * ((newInvoice.taxRate || 0) / 100);
        const total = subtotal + tax;

        setNewInvoice({ ...newInvoice, items, subtotal, tax, total });
    };

    const handleSaveInvoice = () => {
        if (newInvoice.clientId && newInvoice.items?.length) {
            setInvoices([...invoices, {
                ...newInvoice,
                id: Date.now().toString(),
                invoiceNumber: `INV-2024-${String(invoices.length + 1).padStart(3, '0')}`,
                createdAt: new Date()
            } as Invoice]);
            setNewInvoice({
                items: [{ id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }],
                currency: 'HUF',
                taxRate: 27,
                status: 'draft',
                issueDate: new Date(),
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            });
            setShowCreateInvoice(false);
        }
    };

    const getStatusBadge = (status: Invoice['status']) => {
        const styles = {
            draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
            sent: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
            paid: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800',
            overdue: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800',
            cancelled: 'bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
        };
        const labels: Record<string, string> = {
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
        <div className="view-container max-w-7xl mx-auto space-y-8 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/20">
                            <FileText size={28} className="text-white" />
                        </div>
                        {t('invoicing.title')}
                    </h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400 text-lg">{t('invoicing.subtitle')}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button onClick={() => setShowAddClient(true)} className="btn-secondary flex items-center gap-2 px-4 py-2.5">
                        <Users size={18} />
                        <span>{t('invoicing.addClient')}</span>
                    </button>
                    <button onClick={() => setShowCreateInvoice(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all">
                        <Plus size={18} />
                        <span>{t('invoicing.createInvoice')}</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl w-fit">
                {[
                    { id: 'dashboard', label: t('invoicing.dashboard'), icon: PieChart },
                    { id: 'invoices', label: t('invoicing.invoices'), icon: FileText },
                    { id: 'clients', label: t('invoicing.clients'), icon: Users },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === tab.id
                            ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Dashboard View */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: t('invoicing.totalRevenue'), value: formatCurrency(stats.totalRevenue, 'HUF'), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                            { label: t('invoicing.pending'), value: formatCurrency(stats.pendingAmount, 'HUF'), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                            { label: t('invoicing.overdue'), value: formatCurrency(stats.overdueAmount, 'HUF'), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                            { label: t('invoicing.clients'), value: stats.totalClients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        ].map((stat, i) => (
                            <div key={i} className="card p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</span>
                                    <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}>
                                        <stat.icon size={20} />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Recent Invoices Card */}
                    <div className="card border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('invoicing.invoices')}</h3>
                            <button onClick={() => setActiveTab('invoices')} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                                {t('common.viewAll')} <ChevronRight size={16} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {invoices.slice(0, 5).map(invoice => (
                                <div key={invoice.id} className="group flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all shadow-sm hover:shadow-md cursor-pointer">
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
                                                {clients.find(c => c.id === invoice.clientId)?.name}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total, invoice.currency)}</div>
                                            <div className="flex justify-end mt-1">{getStatusBadge(invoice.status)}</div>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
                <div className="card border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in">
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder={t('invoicing.searchPlaceholder')} className="input-field pl-10 w-full" />
                        </div>
                        <button className="btn-secondary flex items-center gap-2">
                            <Filter size={18} /> {t('common.filter')}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('invoicing.invoiceNumber')}</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('invoicing.clients')}</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('invoicing.invoiceDate')}</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{t('invoicing.total')}</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">{t('invoicing.status')}</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {invoices.map(invoice => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{clients.find(c => c.id === invoice.clientId)?.name}</td>
                                        <td className="py-3 px-4 text-gray-500">{formatDate(invoice.issueDate)}</td>
                                        <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total, invoice.currency)}</td>
                                        <td className="py-3 px-4 text-center">{getStatusBadge(invoice.status)}</td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="View"><Eye size={16} /></button>
                                                <button onClick={() => handleDownloadPdf(invoice)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title={t('invoicing.downloadPdf')}><Download size={16} /></button>
                                                <button onClick={() => handleShare(invoice)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title={t('invoicing.share')}><Share2 size={16} /></button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                    {clients.map(client => (
                        <div key={client.id} className="card group hover:shadow-lg transition-all border border-gray-100 dark:border-gray-800">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
                                    {client.name.charAt(0)}
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary-600 transition-colors">{client.company}</h3>
                            <p className="text-sm text-gray-500 font-medium mb-4 flex items-center gap-2">
                                <User size={14} /> {client.name}
                            </p>

                            <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Mail size={14} className="text-gray-400" /> {client.email}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 truncate">
                                    <Building2 size={14} className="text-gray-400" /> {client.address || 'No address'}
                                </div>
                            </div>
                        </div>
                    ))}

                    <button onClick={() => setShowAddClient(true)} className="card border-2 border-dashed border-gray-300 dark:border-gray-700 bg-transparent hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 flex flex-col items-center justify-center min-h-[200px] gap-4 group transition-all">
                        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center text-gray-400 group-hover:text-primary-600 transition-colors">
                            <Plus size={28} />
                        </div>
                        <span className="font-bold text-lg text-gray-500 group-hover:text-primary-600 transition-colors">{t('invoicing.addClient')}</span>
                    </button>
                </div>
            )}

            {/* Create Invoice Modal - Full Screen Style or Large Modal */}
            {showCreateInvoice && (
                <div className="modal-backdrop z-50">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto mx-4 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FileText className="text-primary-600" />
                                {t('invoicing.createInvoice')}
                            </h2>
                            <button onClick={() => setShowCreateInvoice(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-2 gap-12 mb-8">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t('invoicing.billTo')}</h3>
                                    <select
                                        className="input-field w-full text-lg font-medium"
                                        value={newInvoice.clientId || ''}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, clientId: e.target.value })}
                                    >
                                        <option value="">{t('invoicing.clients')}</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} - {c.company}</option>)}
                                    </select>
                                    {newInvoice.clientId && (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm space-y-1 text-gray-600 dark:text-gray-400">
                                            <p className="font-semibold text-gray-900 dark:text-white">{clients.find(c => c.id === newInvoice.clientId)?.company}</p>
                                            <p>{clients.find(c => c.id === newInvoice.clientId)?.name}</p>
                                            <p>{clients.find(c => c.id === newInvoice.clientId)?.address}</p>
                                            <p>{clients.find(c => c.id === newInvoice.clientId)?.email}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label-text">{t('invoicing.invoiceNumber')}</label>
                                            <div className="font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600">
                                                INV-2024-{String(invoices.length + 1).padStart(3, '0')}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-text">{t('invoicing.currency')}</label>
                                            <select
                                                className="input-field"
                                                value={newInvoice.currency}
                                                onChange={(e) => setNewInvoice({ ...newInvoice, currency: e.target.value })}
                                            >
                                                <option value="HUF">HUF (Ft)</option>
                                                <option value="EUR">EUR (€)</option>
                                                <option value="USD">USD ($)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label-text">{t('invoicing.invoiceDate')}</label>
                                            <input
                                                type="date"
                                                className="input-field"
                                                value={newInvoice.issueDate?.toISOString().split('T')[0]}
                                                onChange={(e) => setNewInvoice({ ...newInvoice, issueDate: new Date(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label-text">{t('invoicing.dueDate')}</label>
                                            <input
                                                type="date"
                                                className="input-field"
                                                value={newInvoice.dueDate?.toISOString().split('T')[0]}
                                                onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: new Date(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Line Items */}
                            <div className="mb-8">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-gray-100 dark:border-gray-700">
                                            <th className="py-3 text-sm font-semibold text-gray-500 w-[40%]">{t('invoicing.item')}</th>
                                            <th className="py-3 text-sm font-semibold text-gray-500 w-[15%] text-center">{t('invoicing.quantity')}</th>
                                            <th className="py-3 text-sm font-semibold text-gray-500 w-[20%] text-right">{t('invoicing.rate')}</th>
                                            <th className="py-3 text-sm font-semibold text-gray-500 w-[20%] text-right">{t('invoicing.amount')}</th>
                                            <th className="w-[5%]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {newInvoice.items?.map((item, index) => (
                                            <tr key={item.id} className="group">
                                                <td className="py-4 pr-4">
                                                    <input
                                                        type="text"
                                                        className="input-field w-full"
                                                        placeholder={t('invoicing.item')}
                                                        value={item.description}
                                                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                    />
                                                </td>
                                                <td className="py-4 px-2">
                                                    <input
                                                        type="number"
                                                        className="input-field text-center"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                    />
                                                </td>
                                                <td className="py-4 px-2">
                                                    <input
                                                        type="number"
                                                        className="input-field text-right"
                                                        value={item.rate}
                                                        onChange={(e) => updateItem(index, 'rate', Number(e.target.value))}
                                                    />
                                                </td>
                                                <td className="py-4 pl-4 text-right font-semibold text-gray-900 dark:text-white">
                                                    {formatCurrency(item.amount, newInvoice.currency || 'HUF')}
                                                </td>
                                                <td className="py-4 text-right">
                                                    <button className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button onClick={handleAddItem} className="mt-4 btn-secondary flex items-center gap-2 text-sm">
                                    <Plus size={16} /> {t('invoicing.addItem')}
                                </button>
                            </div>

                            {/* Footer / Totals */}
                            <div className="flex justify-end order-t pt-8 border-gray-100 dark:border-gray-800">
                                <div className="w-80 space-y-3">
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>{t('invoicing.subtotal')}</span>
                                        <span>{formatCurrency(newInvoice.subtotal || 0, newInvoice.currency || 'HUF')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <span>{t('invoicing.tax')}</span>
                                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-xs">
                                                <input
                                                    type="number"
                                                    className="w-8 bg-transparent text-right outline-none"
                                                    value={newInvoice.taxRate}
                                                    onChange={(e) => setNewInvoice({ ...newInvoice, taxRate: Number(e.target.value) })}
                                                />
                                                %
                                            </div>
                                        </div>
                                        <span>{formatCurrency(newInvoice.tax || 0, newInvoice.currency || 'HUF')}</span>
                                    </div>
                                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                                    <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                                        <span>{t('invoicing.total')}</span>
                                        <span>{formatCurrency(newInvoice.total || 0, newInvoice.currency || 'HUF')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <AlertCircle size={14} className="text-amber-500" />
                                    {t('invoicing.autoSaved')}
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowCreateInvoice(false)} className="btn-ghost">{t('common.cancel')}</button>
                                <button onClick={handleSaveInvoice} className="btn-primary flex items-center gap-2 px-6">
                                    <Send size={18} />
                                    {t('invoicing.saveInvoice')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Client Monitor */}
            {showAddClient && (
                <div className="modal-backdrop">
                    <div className="modal-panel max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4">{t('invoicing.addClient')}</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                className="input-field"
                                placeholder={t('invoicing.name')}
                                value={newClient.name || ''}
                                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                            />
                            <input
                                type="text"
                                className="input-field"
                                placeholder={t('invoicing.company')}
                                value={newClient.company || ''}
                                onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                            />
                            <input
                                type="email"
                                className="input-field"
                                placeholder={t('invoicing.email')}
                                value={newClient.email || ''}
                                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                            />
                            <input
                                type="text"
                                className="input-field"
                                placeholder={t('invoicing.address')}
                                value={newClient.address || ''}
                                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                            />
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setShowAddClient(false)} className="btn-ghost">{t('common.cancel')}</button>
                                <button onClick={handleAddClient} className="btn-primary">{t('common.save')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-700">
                        <Check size={18} className="text-green-400" />
                        <span className="font-medium">{toast}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoicingView;
