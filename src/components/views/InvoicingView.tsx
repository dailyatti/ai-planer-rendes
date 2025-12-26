import React, { useState, useMemo } from 'react';
import {
    FileText, Users, Plus, X, Mail, Clock, Wallet, Building2, AlertCircle,
    Download, ChevronRight, PieChart, User, CheckCircle, Search,
    TrendingUp, Filter, Check, Send, Share2, MoreHorizontal,
    Trash2, Upload, Settings, Repeat, RefreshCcw
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { Invoice, InvoiceItem, Client, CompanyProfile } from '../../types/planner';
import { FinancialEngine } from '../../utils/FinancialEngine';
import { CurrencyService } from '../../services/CurrencyService';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { SequenceService } from '../../services/SequenceService';
import { InvoiceCalculator } from '../../utils/InvoiceCalculator';
import { AVAILABLE_CURRENCIES } from '../../constants/currencyData';

interface CompanyInfo {
    name: string;
    address: string;
    taxNumber: string;
    bankAccount: string;
    email: string;
    phone: string;
    logo: string | null;
}

const printStyles = `
  @media print {
    @page { 
      margin: 0mm; 
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
    /* Fix dark mode leaks in print */
    .print-container {
        background-color: white !important;
        color: black !important;
    }
    .print-container * {
        border-color: #e5e7eb !important; /* gray-200 */
        color: black !important;
    }
  }
`;

// ... (Client info type remains)

const InvoicingView: React.FC = () => {
    const { t, language } = useLanguage();
    const {
        invoices, clients, companyProfiles,
        addInvoice, updateInvoice, deleteInvoice,
        addClient, addCompanyProfile,
        getFinancialSummary
    } = useData();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'clients' | 'analytics'>('dashboard');
    const [showCreateInvoice, setShowCreateInvoice] = useState(false);
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
    const [selectedStat, setSelectedStat] = useState<{ title: string; breakdown: Record<string, number>; rect: DOMRect } | null>(null);

    // Close popover when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => setSelectedStat(null);
        if (selectedStat) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [selectedStat]);
    const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

    // New Invoice State
    const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
        currency: 'USD',
        taxRate: 0,
        items: [],
        status: 'draft'
    });

    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

    // Modal states
    const [showAddClient, setShowAddClient] = useState(false);
    const [newClient, setNewClient] = useState<Partial<Client>>({});

    const [showAddCompanyProfile, setShowAddCompanyProfile] = useState(false);
    const [newCompanyProfile, setNewCompanyProfile] = useState<Partial<CompanyProfile>>({});
    const [showCompanySettings, setShowCompanySettings] = useState(false);

    // Default Company Info Logic
    const DEFAULT_COMPANY_INFO: CompanyInfo = {
        name: '',
        address: '',
        taxNumber: '',
        bankAccount: '',
        email: '',
        phone: '',
        logo: null
    };

    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
        const saved = localStorage.getItem('companyInfo');
        return saved ? JSON.parse(saved) : DEFAULT_COMPANY_INFO;
    });

    const saveCompanyInfo = (info: CompanyInfo) => {
        setCompanyInfo(info);
        localStorage.setItem('companyInfo', JSON.stringify(info));
    };

    const [toast, setToast] = useState<string | null>(null);
    // Currency Converter State
    const [showConverter, setShowConverter] = useState(false);
    const [convAmount, setConvAmount] = useState('');
    const [convFrom, setConvFrom] = useState('USD');
    const [convTo, setConvTo] = useState('EUR');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // Formatting
    const formatCurrency = (amount: number, currency: string) => {
        return InvoiceCalculator.formatCurrency(amount, currency, language === 'hu' ? 'hu-HU' : 'en-US');
    };

    const formatDate = (date: Date | string | undefined | null): string => {
        if (!date) return '-';
        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            if (isNaN(dateObj.getTime())) return '-';
            return new Intl.DateTimeFormat(language === 'hu' ? 'hu-HU' : 'en-US').format(dateObj);
        } catch {
            return '-';
        }
    };

    const [searchQuery, setSearchQuery] = useState('');

    const filteredInvoices = useMemo(() => {
        if (!searchQuery) return invoices;
        const lower = searchQuery.toLowerCase();
        return invoices.filter(i =>
            i.invoiceNumber.toLowerCase().includes(lower) ||
            clients.find(c => c.id === i.clientId)?.name.toLowerCase().includes(lower)
        );
    }, [invoices, searchQuery, clients]);

    // Calculations using FinancialEngine
    const stats = useMemo(() => {
        const summary = getFinancialSummary('USD'); // Default to USD base
        const totalClients = clients.length;



        return {
            totalRevenue: summary.revenue, // Now implies Total Invoiced (Paid+Sent+Overdue)
            paidAmount: summary.paid,     // New Paid Amount
            pendingAmount: summary.pending,
            overdueAmount: summary.overdue,
            totalClients
        };
    }, [invoices, clients, getFinancialSummary]);

    const previewCompany = useMemo(() => {
        if (!previewInvoice) return companyInfo;
        if (previewInvoice.companyProfileId) {
            const profile = companyProfiles.find(p => p.id === previewInvoice.companyProfileId);
            if (profile) return profile;
        }
        return companyInfo;
    }, [previewInvoice, companyProfiles, companyInfo]);

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

    // Centralized recalculation helper
    const recalcInvoice = (items: InvoiceItem[], taxRate: number, currency: string) => {
        // Ensure items have correct amount
        const processedItems = items.map(item => ({
            ...item,
            amount: item.quantity * item.rate
        }));

        const totals = InvoiceCalculator.calculateTotals(
            processedItems,
            taxRate,
            currency
        );

        return {
            items: processedItems,
            ...totals
        };
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const items = [...(newInvoice.items || [])];
        items[index] = { ...items[index], [field]: value };

        const updatedData = recalcInvoice(
            items,
            newInvoice.taxRate || 0,
            newInvoice.currency || 'USD'
        );

        setNewInvoice({
            ...newInvoice,
            items: updatedData.items,
            subtotal: updatedData.subtotal,
            tax: updatedData.taxAmount, // Note: InvoiceCalculator returns taxAmount, Invoice type expects tax
            total: updatedData.total
        });
    };

    const handleRemoveItem = (index: number) => {
        const items = [...(newInvoice.items || [])];
        items.splice(index, 1);

        const updatedData = recalcInvoice(
            items,
            newInvoice.taxRate || 0,
            newInvoice.currency || 'USD'
        );

        setNewInvoice({
            ...newInvoice,
            items: updatedData.items,
            subtotal: updatedData.subtotal,
            tax: updatedData.taxAmount,
            total: updatedData.total
        });
    };

    // Bulk Selection Handlers
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedInvoices(new Set(invoices.map(i => i.id)));
        } else {
            setSelectedInvoices(new Set());
        }
    };

    const handleToggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedInvoices);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedInvoices(newSelected);
    };

    const handleBulkDelete = () => {
        if (window.confirm(t('invoicing.confirmBulkDelete'))) {
            selectedInvoices.forEach(id => deleteInvoice(id));
            setSelectedInvoices(new Set());
        }
    };

    const handleDeleteAll = () => {
        if (window.confirm(t('invoicing.confirmDeleteAll'))) {
            invoices.forEach(i => deleteInvoice(i.id));
            setSelectedInvoices(new Set());
        }
    };

    const handleSaveInvoice = () => {
        if (newInvoice.clientId && newInvoice.items?.length) {
            // Check if we need to generate a persistent sequence number
            let invoiceNumber = newInvoice.invoiceNumber;

            // If it's a placeholder or empty, generate the real sequence number
            if (!invoiceNumber || invoiceNumber.includes('XXXX')) {
                // Pass the company ID to sequence service for multi-company support
                invoiceNumber = SequenceService.getNextInvoiceNumber(selectedCompanyId);
            }

            addInvoice({
                ...newInvoice,
                companyProfileId: selectedCompanyId,
                id: Date.now().toString(),
                invoiceNumber: invoiceNumber,
                // Ensure required fields
                items: newInvoice.items || [],
                subtotal: newInvoice.subtotal || 0,
                tax: newInvoice.taxRate ? (filterTax(newInvoice.subtotal || 0, newInvoice.taxRate)) : 0, // Recalculate if needed or trust state
                total: newInvoice.total || 0,
                issueDate: newInvoice.issueDate || new Date(),
                dueDate: newInvoice.dueDate || new Date(),
                fulfillmentDate: newInvoice.fulfillmentDate || newInvoice.issueDate || new Date(),
                paymentMethod: newInvoice.paymentMethod || 'transfer',
                createdAt: new Date(),
                status: newInvoice.status || 'sent'
            } as Invoice);

            setNewInvoice({
                items: [{ id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }],
                currency: 'USD',
                taxRate: 27,
                status: 'sent',
                issueDate: new Date(),
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            });
            setShowCreateInvoice(false);
            showToast(t('invoicing.invoiceSaved'));
        } else {
            alert(t('invoicing.fillRequired'));
        }
    };

    // Helper to calculate tax if missing from state (safety)
    const filterTax = (subtotal: number, rate: number) => subtotal * (rate / 100);

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
            sent: t('invoicing.pending'), // Reverted to 'pending' as per user request
            paid: t('invoicing.paid'),    // Kept 'paid'
            cancelled: t('invoicing.statusCancelled'),
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
                {status === 'paid' && <CheckCircle size={12} />}
                {labels[status]}
            </span>
        );
    };

    const handleStatusChange = (id: string, newStatus: Invoice['status']) => {
        const inv = invoices.find(i => i.id === id);
        if (inv) {
            updateInvoice({ ...inv, status: newStatus });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = (invoice?: Invoice) => {
        if (invoice) {
            setPreviewInvoice(invoice);
        }
        // Small delay to ensure preview is rendered before printing
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const handleShare = (invoice: Invoice) => {
        // In a real app, this would be a public link. For now, we simulate copy link.
        navigator.clipboard.writeText(`${invoice.invoiceNumber}`); // Copy Invoice Number
        showToast(t('invoicing.linkCopied'));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyInfo(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
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
                    <button
                        onClick={() => setShowConverter(true)}
                        className="btn-secondary flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                        title={t('currency.converter')}
                    >
                        <RefreshCcw size={18} />
                        <span className="hidden sm:inline">{t('currency.converter')}</span>
                    </button>
                    <button onClick={() => setShowAddClient(true)} className="btn-secondary flex items-center gap-2 px-4 py-2.5">
                        <Users size={18} />
                        <span>{t('invoicing.addClient')}</span>
                    </button>
                    <button onClick={() => {
                        const randomNum = Math.floor(Math.random() * 9000 + 1000); // 4 digit random
                        setNewInvoice({
                            items: [{ id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }],
                            currency: 'USD',
                            taxRate: 27,
                            status: 'sent',
                            issueDate: new Date(),
                            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                            invoiceNumber: `INV-2026-${randomNum}`
                        });
                        setShowCreateInvoice(true);
                    }} className="btn-primary flex items-center gap-2 px-4 py-2.5 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all">
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
                    { id: 'analytics', label: t('invoicing.analytics'), icon: TrendingUp },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'dashboard' | 'invoices' | 'clients' | 'analytics')}
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
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                id: 'revenue',
                                label: t('invoicing.totalInvoiced'),
                                value: formatCurrency(stats.totalRevenue, 'USD'),
                                icon: Wallet,
                                color: 'text-indigo-600',
                                bg: 'bg-indigo-50 dark:bg-indigo-900/20',
                                status: undefined // Total doesn't filter by status
                            },
                            {
                                id: 'paid',
                                label: t('invoicing.paid'),
                                value: formatCurrency(stats.paidAmount, 'USD'),
                                icon: CheckCircle,
                                color: 'text-emerald-600',
                                bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                                status: 'paid' as const
                            },
                            {
                                id: 'pending',
                                label: t('invoicing.pending'),
                                value: formatCurrency(stats.pendingAmount, 'USD'),
                                icon: Clock,
                                color: 'text-amber-600',
                                bg: 'bg-amber-50 dark:bg-amber-900/20',
                                status: 'sent' as const
                            },
                        ].map((stat, i) => (
                            <button
                                key={i}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const breakdown = FinancialEngine.getAmountsByCurrency(invoices, stat.status);
                                    setSelectedStat({ title: stat.label, breakdown, rect });
                                }}
                                className="card p-6 border border-transparent shadow-sm hover:shadow-xl transition-all text-left relative group w-full bg-white dark:bg-gray-800 hover:-translate-y-1 duration-300"
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

                                {/* Exchange rate hint */}
                                {Object.keys(CurrencyService.getAllRates()).length > 1 && (
                                    <div className="absolute bottom-2 right-4 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {t('common.details')}
                                    </div>
                                )}
                            </button>
                        ))}

                        {/* Clients Card (Static) */}
                        <div
                            onClick={() => setActiveTab('clients')}
                            className="card p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
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

                    {/* Currency Breakdown Popover */}
                    {selectedStat && (
                        <div
                            className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 min-w-[250px] animate-in zoom-in-95 duration-200"
                            style={{
                                top: selectedStat.rect.bottom + 10,
                                left: selectedStat.rect.left
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h4 className="font-bold text-gray-900 dark:text-white mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                                {t('invoicing.detailsOf')?.replace('{label}', selectedStat.title) || `${selectedStat.title} részletei`}
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(selectedStat.breakdown).map(([currency, amount]) => (
                                    <div key={currency} className="flex justify-between items-center text-sm">
                                        <span className="font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded">
                                            {currency}
                                        </span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {CurrencyService.format(amount, currency)}
                                        </span>
                                    </div>
                                ))}
                                {Object.keys(selectedStat.breakdown).length === 0 && (
                                    <div className="text-gray-400 text-sm italic text-center py-2">{t('common.noData')}</div>
                                )}
                            </div>
                            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-center text-gray-400">
                                Árfolyam: 1 EUR ≈ {CurrencyService.getRate('EUR').toFixed(2)} USD
                            </div>
                        </div>
                    )}

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
                                <div
                                    key={invoice.id}
                                    onClick={() => handleDownloadPdf(invoice)}
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
                                                {clients.find(c => c.id === invoice.clientId)?.name}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total, invoice.currency)}</div>
                                            <div className="flex justify-end mt-1">{getStatusBadge(invoice.status)}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(t('invoicing.confirmDelete'))) {
                                                        deleteInvoice(invoice.id);
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
                        </div>
                    </div>
                </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
                <div className="card border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in">
                    <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
                        <div className="relative flex-1 w-full sm:w-auto">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('invoicing.searchPlaceholder')}
                                className="input-field pl-10 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedInvoices.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="btn-danger flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg transition-all animate-in fade-in"
                                >
                                    <Trash2 size={16} />
                                    <span>{t('invoicing.deleteSelected')} ({selectedInvoices.size})</span>
                                </button>
                            )}
                            {invoices.length > 0 && (
                                <button
                                    onClick={handleDeleteAll}
                                    className="btn-secondary flex items-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    title="Összes törlése"
                                >
                                    <Trash2 size={16} />
                                    <span className="hidden sm:inline">Összes törlése</span>
                                </button>
                            )}
                            <button className="btn-secondary flex items-center gap-2">
                                <Filter size={18} /> {t('common.filter')}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="py-3 px-4 w-10">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors cursor-pointer"
                                                checked={invoices.length > 0 && selectedInvoices.size === invoices.length}
                                                onChange={handleSelectAll}
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
                                {filteredInvoices.map(invoice => (
                                    <tr
                                        key={invoice.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                        onClick={() => handleDownloadPdf(invoice)}
                                    >
                                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors cursor-pointer"
                                                    checked={selectedInvoices.has(invoice.id)}
                                                    onClick={(e) => handleToggleSelect(invoice.id, e)}
                                                    onChange={() => { }}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{clients.find(c => c.id === invoice.clientId)?.name}</td>
                                        <td className="py-3 px-4 text-gray-500">{formatDate(invoice.issueDate)}</td>
                                        <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total, invoice.currency)}</td>
                                        <td className="py-3 px-4 text-center">{getStatusBadge(invoice.status)}</td>
                                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                {/* Quick status change buttons */}
                                                {invoice.status !== 'paid' && (
                                                    <button
                                                        onClick={() => handleStatusChange(invoice.id, 'paid')}
                                                        className="p-1.5 text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-lg transition-all"
                                                        title={t('invoicing.markAsPaid')}
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                )}
                                                {invoice.status === 'draft' && (
                                                    <button
                                                        onClick={() => handleStatusChange(invoice.id, 'sent')}
                                                        className="p-1.5 text-blue-500 hover:text-white hover:bg-blue-500 rounded-lg transition-all"
                                                        title={t('invoicing.markAsSent')}
                                                    >
                                                        <Send size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDownloadPdf(invoice)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title={t('invoicing.downloadPdf')}><Download size={16} /></button>
                                                <button onClick={() => handleShare(invoice)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title={t('invoicing.share')}><Share2 size={16} /></button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(t('invoicing.confirmDelete'))) {
                                                            deleteInvoice(invoice.id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 size={16} />
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

            {/* Analytics / Forecasting View */}
            {activeTab === 'analytics' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="card p-6 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="text-primary-600" />
                                {t('invoicing.revenueForcast')}
                            </h3>
                            <span className="text-sm text-gray-500">
                                Lineáris regresszió alapú előrejelzés
                            </span>
                        </div>

                        {(() => {
                            const forecast = FinancialEngine.generateForecast(invoices, 'USD', 6);
                            const chartData = forecast.labels.map((label, i) => ({
                                name: label,
                                actual: forecast.actual[i],
                                predicted: forecast.predicted[i]
                            }));

                            return (
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                            <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
                                            <YAxis tick={{ fill: '#9CA3AF' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                                labelStyle={{ color: '#fff' }}
                                                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                                            />
                                            <Legend />
                                            <Bar dataKey="actual" name="Tény (Múlt)" fill="#10B981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="predicted" name="Előrejelzés" fill="#6366F1" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            );
                        })()}

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Elmúlt 3 hónap átlag</div>
                                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                    {(() => {
                                        const forecast = FinancialEngine.generateForecast(invoices, 'USD', 6);
                                        const pastActual = forecast.actual.filter(v => v > 0);
                                        const avg = pastActual.length ? pastActual.reduce((a, b) => a + b, 0) / pastActual.length : 0;
                                        return '$' + avg.toLocaleString('en-US');
                                    })()}
                                </div>
                            </div>
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-1">Következő 3 hónap várható</div>
                                <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                                    {(() => {
                                        const forecast = FinancialEngine.generateForecast(invoices, 'USD', 6);
                                        const futurePredicted = forecast.predicted.filter(v => v > 0);
                                        const sum = futurePredicted.slice(0, 3).reduce((a, b) => a + b, 0);
                                        return '$' + sum.toLocaleString('en-US');
                                    })()}
                                </div>
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                <div className="text-sm text-amber-600 dark:text-amber-400 mb-1">Trend</div>
                                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                                    {(() => {
                                        const forecast = FinancialEngine.generateForecast(invoices, 'USD', 6);
                                        const pastActual = forecast.actual.filter(v => v > 0);
                                        const futurePredicted = forecast.predicted.filter(v => v > 0);
                                        const pastAvg = pastActual.length ? pastActual.reduce((a, b) => a + b, 0) / pastActual.length : 0;
                                        const futureAvg = futurePredicted.length ? futurePredicted.reduce((a, b) => a + b, 0) / futurePredicted.length : 0;
                                        const diff = futureAvg - pastAvg;
                                        const pct = pastAvg ? ((diff / pastAvg) * 100).toFixed(1) : '0';
                                        return diff >= 0 ? `+${pct}% ↗` : `${pct}% ↘`;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
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
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5" />
                                            {t('invoicing.issuer')}
                                        </label>
                                        <button
                                            onClick={() => setShowAddCompanyProfile(true)}
                                            className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded transition-colors"
                                        >
                                            + {t('invoicing.new')}
                                        </button>
                                    </div>
                                    <select
                                        value={selectedCompanyId}
                                        onChange={(e) => {
                                            const profile = companyProfiles.find(p => p.id === e.target.value);
                                            if (profile) {
                                                setSelectedCompanyId(profile.id);
                                                setNewInvoice(prev => ({
                                                    ...prev,
                                                    issuerId: profile.id,
                                                    issuer: profile
                                                }));
                                            }
                                        }}
                                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">{t('invoicing.selectPlaceholder')}</option>
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
                                            {t('invoicing.client')}
                                        </h3>
                                        <button onClick={() => setShowAddClient(true)} className="text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 flex items-center gap-1 hover:underline">
                                            <Plus size={14} /> + {t('invoicing.new')}
                                        </button>
                                    </div>
                                    <select className="input-field w-full bg-white dark:bg-gray-800" value={newInvoice.clientId || ''} onChange={(e) => setNewInvoice({ ...newInvoice, clientId: e.target.value })}>
                                        <option value="">{t('invoicing.selectPlaceholder')}</option>
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
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <div>
                                    <label className="label-text">{t('invoicing.invoiceNumber')}</label>
                                    <input
                                        type="text"
                                        className="input-field font-mono"
                                        value={newInvoice.invoiceNumber || ''}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                                        placeholder="INV-2026-XXXX"
                                    />
                                </div>
                                <div>
                                    <label className="label-text">{t('invoicing.currency')}</label>
                                    <select
                                        className="input-field bg-white dark:bg-gray-800"
                                        value={newInvoice.currency}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const updated = recalcInvoice(newInvoice.items || [], newInvoice.taxRate || 0, val);
                                            setNewInvoice({ ...newInvoice, currency: val, subtotal: updated.subtotal, tax: updated.taxAmount, total: updated.total });
                                        }}
                                    >
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

                            {/* Hungarian NAV-compliant fields */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                <div>
                                    <label className="label-text flex items-center gap-1.5">
                                        {t('invoicing.fulfillmentDate')}
                                        <span className="text-xs text-indigo-500">(NAV)</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input-field bg-white dark:bg-gray-800"
                                        value={newInvoice.fulfillmentDate?.toISOString().split('T')[0] || newInvoice.issueDate?.toISOString().split('T')[0] || ''}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, fulfillmentDate: new Date(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="label-text">{t('invoicing.paymentMethod')}</label>
                                    <select
                                        className="input-field bg-white dark:bg-gray-800"
                                        value={newInvoice.paymentMethod || 'transfer'}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, paymentMethod: e.target.value as 'transfer' | 'cash' | 'card' })}
                                    >
                                        <option value="transfer">{t('invoicing.paymentTransfer')}</option>
                                        <option value="cash">{t('invoicing.paymentCash')}</option>
                                        <option value="card">{t('invoicing.paymentCard')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label-text">{t('invoicing.paymentDeadline')}</label>
                                    <div className="input-field bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center">
                                        {newInvoice.dueDate && newInvoice.issueDate ? (
                                            `${Math.ceil((newInvoice.dueDate.getTime() - newInvoice.issueDate.getTime()) / (1000 * 60 * 60 * 24))} ${t('common.days') || 'nap'}`
                                        ) : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Additional Options: Exchange Rate & Signatures */}
                            {/* Options */}
                            <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
                                        {t('invoicing.customExchangeRate')}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder={t('invoicing.exchangeRatePlaceholder')}
                                        value={newInvoice.customExchangeRate || ''}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, customExchangeRate: parseFloat(e.target.value) || undefined })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                    <p className="mt-1 text-[10px] text-gray-400">
                                        {t('invoicing.exchangeRateHint')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        type="checkbox"
                                        id="showSignatures"
                                        checked={newInvoice.showSignatures}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, showSignatures: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="showSignatures" className="text-sm text-gray-600 cursor-pointer">
                                        {t('invoicing.showSignatures')}
                                    </label>
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
                                                    {formatCurrency(item.amount, newInvoice.currency || 'USD')}
                                                </td>
                                                <td className="py-4 text-right">
                                                    <button onClick={() => handleRemoveItem(index)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
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
                                        <span>{formatCurrency(newInvoice.subtotal || 0, newInvoice.currency || 'USD')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <span>{t('invoicing.tax')}</span>
                                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-xs">
                                                <input
                                                    type="number"
                                                    className="w-8 bg-transparent text-right outline-none"
                                                    value={newInvoice.taxRate}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        const updated = recalcInvoice(newInvoice.items || [], val, newInvoice.currency || 'USD');
                                                        setNewInvoice({ ...newInvoice, taxRate: val, subtotal: updated.subtotal, tax: updated.taxAmount, total: updated.total });
                                                    }}
                                                />
                                                %
                                            </div>
                                        </div>
                                        <span>{formatCurrency(newInvoice.tax || 0, newInvoice.currency || 'USD')}</span>
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
                                {t('company.new')}
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
                                    {t('company.uploadLogo')}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleCompanyLogoUpload} />
                                </label>
                            </div>
                            <input type="text" className="input-field" placeholder={`${t('company.name')} *`} value={newCompanyProfile.name || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, name: e.target.value })} />
                            <input type="text" className="input-field" placeholder={t('company.address')} value={newCompanyProfile.address || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, address: e.target.value })} />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="email" className="input-field" placeholder={`${t('company.email')} *`} value={newCompanyProfile.email || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, email: e.target.value })} />
                                <input type="text" className="input-field" placeholder={t('company.phone')} value={newCompanyProfile.phone || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, phone: e.target.value })} />
                            </div>
                            <input type="text" className="input-field" placeholder={t('company.taxNumber')} value={newCompanyProfile.taxNumber || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, taxNumber: e.target.value })} />
                            <input type="text" className="input-field" placeholder={t('company.bankAccount')} value={newCompanyProfile.bankAccount || ''} onChange={(e) => setNewCompanyProfile({ ...newCompanyProfile, bankAccount: e.target.value })} />
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button onClick={() => setShowAddCompanyProfile(false)} className="btn-ghost">{t('common.cancel')}</button>
                                <button onClick={handleAddCompanyProfileSubmit} className="btn-primary">{t('common.save')}</button>
                            </div>
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
                                    <h1 className="text-3xl font-bold text-gray-900">{t('invoicing.invoiceType')}</h1>
                                    <p className="text-gray-500 mt-1">Invoice #{previewInvoice.invoiceNumber}</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-xl font-bold text-primary-600">{companyInfo.name || t('company.name')}</h2>
                                    <p className="text-sm text-gray-500">{companyInfo.address || t('company.address')}</p>
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
                                    {t('invoicing.companyData')}
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

                        {/* Invoice Content - Always White Paper Style */}
                        <div className="p-10 print:p-12 !bg-white dark:!bg-white text-gray-900 dark:text-gray-900 shadow-xl print:shadow-none mx-auto max-w-[210mm] min-h-[297mm]">
                            {/* Invoice Header */}
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    <h3 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">{previewInvoice.invoiceNumber}</h3>
                                    <div className="space-y-1 text-gray-600 text-sm">
                                        <p><span className="font-semibold text-gray-800">{t('invoicing.issueDate')}:</span> {formatDate(previewInvoice.issueDate)}</p>

                                        {/* Fulfillment Date (NAV) */}
                                        <p><span className="font-semibold text-gray-800">{t('invoicing.fulfillmentDate')}:</span> {formatDate(previewInvoice.fulfillmentDate || previewInvoice.issueDate)}</p>

                                        <p><span className="font-semibold text-gray-800">{t('invoicing.dueDate')}:</span> {formatDate(previewInvoice.dueDate)}</p>

                                        {/* Payment Method */}
                                        <p><span className="font-semibold text-gray-800">{t('invoicing.paymentMethod')}:</span> {
                                            previewInvoice.paymentMethod === 'cash' ? t('invoicing.paymentCash') :
                                                previewInvoice.paymentMethod === 'card' ? t('invoicing.paymentCard') :
                                                    t('invoicing.paymentTransfer')
                                        }</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {previewCompany.logo ? (
                                        <img src={previewCompany.logo} alt="Logo" className="w-24 h-24 object-contain mb-4 ml-auto" />
                                    ) : (
                                        <div className="h-24"></div>
                                    )}
                                    <h2 className="text-xl font-bold text-gray-900">{previewCompany.name || ''}</h2>
                                    <div className="text-sm text-gray-600 space-y-1 mt-2">
                                        <p>{previewCompany.address}</p>
                                        <p>{previewCompany.email}</p>
                                        <p>{previewCompany.phone}</p>
                                        {previewCompany.taxNumber && <p className="font-medium text-gray-800">{t('company.taxNumber')}: {previewCompany.taxNumber}</p>}
                                        {previewCompany.bankAccount && <p className="font-mono text-xs mt-2">{t('company.bankAccount')}: {previewCompany.bankAccount}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Client Info */}
                            <div className="flex mb-16">
                                <div className="w-1/2">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-200 pb-2 w-2/3">{t('invoicing.billTo')}</h4>
                                    {(() => {
                                        const client = clients.find(c => c.id === previewInvoice.clientId);
                                        return client ? (
                                            <div className="text-gray-900 space-y-1">
                                                <p className="text-xl font-bold mb-2">{client.company || client.name}</p>
                                                {client.company && <p className="text-gray-700">{client.name}</p>}
                                                <p className="text-gray-600">{client.address}</p>
                                                <p className="text-gray-600">{client.email}</p>
                                                {client.taxId && <p className="text-sm mt-2"><span className="font-medium">{t('company.taxNumber')}:</span> {client.taxId}</p>}
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </div>

                            {/* Invoice Items */}
                            <table className="w-full mb-12">
                                <thead>
                                    <tr className="border-b-2 border-gray-900">
                                        <th className="py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">{t('invoicing.item')}</th>
                                        <th className="py-4 text-center text-xs font-bold text-gray-900 uppercase tracking-wider w-24">{t('invoicing.quantity')}</th>
                                        <th className="py-4 text-right text-xs font-bold text-gray-900 uppercase tracking-wider w-32">{t('invoicing.rate')}</th>
                                        <th className="py-4 text-right text-xs font-bold text-gray-900 uppercase tracking-wider w-32">{t('invoicing.amount')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {previewInvoice.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="py-4 text-gray-900 font-medium">{item.description}</td>
                                            <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                                            <td className="py-4 text-right text-gray-600">{formatCurrency(item.rate, previewInvoice.currency)}</td>
                                            <td className="py-4 text-right font-bold text-gray-900">{formatCurrency(item.amount, previewInvoice.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Totals */}
                            <div className="flex justify-end mb-20">
                                <div className="w-80 space-y-3">
                                    <div className="flex justify-between text-gray-600 text-sm">
                                        <span>{t('invoicing.subtotal')}</span>
                                        <span>{formatCurrency(previewInvoice.subtotal, previewInvoice.currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 text-sm">
                                        <span>{t('invoicing.tax')} ({previewInvoice.taxRate}%)</span>
                                        <span>{formatCurrency(previewInvoice.tax, previewInvoice.currency)}</span>
                                    </div>
                                    <div className="border-t-2 border-gray-900 pt-4 mt-4">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-xl font-bold text-gray-900">{t('invoicing.total')}</span>
                                            <span className="text-2xl font-bold text-gray-900">{formatCurrency(previewInvoice.total, previewInvoice.currency)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Exchange Rate Display */}
                            {previewInvoice.customExchangeRate && (
                                <div className="flex justify-end mb-8 text-sm text-gray-500 italic">
                                    * {t('invoicing.appliedExchangeRate')}: 1 {previewInvoice.currency} = {previewInvoice.customExchangeRate} HUF
                                </div>
                            )}

                            {/* Signatures */}
                            {previewInvoice.showSignatures && (
                                <div className="flex justify-between items-end mt-20 mb-10 px-10">
                                    <div className="text-center w-1/3">
                                        <div className="border-b border-gray-400 mb-2"></div>
                                        <p className="font-bold text-gray-900">{previewCompany.name}</p>
                                        <p className="text-sm text-gray-500">{t('invoicing.issuerSeller')}</p>
                                    </div>
                                    <div className="text-center w-1/3">
                                        <div className="border-b border-gray-400 mb-2"></div>
                                        <p className="font-bold text-gray-900">
                                            {(() => {
                                                const client = clients.find(c => c.id === previewInvoice.clientId);
                                                return client ? (client.company || client.name) : t('invoicing.clientBuyer');
                                            })()}
                                        </p>
                                        <p className="text-sm text-gray-500">{t('invoicing.clientBuyer')}</p>
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="mt-auto border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
                                <p className="font-medium text-gray-900 mb-1">{previewCompany.name || ''}</p>
                                <p>{previewCompany.email} {previewCompany.phone && `• ${previewCompany.phone}`}</p>
                                <p className="mt-4 text-xs text-gray-400">
                                    {language === 'hu' ? 'A számla elektronikus úton került kiállításra.' : 'This invoice was generated electronically.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Company Settings Modal - Rendered last for z-index */}
            {showCompanySettings && (
                <div className="modal-backdrop z-[60]">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('invoicing.companySettingsTitle')}</h2>
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('company.logo')}</label>
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
                                            {t('company.uploadLogo')}
                                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                        </label>
                                        {companyInfo.logo && (
                                            <button
                                                onClick={() => saveCompanyInfo({ ...companyInfo, logo: null })}
                                                className="ml-2 text-red-500 text-sm hover:underline"
                                            >
                                                {t('common.delete')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Company Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('company.name')} *</label>
                                <input
                                    type="text"
                                    value={companyInfo.name}
                                    onChange={(e) => saveCompanyInfo({ ...companyInfo, name: e.target.value })}
                                    className="input-field w-full"
                                    placeholder={t('company.namePlaceholder')}
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('company.address')}</label>
                                <input
                                    type="text"
                                    value={companyInfo.address}
                                    onChange={(e) => saveCompanyInfo({ ...companyInfo, address: e.target.value })}
                                    className="input-field w-full"
                                    placeholder={t('company.addressPlaceholder')}
                                />
                            </div>

                            {/* Email & Phone */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('company.email')}</label>
                                    <input
                                        type="email"
                                        value={companyInfo.email}
                                        onChange={(e) => saveCompanyInfo({ ...companyInfo, email: e.target.value })}
                                        className="input-field w-full"
                                        placeholder="info@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('company.phone')}</label>
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('company.taxNumber')}</label>
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
                                {t('common.saveAndClose')}
                            </button>
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
            {/* Currency Converter Modal */}
            {showConverter && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <RefreshCcw size={20} className="text-blue-500" />
                                    {t('currency.converter')}
                                </h3>
                                <button
                                    onClick={() => setShowConverter(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('currency.amount')}</label>
                                <input
                                    type="number"
                                    value={convAmount}
                                    onChange={(e) => setConvAmount(e.target.value)}
                                    className="input-field w-full text-lg font-bold"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 items-center">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('currency.from')}</label>
                                    <select
                                        value={convFrom}
                                        onChange={(e) => setConvFrom(e.target.value)}
                                        className="input-field w-full py-3"
                                    >
                                        {AVAILABLE_CURRENCIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-center pt-6">
                                    <button
                                        onClick={() => {
                                            const temp = convFrom;
                                            setConvFrom(convTo);
                                            setConvTo(temp);
                                        }}
                                        className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 text-gray-600 dark:text-gray-400"
                                    >
                                        <Repeat size={20} />
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('currency.to')}</label>
                                    <select
                                        value={convTo}
                                        onChange={(e) => setConvTo(e.target.value)}
                                        className="input-field w-full py-3"
                                    >
                                        {AVAILABLE_CURRENCIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-500/20">
                                <div className="text-sm opacity-80 mb-1">{t('currency.result')} ({convTo}):</div>
                                <div className="text-3xl font-black">
                                    {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: convTo,
                                        maximumFractionDigits: 2
                                    }).format(CurrencyService.convert(parseFloat(convAmount) || 0, convFrom, convTo))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoicingView;
