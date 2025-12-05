import React, { useState, useMemo } from 'react';
import {
    FileText, Plus, DollarSign, TrendingUp, TrendingDown,
    Users, Calendar, Clock, CheckCircle, AlertCircle,
    Send, Download, Printer, Search, Filter, MoreHorizontal,
    ChevronRight, Eye, Edit2, Trash2, ArrowUpRight, ArrowDownRight,
    PieChart, BarChart3, Wallet, Target, X
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Invoice, Client, InvoiceItem } from '../../types/planner';

const InvoicingView: React.FC = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'clients' | 'analytics'>('dashboard');
    const [showCreateInvoice, setShowCreateInvoice] = useState(false);
    const [showAddClient, setShowAddClient] = useState(false);

    // Mock data for demonstration - will be replaced with context
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
        { id: '1', name: 'Tech Solutions Kft.', email: 'info@techsolutions.hu', company: 'Tech Solutions', createdAt: new Date() },
        { id: '2', name: 'Creative Agency Bt.', email: 'hello@creative.hu', company: 'Creative Agency', createdAt: new Date() },
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
            draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
            sent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
            paid: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300',
            overdue: 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300',
            cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
        };

        const labels = {
            draft: 'Draft',
            sent: 'Sent',
            paid: 'Paid',
            overdue: 'Overdue',
            cancelled: 'Cancelled',
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
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
                            PhD-Level Invoicing
                        </h1>
                        <p className="view-subtitle">
                            Professional invoice management with revenue forecasting and analytics
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setShowAddClient(true)}
                            className="btn-secondary"
                        >
                            <Users size={18} />
                            <span className="hidden sm:inline">Add Client</span>
                        </button>
                        <button
                            onClick={() => setShowCreateInvoice(true)}
                            className="btn-primary"
                        >
                            <Plus size={18} />
                            Create Invoice
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-6">
                    <div className="tab-group">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: PieChart },
                            { id: 'invoices', label: 'Invoices', icon: FileText },
                            { id: 'clients', label: 'Clients', icon: Users },
                            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium opacity-90">Total Revenue</span>
                                    <ArrowUpRight size={20} className="opacity-80" />
                                </div>
                                <div className="text-3xl font-bold">€{stats.totalRevenue.toLocaleString()}</div>
                                <div className="text-sm opacity-80 mt-1">+12.5% from last month</div>
                            </div>
                        </div>

                        <div className="stat-card stat-card-primary">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium opacity-90">Pending</span>
                                    <Clock size={20} className="opacity-80" />
                                </div>
                                <div className="text-3xl font-bold">€{stats.pendingAmount.toLocaleString()}</div>
                                <div className="text-sm opacity-80 mt-1">2 invoices awaiting payment</div>
                            </div>
                        </div>

                        <div className="stat-card stat-card-warning">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium opacity-90">Overdue</span>
                                    <AlertCircle size={20} className="opacity-80" />
                                </div>
                                <div className="text-3xl font-bold">€{stats.overdueAmount.toLocaleString()}</div>
                                <div className="text-sm opacity-80 mt-1">1 invoice needs attention</div>
                            </div>
                        </div>

                        <div className="stat-card stat-card-accent">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium opacity-90">Total Clients</span>
                                    <Users size={20} className="opacity-80" />
                                </div>
                                <div className="text-3xl font-bold">{stats.totalClients}</div>
                                <div className="text-sm opacity-80 mt-1">Active clients this month</div>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Forecast Card */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="section-title flex items-center gap-2 mb-0">
                                <Target size={20} className="text-primary-500" />
                                Revenue Forecast
                            </h3>
                            <select className="input-field max-w-[140px] py-2">
                                <option>This Month</option>
                                <option>This Quarter</option>
                                <option>This Year</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800/30">
                                <div className="flex items-center gap-2 text-success-700 dark:text-success-400 mb-2">
                                    <TrendingUp size={18} />
                                    <span className="text-sm font-medium">Expected Income</span>
                                </div>
                                <div className="text-2xl font-bold text-success-800 dark:text-success-300">€8,500</div>
                                <p className="text-sm text-success-600 dark:text-success-500 mt-1">Based on pending invoices</p>
                            </div>

                            <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800/30">
                                <div className="flex items-center gap-2 text-danger-700 dark:text-danger-400 mb-2">
                                    <TrendingDown size={18} />
                                    <span className="text-sm font-medium">Expected Expenses</span>
                                </div>
                                <div className="text-2xl font-bold text-danger-800 dark:text-danger-300">€3,200</div>
                                <p className="text-sm text-danger-600 dark:text-danger-500 mt-1">Subscriptions + recurring</p>
                            </div>

                            <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/30">
                                <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 mb-2">
                                    <Wallet size={18} />
                                    <span className="text-sm font-medium">Projected Profit</span>
                                </div>
                                <div className="text-2xl font-bold text-primary-800 dark:text-primary-300">€5,300</div>
                                <p className="text-sm text-primary-600 dark:text-primary-500 mt-1">Net expected earnings</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Invoices */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="section-title mb-0">Recent Invoices</h3>
                            <button className="btn-ghost text-sm" onClick={() => setActiveTab('invoices')}>
                                View All
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {mockInvoices.slice(0, 3).map((invoice) => (
                                <div
                                    key={invoice.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 
                           hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                                            <FileText size={18} className="text-primary-600 dark:text-primary-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {mockClients.find(c => c.id === invoice.clientId)?.name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900 dark:text-white">€{invoice.total.toLocaleString()}</p>
                                        {getStatusBadge(invoice.status)}
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
                    {/* Search and Filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search invoices..."
                                className="input-field pl-10"
                            />
                        </div>
                        <button className="btn-secondary">
                            <Filter size={18} />
                            Filter
                        </button>
                    </div>

                    {/* Invoices Table */}
                    <div className="table-container">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Client</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Due Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockInvoices.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td className="font-medium">{invoice.invoiceNumber}</td>
                                        <td>{mockClients.find(c => c.id === invoice.clientId)?.name}</td>
                                        <td className="font-bold">€{invoice.total.toLocaleString()}</td>
                                        <td>{getStatusBadge(invoice.status)}</td>
                                        <td>{invoice.dueDate.toLocaleDateString()}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                    <Eye size={16} className="text-gray-500" />
                                                </button>
                                                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                    <Edit2 size={16} className="text-gray-500" />
                                                </button>
                                                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                    <Download size={16} className="text-gray-500" />
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
                            <div key={client.id} className="card hover-lift">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 
                                  flex items-center justify-center text-white font-bold text-lg">
                                            {client.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{client.name}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{client.company}</p>
                                        </div>
                                    </div>
                                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        <MoreHorizontal size={18} className="text-gray-400" />
                                    </button>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <p className="text-gray-600 dark:text-gray-400">{client.email}</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {mockInvoices.filter(i => i.clientId === client.id).length} invoices
                                    </span>
                                    <button className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add Client Card */}
                        <button
                            onClick={() => setShowAddClient(true)}
                            className="card border-2 border-dashed border-gray-300 dark:border-gray-600 
                       hover:border-primary-400 dark:hover:border-primary-500
                       flex flex-col items-center justify-center min-h-[200px]
                       text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400
                       transition-all"
                        >
                            <Plus size={32} className="mb-2" />
                            <span className="font-medium">Add New Client</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="card">
                        <h3 className="section-title">Revenue Analytics</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            Detailed analytics and charts will be displayed here.
                            This section will show monthly trends, category breakdowns, and forecasting charts.
                        </p>

                        {/* Placeholder for charts */}
                        <div className="mt-6 h-64 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                <BarChart3 size={48} className="mx-auto mb-2 opacity-50" />
                                <p>Interactive charts coming soon</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Create Invoice Modal */}
            {showCreateInvoice && (
                <div className="modal-backdrop" onClick={() => setShowCreateInvoice(false)}>
                    <div className="modal-panel w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Invoice</h3>
                            <button onClick={() => setShowCreateInvoice(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
                                    <select className="input-field">
                                        <option value="">Select Client</option>
                                        {mockClients.map(client => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                                    <input type="date" className="input-field" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Number</label>
                                <input type="text" defaultValue={`INV-2024-${(mockInvoices.length + 1).toString().padStart(3, '0')}`} className="input-field" readOnly />
                            </div>

                            {/* Items Section Placeholder */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <h4 className="font-medium mb-3">Invoice Items</h4>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center text-sm text-gray-500">
                                    Item adding functionality will be implemented here.
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button onClick={() => setShowCreateInvoice(false)} className="btn-ghost">Cancel</button>
                                <button className="btn-primary">
                                    <Send size={18} />
                                    Create & Send
                                </button>
                            </div>
                        </div>
                        {/* Add Client Modal */}
                        {showAddClient && (
                            <div className="modal-backdrop" onClick={() => setShowAddClient(false)}>
                                <div className="modal-panel w-full max-w-md" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add New Client</h3>
                                        <button onClick={() => setShowAddClient(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                            <X size={20} className="text-gray-500" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                                            <input type="text" className="input-field" placeholder="e.g. Tech Solutions Ltd." />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Name</label>
                                            <input type="text" className="input-field" placeholder="e.g. John Doe" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                            <input type="email" className="input-field" placeholder="john@example.com" />
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-2">
                                            <button onClick={() => setShowAddClient(false)} className="btn-ghost">Cancel</button>
                                            <button className="btn-primary">
                                                <Plus size={18} />
                                                Add Client
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoicingView;
