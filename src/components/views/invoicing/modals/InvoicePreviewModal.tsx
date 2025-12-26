import React from 'react';
import { X, Printer, Download, Share2 } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Invoice, Client, CompanyProfile } from '../../../../types/planner';
import { formatCurrency, formatDate } from '../../../../utils/formatters';

interface InvoicePreviewModalProps {
    invoice: Invoice | null;
    companyProfile: CompanyProfile | undefined;
    client: Client | undefined;
    onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
    invoice,
    companyProfile,
    client,
    onClose
}) => {
    const { t, language } = useLanguage();

    if (!invoice) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] overflow-y-auto print:bg-white print:backdrop-blur-none">
            {/* Floating Toolbar - Premium Design */}
            <div className="fixed top-6 right-6 flex gap-2 z-[80] print:hidden">
                <button
                    onClick={handlePrint}
                    className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
                    title="Print / Save PDF"
                >
                    <Printer size={20} />
                </button>
                <button
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-105"
                    title="Download"
                >
                    <Download size={20} />
                </button>
                <button
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-105"
                    title="Share"
                >
                    <Share2 size={20} />
                </button>
                <button
                    onClick={onClose}
                    className="p-3 bg-red-500/80 hover:bg-red-600 text-white rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-105"
                    title="Close"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Invoice Document - A4 Style */}
            <div className="min-h-screen flex items-center justify-center p-8 print:p-0">
                <div className="bg-white text-gray-900 w-full max-w-[210mm] shadow-2xl rounded-lg overflow-hidden print:shadow-none print:rounded-none print:w-full print:max-w-none">

                    {/* Gradient Header Bar */}
                    <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 print:hidden" />

                    {/* Invoice Content */}
                    <div className="p-12 md:p-16" id="invoice-print-area">

                        {/* Header Section */}
                        <div className="flex justify-between items-start mb-12">
                            {/* Left: Invoice Title & Meta */}
                            <div>
                                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight mb-1 print:text-gray-900">
                                    {t('invoicing.invoice').toUpperCase()}
                                </h1>
                                <p className="text-lg text-gray-500 font-mono">#{invoice.invoiceNumber}</p>

                                <div className="mt-6 space-y-1.5 text-sm">
                                    <p className="flex gap-2">
                                        <span className="font-semibold text-gray-700 w-32">{t('invoicing.issueDate')}:</span>
                                        <span className="text-gray-600">{formatDate(invoice.issueDate)}</span>
                                    </p>
                                    <p className="flex gap-2">
                                        <span className="font-semibold text-gray-700 w-32">{t('invoicing.dueDate')}:</span>
                                        <span className="text-gray-600">{formatDate(invoice.dueDate)}</span>
                                    </p>
                                    <p className="flex gap-2">
                                        <span className="font-semibold text-gray-700 w-32">{t('invoicing.paymentMethod')}:</span>
                                        <span className="text-gray-600">
                                            {invoice.paymentMethod === 'cash' ? t('invoicing.paymentCash') :
                                                invoice.paymentMethod === 'card' ? t('invoicing.paymentCard') :
                                                    t('invoicing.paymentTransfer')}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Right: Company Info */}
                            <div className="text-right max-w-xs">
                                {companyProfile?.logo ? (
                                    <img src={companyProfile.logo} alt="Logo" className="w-20 h-20 object-contain mb-3 ml-auto rounded-lg" />
                                ) : (
                                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg mb-3 ml-auto flex items-center justify-center">
                                        <span className="text-2xl font-bold text-indigo-600">{companyProfile?.name?.charAt(0) || 'C'}</span>
                                    </div>
                                )}
                                <h2 className="text-xl font-bold text-gray-900">{companyProfile?.name || ''}</h2>
                                <div className="text-sm text-gray-600 space-y-0.5 mt-2">
                                    {companyProfile?.address && <p>{companyProfile.address}</p>}
                                    {companyProfile?.email && <p>{companyProfile.email}</p>}
                                    {companyProfile?.phone && <p>{companyProfile.phone}</p>}
                                    {companyProfile?.taxNumber && (
                                        <p className="font-medium text-gray-800 mt-1">{t('company.taxNumber')}: {companyProfile.taxNumber}</p>
                                    )}
                                    {companyProfile?.bankAccount && (
                                        <p className="font-mono text-xs mt-1 text-gray-500">{t('company.bankAccount')}: {companyProfile.bankAccount}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Client Info */}
                        <div className="mb-12 p-6 bg-gray-50 rounded-xl border border-gray-100 print:bg-transparent print:border-gray-200">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t('invoicing.billTo')}</h4>
                            {client ? (
                                <div className="text-gray-900">
                                    <p className="text-xl font-bold mb-1">{client.company || client.name}</p>
                                    {client.company && <p className="text-gray-700">{client.name}</p>}
                                    {client.address && <p className="text-gray-600">{client.address}</p>}
                                    {client.email && <p className="text-gray-600">{client.email}</p>}
                                    {client.taxId && (
                                        <p className="text-sm mt-2">
                                            <span className="font-medium">{t('company.taxNumber')}:</span> {client.taxId}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">{t('invoicing.noClientSelected') || 'No client selected'}</p>
                            )}
                        </div>

                        {/* Items Table */}
                        <div className="mb-12 overflow-hidden rounded-xl border border-gray-200">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-900 text-white">
                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider">{t('invoicing.item')}</th>
                                        <th className="py-4 px-4 text-center text-xs font-bold uppercase tracking-wider w-24">{t('invoicing.quantity')}</th>
                                        <th className="py-4 px-4 text-right text-xs font-bold uppercase tracking-wider w-32">{t('invoicing.rate')}</th>
                                        <th className="py-4 px-6 text-right text-xs font-bold uppercase tracking-wider w-32">{t('invoicing.amount')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {invoice.items.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6 text-gray-900 font-medium">{item.description || '-'}</td>
                                            <td className="py-4 px-4 text-center text-gray-600">{item.quantity}</td>
                                            <td className="py-4 px-4 text-right text-gray-600">{formatCurrency(item.rate, invoice.currency)}</td>
                                            <td className="py-4 px-6 text-right font-bold text-gray-900">{formatCurrency(item.amount, invoice.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mb-12">
                            <div className="w-80 space-y-3">
                                <div className="flex justify-between text-gray-600 text-sm py-2">
                                    <span>{t('invoicing.subtotal')}</span>
                                    <span className="font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 text-sm py-2">
                                    <span>{t('invoicing.tax')} ({invoice.taxRate}%)</span>
                                    <span className="font-medium">{formatCurrency(invoice.tax, invoice.currency)}</span>
                                </div>
                                <div className="border-t-2 border-gray-900 pt-4 mt-2">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-xl font-bold text-gray-900">{t('invoicing.total')}</span>
                                        <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 print:text-gray-900">
                                            {formatCurrency(invoice.total, invoice.currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Exchange Rate */}
                        {invoice.customExchangeRate && (
                            <div className="flex justify-end mb-8 text-sm text-gray-500 italic">
                                * {t('invoicing.appliedExchangeRate')}: 1 {invoice.currency} = {invoice.customExchangeRate} HUF
                            </div>
                        )}

                        {/* Signatures */}
                        {invoice.showSignatures && (
                            <div className="flex justify-between items-end mt-16 mb-8 px-8">
                                <div className="text-center w-1/3">
                                    <div className="border-b-2 border-gray-300 mb-2 h-16" />
                                    <p className="font-bold text-gray-900">{companyProfile?.name}</p>
                                    <p className="text-sm text-gray-500">{t('invoicing.issuerSeller')}</p>
                                </div>
                                <div className="text-center w-1/3">
                                    <div className="border-b-2 border-gray-300 mb-2 h-16" />
                                    <p className="font-bold text-gray-900">
                                        {client ? (client.company || client.name) : t('invoicing.clientBuyer')}
                                    </p>
                                    <p className="text-sm text-gray-500">{t('invoicing.clientBuyer')}</p>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
                            <p className="font-medium text-gray-900 mb-1">{companyProfile?.name || ''}</p>
                            <p className="text-sm text-gray-500">
                                {companyProfile?.email} {companyProfile?.phone && `• ${companyProfile.phone}`}
                            </p>
                            <p className="mt-4 text-xs text-gray-400">
                                {language === 'hu' ? 'A számla elektronikus úton került kiállításra.' : 'This invoice was generated electronically.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
