import React, { useState, useMemo } from 'react';
import {
    FileText, Plus, Users, Clock, CheckCircle, AlertCircle,
    Send, Download, Search, Filter, MoreHorizontal,
    ChevronRight, Eye, Trash2, Settings, Upload,
    PieChart, Wallet, X, Building2, User, Mail, Share2, Check
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { Invoice, Client, InvoiceItem, CompanyProfile } from '../../types/planner';

const printStyles = `
  @media print {
    @page { 
      margin: 10mm; 
      size: auto;
    }
    body { 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    /* Hide browser headers/footers */
    header, footer, nav, .no-print { 
      display: none !important; 
    }
  }
`;

// Company Info type
interface CompanyInfo {
    name: string;
    address: string;
    email: string;
    phone: string;
    taxNumber: string;
    logo: string | null;
}

const DEFAULT_COMPANY_INFO: CompanyInfo = {
    name: '',
    address: '',
    email: '',
    phone: '',
    taxNumber: '',
    logo: null,
};

const InvoicingView: React.FC = () => {
    const { t, language } = useLanguage();
    const {
        invoices, clients, companyProfiles,
        addInvoice, addClient, addCompanyProfile
    } = useData();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'clients' | 'analytics'>('dashboard');
    const [toast, setToast] = useState<string | null>(null);
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
    const [showCompanySettings, setShowCompanySettings] = useState(false);
    const [showAddCompanyProfile, setShowAddCompanyProfile] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [newCompanyProfile, setNewCompanyProfile] = useState<Partial<CompanyProfile>>({
        name: '', address: '', email: '', phone: '', taxNumber: '', bankAccount: '', logo: null
    });

    // Company info state with localStorage
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
        const saved = localStorage.getItem('invoiceCompanyInfo');
        return saved ? JSON.parse(saved) : DEFAULT_COMPANY_INFO;
    });

    // Save company info to localStorage
    const saveCompanyInfo = (info: CompanyInfo) => {
        setCompanyInfo(info);
        localStorage.setItem('invoiceCompanyInfo', JSON.stringify(info));
    };

    // Logo upload handler
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newInfo = { ...companyInfo, logo: reader.result as string };
                saveCompanyInfo(newInfo);
            };
            reader.readAsDataURL(file);
        }
    };

    // State
    const [showCreateInvoice, setShowCreateInvoice] = useState(false);
    const [showAddClient, setShowAddClient] = useState(false);

    // Download PDF handler - open preview first
    const handleDownloadPdf = (invoice: Invoice) => {
        setPreviewInvoice(invoice);
    };

    // Actual print function
    const handlePrint = () => {
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
            addClient({
                ...newClient,
                id: Date.now().toString(),
                company: newClient.company || newClient.name,
                address: newClient.address || '',
                createdAt: new Date()
            } as Client);
            setNewClient({});
            setShowAddClient(false);
        }
    };

    // Company Profile Handlers
    const handleAddCompanyProfileSubmit = () => {
        if (newCompanyProfile.name && newCompanyProfile.email) {
            addCompanyProfile({
                name: newCompanyProfile.name || '',
                address: newCompanyProfile.address || '',
                email: newCompanyProfile.email || '',
                phone: newCompanyProfile.phone || '',
                taxNumber: newCompanyProfile.taxNumber || '',
                bankAccount: newCompanyProfile.bankAccount || '',
                logo: newCompanyProfile.logo || null
            });
            setNewCompanyProfile({ name: '', address: '', email: '', phone: '', taxNumber: '', bankAccount: '', logo: null });
            setShowAddCompanyProfile(false);
        }
    };

    const handleCompanyLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewCompanyProfile(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
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
            // Smart auto-increment logic
            const currentYear = new Date().getFullYear();
            const countThisYear = invoices.filter(i => i.invoiceNumber.includes(`INV-${currentYear}`)).length;
            const nextNum = countThisYear + 1;
            const invoiceNumber = `INV-${currentYear}-${String(nextNum).padStart(3, '0')}`;

            addInvoice({
                ...newInvoice,
                id: Date.now().toString(),
                invoiceNumber: invoiceNumber,
                // Ensure required fields
                items: newInvoice.items || [],
                subtotal: newInvoice.subtotal || 0,
                tax: newInvoice.tax || 0,
                total: newInvoice.total || 0,
                issueDate: newInvoice.issueDate || new Date(),
                dueDate: newInvoice.dueDate || new Date(),
                createdAt: new Date()
            } as Invoice);

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

            {/* Print Styles Injection */}
            <style>{printStyles}</style>

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
                            {/* Two-column layout: Company (Kiállító) | Client (Vevő) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Company Profile (Kiállító) */}
                                <div className="space-y-4 p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800/50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                            <Building2 size={16} />
                                            {language === 'hu' ? 'Kiállító (Cég)' : 'Issuer (Company)'}
                                        </h3>
                                        <button onClick={() => setShowAddCompanyProfile(true)} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                                            <Plus size={14} /> {language === 'hu' ? 'Új Cég' : 'New Company'}
                                        </button>
                                    </div>
                                    <select className="input-field w-full bg-white dark:bg-gray-800" value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}>
                                        <option value="">{language === 'hu' ? 'Válassz céget...' : 'Select company...'}</option>
                                        {companyProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    {selectedCompanyId && (() => {
                                        const company = companyProfiles.find(p => p.id === selectedCompanyId);
                                        return company ? (
                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl text-sm space-y-2 border border-indigo-100 dark:border-gray-700 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    {company.logo && <img src={company.logo} alt="Logo" className="w-10 h-10 rounded object-contain bg-gray-100" />}
                                                    <div><p className="font-bold text-gray-900 dark:text-white">{company.name}</p><p className="text-gray-500 text-xs">{company.taxNumber}</p></div>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-400">{company.address}</p>
                                                <p className="text-gray-600 dark:text-gray-400">{company.email} • {company.phone}</p>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>

                                {/* Client (Vevő) */}
                                <div className="space-y-4 p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                            <User size={16} />
                                            {language === 'hu' ? 'Vevő (Ügyfél)' : 'Buyer (Client)'}
                                        </h3>
                                        <button onClick={() => setShowAddClient(true)} className="text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 flex items-center gap-1 hover:underline">
                                            <Plus size={14} /> {language === 'hu' ? 'Új Ügyfél' : 'New Client'}
                                        </button>
                                    </div>
                                    <select className="input-field w-full bg-white dark:bg-gray-800" value={newInvoice.clientId || ''} onChange={(e) => setNewInvoice({ ...newInvoice, clientId: e.target.value })}>
                                        <option value="">{language === 'hu' ? 'Válassz ügyfelet...' : 'Select client...'}</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} - {c.company}</option>)}
                                    </select>
                                    {newInvoice.clientId && (() => {
                                        const client = clients.find(c => c.id === newInvoice.clientId);
                                        return client ? (
                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl text-sm space-y-1 border border-emerald-100 dark:border-gray-700 shadow-sm text-gray-600 dark:text-gray-400">
                                                <p className="font-bold text-gray-900 dark:text-white">{client.company || client.name}</p>
                                                <p>{client.name}</p><p>{client.address}</p><p>{client.email}</p>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </div>

                            {/* Invoice Details Row */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <div>
                                    <label className="label-text">{t('invoicing.invoiceNumber')}</label>
                                    <div className="font-mono bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600">
                                        INV-{new Date().getFullYear()}-{String(invoices.length + 1).padStart(3, '0')}
                                    </div>
                                </div>
                                <div>
                                    <label className="label-text">{t('invoicing.currency')}</label>
                                    <select className="input-field bg-white dark:bg-gray-800" value={newInvoice.currency} onChange={(e) => setNewInvoice({ ...newInvoice, currency: e.target.value })}>
                                        <option value="HUF">HUF (Ft)</option><option value="EUR">EUR (€)</option><option value="USD">USD ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label-text">{t('invoicing.invoiceDate')}</label>
                                    <input type="date" className="input-field bg-white dark:bg-gray-800" value={newInvoice.issueDate?.toISOString().split('T')[0]} onChange={(e) => setNewInvoice({ ...newInvoice, issueDate: new Date(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="label-text">{t('invoicing.dueDate')}</label>
                                    <input type="date" className="input-field bg-white dark:bg-gray-800" value={newInvoice.dueDate?.toISOString().split('T')[0]} onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: new Date(e.target.value) })} />
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

            {/* Add Company Profile Modal */}
            {showAddCompanyProfile && (
                <div className="modal-backdrop z-50">
                    <div className="modal-panel max-w-lg w-full p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Building2 className="text-indigo-600" size={20} />
                                {language === 'hu' ? 'Új Céges Profil' : 'New Company Profile'}
                            </h3>
                            <button onClick={() => setShowAddCompanyProfile(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {/* Logo Upload */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                                    {newCompanyProfile.logo ? (
                                        <img src={newCompanyProfile.logo} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <Upload size={24} className="text-gray-400" />
                                    )}
                                </div>
                                <label className="btn-secondary text-sm cursor-pointer">
                                    {language === 'hu' ? 'Logo Feltöltése' : 'Upload Logo'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleCompanyLogoUpload} />
                                </label>
                            </div>
                            <input type="text" className="input-field" placeholder={language === 'hu' ? 'Cég neve *' : 'Company Name *'} value={newCompanyProfile.name || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, name: e.target.value })} />
                            <input type="text" className="input-field" placeholder={language === 'hu' ? 'Cím' : 'Address'} value={newCompanyProfile.address || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, address: e.target.value })} />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="email" className="input-field" placeholder={language === 'hu' ? 'Email *' : 'Email *'} value={newCompanyProfile.email || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, email: e.target.value })} />
                                <input type="text" className="input-field" placeholder={language === 'hu' ? 'Telefon' : 'Phone'} value={newCompanyProfile.phone || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, phone: e.target.value })} />
                            </div>
                            <input type="text" className="input-field" placeholder={language === 'hu' ? 'Adószám' : 'Tax Number'} value={newCompanyProfile.taxNumber || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, taxNumber: e.target.value })} />
                            <input type="text" className="input-field" placeholder={language === 'hu' ? 'Bankszámlaszám' : 'Bank Account'} value={newCompanyProfile.bankAccount || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, bankAccount: e.target.value })} />
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button onClick={() => setShowAddCompanyProfile(false)} className="btn-ghost">{t('common.cancel')}</button>
                                <button onClick={handleAddCompanyProfileSubmit} className="btn-primary">{t('common.save')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Company Settings Modal */}
            {showCompanySettings && (
                <div className="modal-backdrop">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cégadatok Beállítása</h2>
                            <button
                                onClick={() => setShowCompanySettings(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Logo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo</label>
                                <div className="flex items-center gap-4">
                                    {companyInfo.logo ? (
                                        <img src={companyInfo.logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                            <Building2 size={24} />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <label className="cursor-pointer btn-secondary inline-flex items-center gap-2">
                                            <Upload size={16} />
                                            Logo Feltöltése
                                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                        </label>
                                        {companyInfo.logo && (
                                            <button
                                                onClick={() => saveCompanyInfo({ ...companyInfo, logo: null })}
                                                className="ml-2 text-red-500 text-sm hover:underline"
                                            >
                                                Törlés
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Company Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cégnév *</label>
                                <input
                                    type="text"
                                    value={companyInfo.name}
                                    onChange={(e) => saveCompanyInfo({ ...companyInfo, name: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="Pl. Példa Kft."
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cím</label>
                                <input
                                    type="text"
                                    value={companyInfo.address}
                                    onChange={(e) => saveCompanyInfo({ ...companyInfo, address: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="Pl. 1234 Budapest, Példa utca 1."
                                />
                            </div>

                            {/* Email & Phone */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={companyInfo.email}
                                        onChange={(e) => saveCompanyInfo({ ...companyInfo, email: e.target.value })}
                                        className="input-field w-full"
                                        placeholder="info@pelda.hu"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
                                    <input
                                        type="tel"
                                        value={companyInfo.phone}
                                        onChange={(e) => saveCompanyInfo({ ...companyInfo, phone: e.target.value })}
                                        className="input-field w-full"
                                        placeholder="+36 1 234 5678"
                                    />
                                </div>
                            </div>

                            {/* Tax Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adószám</label>
                                <input
                                    type="text"
                                    value={companyInfo.taxNumber}
                                    onChange={(e) => saveCompanyInfo({ ...companyInfo, taxNumber: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="12345678-1-42"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button onClick={() => setShowCompanySettings(false)} className="btn-primary">
                                Mentés és Bezárás
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Preview Modal */}
            {previewInvoice && (
                <div className="modal-backdrop print:bg-white">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-auto print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
                        {/* Print Header - Hidden on screen, shown in print */}
                        <div className="hidden print:block p-8 border-b-2 border-gray-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">SZÁMLA</h1>
                                    <p className="text-gray-500 mt-1">Invoice #{previewInvoice.invoiceNumber}</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-xl font-bold text-primary-600">{companyInfo.name || 'Cégnév'}</h2>
                                    <p className="text-sm text-gray-500">{companyInfo.address || 'Cím'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Screen Header */}
                        <div className="print:hidden flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('invoicing.invoicePreview')}</h2>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowCompanySettings(true)}
                                    className="btn-secondary flex items-center gap-2"
                                >
                                    <Settings size={18} />
                                    Cégadatok
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <Download size={18} />
                                    {t('invoicing.downloadPdf')}
                                </button>
                                <button
                                    onClick={() => setPreviewInvoice(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Invoice Content */}
                        <div className="p-8 print:p-12">
                            {/* Invoice Header */}
                            <div className="flex justify-between items-start mb-8 print:mb-12">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg mb-4 print:bg-gray-100">
                                        <FileText size={20} className="text-primary-600" />
                                        <span className="font-bold text-primary-700 dark:text-primary-400">SZÁMLA / INVOICE</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{previewInvoice.invoiceNumber}</h3>
                                    <p className="text-gray-500 mt-1">{t('invoicing.issueDate')}: {formatDate(previewInvoice.issueDate)}</p>
                                    <p className="text-gray-500">{t('invoicing.dueDate')}: {formatDate(previewInvoice.dueDate)}</p>
                                </div>
                                <div className="text-right">
                                    {companyInfo.logo ? (
                                        <img src={companyInfo.logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain mb-3 ml-auto" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-2xl mb-3">
                                            {companyInfo.name ? companyInfo.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                    )}
                                    <p className="font-bold text-gray-900 dark:text-white">{companyInfo.name || 'Cégnév beállítása szükséges'}</p>
                                    <p className="text-sm text-gray-500">{companyInfo.address || ''}</p>
                                    {companyInfo.taxNumber && <p className="text-xs text-gray-400">Adószám: {companyInfo.taxNumber}</p>}
                                </div>
                            </div>

                            {/* Client Info */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8 print:bg-gray-100">
                                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('invoicing.billTo')}</h4>
                                {(() => {
                                    const client = clients.find(c => c.id === previewInvoice.clientId);
                                    return client ? (
                                        <div>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{client.company}</p>
                                            <p className="text-gray-600 dark:text-gray-400">{client.name}</p>
                                            <p className="text-gray-500">{client.email}</p>
                                            <p className="text-gray-500">{client.address}</p>
                                        </div>
                                    ) : null;
                                })()}
                            </div>

                            {/* Invoice Items */}
                            <table className="w-full mb-8">
                                <thead>
                                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                                        <th className="py-3 text-left text-sm font-semibold text-gray-500 uppercase">{t('invoicing.item')}</th>
                                        <th className="py-3 text-center text-sm font-semibold text-gray-500 uppercase">{t('invoicing.quantity')}</th>
                                        <th className="py-3 text-right text-sm font-semibold text-gray-500 uppercase">{t('invoicing.rate')}</th>
                                        <th className="py-3 text-right text-sm font-semibold text-gray-500 uppercase">{t('invoicing.amount')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {previewInvoice.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="py-4 text-gray-900 dark:text-white font-medium">{item.description}</td>
                                            <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                                            <td className="py-4 text-right text-gray-600">{formatCurrency(item.rate, previewInvoice.currency)}</td>
                                            <td className="py-4 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(item.amount, previewInvoice.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Totals */}
                            <div className="flex justify-end">
                                <div className="w-72 space-y-3">
                                    <div className="flex justify-between text-gray-600">
                                        <span>{t('invoicing.subtotal')}</span>
                                        <span>{formatCurrency(previewInvoice.subtotal, previewInvoice.currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>{t('invoicing.tax')} ({previewInvoice.taxRate}%)</span>
                                        <span>{formatCurrency(previewInvoice.tax, previewInvoice.currency)}</span>
                                    </div>
                                    <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-3">
                                        <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                                            <span>{t('invoicing.total')}</span>
                                            <span>{formatCurrency(previewInvoice.total, previewInvoice.currency)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 print:border-gray-300">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">{t('invoicing.status')}</p>
                                        <div className="mt-1">{getStatusBadge(previewInvoice.status)}</div>
                                    </div>
                                    <div className="text-right text-sm text-gray-400 print:text-gray-600">
                                        <p>Generálva: {new Date().toLocaleString('hu-HU')}</p>
                                        <p>ContentPlanner Pro © {new Date().getFullYear()}</p>
                                    </div>
                                </div>
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
