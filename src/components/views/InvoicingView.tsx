import React, { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { LayoutDashboard, FileText, Users, TrendingUp } from 'lucide-react';

// Components
import { InvoicingDashboard } from './invoicing/tabs/InvoicingDashboard';
import { InvoiceList } from './invoicing/tabs/InvoiceList';
import { ClientList } from './invoicing/tabs/ClientList';
import { AnalyticsView } from './invoicing/tabs/AnalyticsView';

// Modals
import { CreateInvoiceModal } from './invoicing/modals/CreateInvoiceModal';
import { AddClientModal } from './invoicing/modals/AddClientModal';
import { AddCompanyModal } from './invoicing/modals/AddCompanyModal';
import { InvoicePreviewModal } from './invoicing/modals/InvoicePreviewModal';

// Hooks & Types
import { useInvoicingState } from './invoicing/hooks/useInvoicingState';
import { ClientFormData, InvoiceFormData } from './invoicing/schemas';
import { Client, Invoice } from '../../types/planner';

// Main Component
const InvoicingView: React.FC = () => {
    const { t } = useLanguage();
    const {
        invoices,
        clients,
        companyProfiles,
        updateInvoice,
        addInvoice,
        deleteInvoice,
        addClient,
        addCompanyProfile,
        updateCompanyProfile
    } = useData();

    const {
        state,
        setActiveTab,
        openModal,
        closeModals,
        setSearchQuery,
        toggleSelection,
        selectAll,
        clearSelection,
        setPreviewInvoice
    } = useInvoicingState();

    // Derived State
    const filteredInvoices = useMemo(() => {
        if (!state.filters.searchQuery) return invoices;
        const lowerQuery = state.filters.searchQuery.toLowerCase();
        return invoices.filter(inv =>
            inv.invoiceNumber.toLowerCase().includes(lowerQuery) ||
            clients.find(c => c.id === inv.clientId)?.name.toLowerCase().includes(lowerQuery)
        );
    }, [invoices, clients, state.filters.searchQuery]);

    // Handlers
    const handleCreateInvoice = (data: InvoiceFormData) => {
        // Look up issuer (optional validation)
        // const issuer = companyProfiles.find(p => p.id === data.companyProfileId);

        const newInvoice: Invoice = {
            id: crypto.randomUUID(),
            ...data,
            // companyProfileId is mapped directly from data
            // Items are mapped
            items: data.items.map(i => ({
                ...i,
                id: i.id || crypto.randomUUID(),
                description: i.description || '',
                quantity: i.quantity || 0,
                rate: i.rate || 0,
                amount: (i.quantity || 0) * (i.rate || 0)
            })),
            status: 'draft',
            createdAt: new Date(),
            notes: ''
        };
        addInvoice(newInvoice);
        closeModals();
    };

    // Navigation Tabs
    const tabs = [
        { id: 'dashboard', label: t('invoicing.dashboard'), icon: LayoutDashboard },
        { id: 'invoices', label: t('invoicing.invoices'), icon: FileText },
        { id: 'clients', label: t('invoicing.clients'), icon: Users },
        { id: 'analytics', label: t('invoicing.analytics'), icon: TrendingUp },
    ] as const;

    return (
        <div className="p-4 sm:p-6 pb-20 sm:pb-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        {t('invoicing.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('invoicing.subtitle')}</p>
                </div>

                <div className="flex gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto max-w-full">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)} // Cast as any because state type might be strict literal union
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${state.activeTab === tab.id
                                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                    <button
                        onClick={() => openModal('createInvoice')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-lg shadow-gray-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all ml-2"
                    >
                        <FileText size={18} />
                        <span className="hidden sm:inline">{t('invoicing.newInvoice')}</span>
                    </button>
                </div>
            </div>

            {/* Content Routes */}
            {state.activeTab === 'dashboard' && (
                <InvoicingDashboard
                    invoices={invoices}
                    clients={clients}
                    onNavigateToTab={setActiveTab}
                    onDownloadPdf={setPreviewInvoice}
                    onDeleteInvoice={(id) => deleteInvoice(id)}
                />
            )}

            {state.activeTab === 'invoices' && (
                <InvoiceList
                    invoices={filteredInvoices}
                    clients={clients}
                    selectedIds={state.selection.selectedIds}
                    searchQuery={state.filters.searchQuery}
                    onSearchChange={setSearchQuery}
                    onSelectAll={() => {
                        if (state.selection.selectedIds.size === filteredInvoices.length) {
                            clearSelection();
                        } else {
                            selectAll(filteredInvoices.map(i => i.id));
                        }
                    }}
                    onToggleSelect={(id, e) => {
                        e.stopPropagation();
                        toggleSelection(id);
                    }}
                    onStatusChange={(id, status) => updateInvoice(id, { status })}
                    onDelete={(id) => {
                        if (window.confirm(t('invoicing.confirmDelete'))) {
                            deleteInvoice(id);
                        }
                    }}
                    onBulkDelete={() => {
                        if (window.confirm(t('invoicing.confirmBulkDelete'))) {
                            state.selection.selectedIds.forEach(id => deleteInvoice(id));
                            clearSelection();
                        }
                    }}
                    onDeleteAll={() => {
                        if (window.confirm(t('invoicing.confirmDeleteAll'))) {
                            invoices.forEach(i => deleteInvoice(i.id));
                        }
                    }}
                    onDownload={setPreviewInvoice}
                    onShare={(inv) => {
                        const url = window.location.href;
                        navigator.clipboard.writeText(`${url}?invoice=${inv.id}`)
                            .then(() => alert(t('invoicing.linkCopied')))
                            .catch(() => alert('Failed to copy'));
                    }}
                />
            )}

            {state.activeTab === 'clients' && (
                <ClientList
                    clients={clients}
                    onAddClient={() => openModal('addClient')}
                />
            )}

            {state.activeTab === 'analytics' && (
                <AnalyticsView invoices={invoices} currency="USD" />
            )}

            {/* Modals */}
            <CreateInvoiceModal
                isOpen={state.modals.createInvoice}
                onClose={closeModals}
                onCreate={handleCreateInvoice}
                clients={clients}
                companyProfiles={companyProfiles}
                onAddClient={() => openModal('addClient')}
                onAddCompany={() => openModal('addCompany')}
            />

            <AddClientModal
                isOpen={state.modals.addClient}
                onClose={closeModals}
                onSave={(data: ClientFormData) => {
                    const newClient: Client = {
                        id: crypto.randomUUID(),
                        ...data,
                        company: data.company || '',
                        createdAt: new Date()
                    };
                    addClient(newClient);
                    closeModals();
                }}
            />

            <AddCompanyModal
                isOpen={state.modals.addCompany}
                onClose={closeModals}
                onSave={(data) => {
                    const newProfile = {
                        id: crypto.randomUUID(),
                        ...data,
                        createdAt: new Date(),
                        logo: data.logo || null
                    };
                    addCompanyProfile(newProfile);
                    closeModals();
                }}
            />

            <InvoicePreviewModal
                invoice={state.previewInvoice}
                companyProfile={companyProfiles.find(c => c.id === state.previewInvoice?.companyProfileId) || companyProfiles[0]}
                client={clients.find(c => c.id === state.previewInvoice?.clientId)}
                onClose={() => setPreviewInvoice(null)}
            />
        </div>
    );
};

export default InvoicingView;
