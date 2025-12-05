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
    const { language } = useLanguage();
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

    // Comprehensive Translations
    const tr = {
        title: language === 'hu' ? 'Számlázás és Ügyfelek' : 'Invoicing & Clients',
        subtitle: language === 'hu'
            ? 'Kezeld pénzügyeidet és ügyfélkapcsolataidat egy helyen'
            : 'Manage your financials and client relationships in one place',
        // Tabs
        dashboard: language === 'hu' ? 'Áttekintés' : 'Dashboard',
        invoices: language === 'hu' ? 'Számlák' : 'Invoices',
        clients: language === 'hu' ? 'Ügyféllista' : 'Clients',
        analytics: language === 'hu' ? 'Pénzügyi Elemzés' : 'Analytics',
        // Actions
        addClient: language === 'hu' ? 'Új Ügyfél' : 'Add Client',
        createInvoice: language === 'hu' ? 'Új Számla' : 'Create Invoice',
        filter: language === 'hu' ? 'Szűrés' : 'Filter',
        searchInvoices: language === 'hu' ? 'Számla keresése...' : 'Search invoices...',
        viewAll: language === 'hu' ? 'Összes mutatása' : 'View All',
        // Stats
        totalRevenue: language === 'hu' ? 'Befolyt Bevétel' : 'Total Revenue',
        pending: language === 'hu' ? 'Függőben' : 'Pending',
        overdue: language === 'hu' ? 'Lejárt Tartozás' : 'Overdue',
        totalClients: language === 'hu' ? 'Aktív Ügyfelek' : 'Total Clients',
        fromLastMonth: language === 'hu' ? '+12.5% az előző hónaphoz képest' : '+12.5% from last month',
        invoicesAwaiting: language === 'hu' ? '2 számla vár kifizetésre' : '2 invoices awaiting payment',
        needsAttention: language === 'hu' ? '1 számla lejárt!' : '1 invoice needs attention',
        activeClients: language === 'hu' ? 'Aktív partnerek ebben a hónapban' : 'Active clients this month',
        // Forecast
        revenueForecast: language === 'hu' ? 'Bevétel Előrejelzés' : 'Revenue Forecast',
        expectedIncome: language === 'hu' ? 'Várható Bevétel' : 'Expected Income',
        basedOnPending: language === 'hu' ? 'Kiküldött számlák alapján' : 'Based on pending invoices',
        expectedExpenses: language === 'hu' ? 'Várható Kiadások' : 'Expected Expenses',
        subscriptionsRecurring: language === 'hu' ? 'Állandó költségek' : 'Subscriptions + recurring',
        projectedProfit: language === 'hu' ? 'Tervezett Profit' : 'Projected Profit',
        netExpected: language === 'hu' ? 'Becsült tiszta haszon' : 'Net expected earnings',
        // Recent Invoices
        recentInvoices: language === 'hu' ? 'Legutóbbi Számlák' : 'Recent Invoices',
        // Table Headers
        th_invoice: language === 'hu' ? 'Bizonylatszám' : 'Invoice #',
        th_client: language === 'hu' ? 'Ügyfél' : 'Client',
        th_amount: language === 'hu' ? 'Összeg' : 'Amount',
        th_status: language === 'hu' ? 'Státusz' : 'Status',
        th_dueDate: language === 'hu' ? 'Határidő' : 'Due Date',
        th_actions: language === 'hu' ? 'Műveletek' : 'Actions',
        // Client Card
        invoicesCount: language === 'hu' ? 'számla' : 'invoices',
        viewDetails: language === 'hu' ? 'Adatlap' : 'View Details',
        addNewClientCard: language === 'hu' ? 'Új Partner Rögzítése' : 'Add New Client',
        // Modals - General
        cancel: language === 'hu' ? 'Mégse' : 'Cancel',
        save: language === 'hu' ? 'Mentés' : 'Save',
        createSend: language === 'hu' ? 'Létrehozás és Küldés' : 'Create & Send',
        // Add Client Modal
        modalAddClientTitle: language === 'hu' ? 'Új Ügyfél Felvétele' : 'Add New Client',
        labelCompany: language === 'hu' ? 'Cégnév' : 'Company Name',
        phCompany: language === 'hu' ? 'Pl. Kovács Kft.' : 'e.g. Acme Corp',
        labelContact: language === 'hu' ? 'Kapcsolattartó' : 'Contact Name',
        phContact: language === 'hu' ? 'Pl. Kovács János' : 'e.g. John Doe',
        labelEmail: language === 'hu' ? 'Email Cím' : 'Email Address',
        phEmail: language === 'hu' ? 'janos@ceg.hu' : 'john@company.com',
        // Create Invoice Modal
        modalInvoiceTitle: language === 'hu' ? 'Számla Kiállítása' : 'Create New Invoice',
        labelSelectClient: language === 'hu' ? 'Ügyfél Kiválasztása' : 'Select Client',
        optionSelectClient: language === 'hu' ? 'Válassz ügyfelet...' : 'Select a client...',
        labelInvoiceNum: language === 'hu' ? 'Számlaszám' : 'Invoice Number',
        sectionItems: language === 'hu' ? 'Tételek' : 'Invoice Items',
        placeholderItems: language === 'hu' ? 'A tételszerkesztő hamarosan elérhető...' : 'Item adding functionality coming soon...',
        // Statuses
        statusDraft: language === 'hu' ? 'Piszkozat' : 'Draft',
        statusSent: language === 'hu' ? 'Elküldve' : 'Sent',
        statusPaid: language === 'hu' ? 'Fizetve' : 'Paid',
        statusOverdue: language === 'hu' ? 'Lejárt' : 'Overdue',
        statusCancelled: language === 'hu' ? 'Törölve' : 'Cancelled',
        // Empty States
        comingSoon: language === 'hu' ? 'Hamarosan...' : 'Coming soon...',
        chartsDesc: language === 'hu' ? 'A részletes grafikonok a következő frissítésben érkeznek.' : 'Detailed charts are coming in the next update.',
    };

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
            draft: tr.statusDraft,
            sent: tr.statusSent,
            paid: tr.statusPaid,
            overdue: tr.statusOverdue,
            cancelled: tr.statusCancelled,
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
                            {tr.title}
                        </h1>
                        <p className="view-subtitle">{tr.subtitle}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => setShowAddClient(true)} className="btn-secondary">
                            <Users size={18} />
                            <span className="hidden sm:inline">{tr.addClient}</span>
                        </button>
                        <button onClick={() => setShowCreateInvoice(true)} className="btn-primary">
                            <Plus size={18} />
                            {tr.createInvoice}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-6">
                    <div className="tab-group">
                        {[
                            { id: 'dashboard', label: tr.dashboard, icon: PieChart },
                            { id: 'invoices', label: tr.invoices, icon: FileText },
                            { id: 'clients', label: tr.clients, icon: Users },
                            { id: 'analytics', label: tr.analytics, icon: BarChart3 },
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
                                <span className="text-sm font-medium opacity-90">{tr.totalRevenue}</span>
                                <Wallet size={20} className="opacity-80" />
                            </div>
                            <div className="text-3xl font-bold relative z-10">€{stats.totalRevenue.toLocaleString()}</div>
                            <div className="text-sm opacity-80 mt-1 relative z-10">{tr.fromLastMonth}</div>
                        </div>

                        <div className="stat-card stat-card-primary">
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <span className="text-sm font-medium opacity-90">{tr.pending}</span>
                                <Clock size={20} className="opacity-80" />
                            </div>
                            <div className="text-3xl font-bold relative z-10">€{stats.pendingAmount.toLocaleString()}</div>
                            <div className="text-sm opacity-80 mt-1 relative z-10">{tr.invoicesAwaiting}</div>
                        </div>

                        <div className="stat-card stat-card-warning">
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <span className="text-sm font-medium opacity-90">{tr.overdue}</span>
                                <AlertCircle size={20} className="opacity-80" />
                            </div>
                            <div className="text-3xl font-bold relative z-10">€{stats.overdueAmount.toLocaleString()}</div>
                            <div className="text-sm opacity-80 mt-1 relative z-10">{tr.needsAttention}</div>
                        </div>

                        <div className="stat-card stat-card-accent">
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <span className="text-sm font-medium opacity-90">{tr.totalClients}</span>
                                <Users size={20} className="opacity-80" />
                            </div>
                            <div className="text-3xl font-bold relative z-10">{stats.totalClients}</div>
                            <div className="text-sm opacity-80 mt-1 relative z-10">{tr.activeClients}</div>
                        </div>
                    </div>

                    {/* Revenue Forecast Card */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="section-title flex items-center gap-2 mb-0">
                                <TrendingUp size={20} className="text-primary-500" />
                                {tr.revenueForecast}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800/30">
                                <div className="flex items-center gap-2 text-success-700 dark:text-success-400 mb-2">
                                    <TrendingUp size={18} />
                                    <span className="text-sm font-medium">{tr.expectedIncome}</span>
                                </div>
                                <div className="text-2xl font-bold text-success-800 dark:text-success-300">€8,500</div>
                                <p className="text-sm text-success-600 dark:text-success-500 mt-1">{tr.basedOnPending}</p>
                            </div>

                            <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800/30">
                                <div className="flex items-center gap-2 text-danger-700 dark:text-danger-400 mb-2">
                                    <TrendingDown size={18} />
                                    <span className="text-sm font-medium">{tr.expectedExpenses}</span>
                                </div>
                                <div className="text-2xl font-bold text-danger-800 dark:text-danger-300">€3,200</div>
                                <p className="text-sm text-danger-600 dark:text-danger-500 mt-1">{tr.subscriptionsRecurring}</p>
                            </div>

                            <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/30">
                                <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 mb-2">
                                    <Wallet size={18} />
                                    <span className="text-sm font-medium">{tr.projectedProfit}</span>
                                </div>
                                <div className="text-2xl font-bold text-primary-800 dark:text-primary-300">€5,300</div>
                                <p className="text-sm text-primary-600 dark:text-primary-500 mt-1">{tr.netExpected}</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Invoices */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="section-title mb-0">{tr.recentInvoices}</h3>
                            <button className="btn-ghost text-sm" onClick={() => setActiveTab('invoices')}>
                                {tr.viewAll}
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
                            <input type="text" placeholder={tr.searchInvoices} className="input-field pl-10" />
                        </div>
                        <button className="btn-secondary">
                            <Filter size={18} />
                            {tr.filter}
                        </button>
                    </div>

                    <div className="table-container">
                        <table className="table-premium w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs font-semibold text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3">{tr.th_invoice}</th>
                                    <th className="px-4 py-3">{tr.th_client}</th>
                                    <th className="px-4 py-3">{tr.th_amount}</th>
                                    <th className="px-4 py-3">{tr.th_status}</th>
                                    <th className="px-4 py-3">{tr.th_dueDate}</th>
                                    <th className="px-4 py-3 text-right">{tr.th_actions}</th>
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
                                        {mockInvoices.filter(i => i.clientId === client.id).length} {tr.invoicesCount}
                                    </span>
                                    <button className="text-sm font-semibold text-primary-600 hover:underline">{tr.viewDetails}</button>
                                </div>
                            </div>
                        ))}

                        {/* Add Client Card */}
                        <button onClick={() => setShowAddClient(true)} className="card border-2 border-dashed border-gray-300 dark:border-gray-700 bg-transparent hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 flex flex-col items-center justify-center min-h-[200px] gap-3 group transition-all">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center text-gray-500 group-hover:text-primary-600 transition-colors">
                                <Plus size={24} />
                            </div>
                            <span className="font-bold text-gray-600 dark:text-gray-400 group-hover:text-primary-700 dark:group-hover:text-primary-300">{tr.addNewClientCard}</span>
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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tr.comingSoon}</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{tr.chartsDesc}</p>
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
                                {tr.modalAddClientTitle}
                            </h3>
                            <button onClick={() => setShowAddClient(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="label-text">{tr.labelCompany}</label>
                                <div className="relative">
                                    <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" className="input-field pl-10" placeholder={tr.phCompany} autoFocus />
                                </div>
                            </div>
                            <div>
                                <label className="label-text">{tr.labelContact}</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" className="input-field pl-10" placeholder={tr.phContact} />
                                </div>
                            </div>
                            <div>
                                <label className="label-text">{tr.labelEmail}</label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="email" className="input-field pl-10" placeholder={tr.phEmail} />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button onClick={() => setShowAddClient(false)} className="btn-ghost flex-1">{tr.cancel}</button>
                                <button className="btn-primary flex-1">{tr.save}</button>
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
                                {tr.modalInvoiceTitle}
                            </h3>
                            <button onClick={() => setShowCreateInvoice(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="label-text">{tr.labelSelectClient}</label>
                                <select className="input-field">
                                    <option value="">{tr.optionSelectClient}</option>
                                    {mockClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label-text">{tr.th_dueDate}</label>
                                <input type="date" className="input-field" />
                            </div>
                            <div>
                                <label className="label-text">{tr.labelInvoiceNum}</label>
                                <input type="text" className="input-field bg-gray-50 dark:bg-gray-800" value="INV-2024-004" readOnly />
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{tr.sectionItems}</h4>
                            <div className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                                {tr.placeholderItems}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowCreateInvoice(false)} className="btn-ghost">{tr.cancel}</button>
                            <button className="btn-primary items-center flex gap-2">
                                <Send size={16} />
                                {tr.createSend}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoicingView;
