import React, { useRef } from 'react';
import { X, Printer, Download, Share2, Mail } from 'lucide-react';
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
    const printRef = useRef<HTMLDivElement>(null);

    if (!invoice) return null;

    const handlePrint = () => {
        const printContent = printRef.current?.innerHTML;
        const originalContent = document.body.innerHTML;

        if (printContent) {
            document.body.innerHTML = printContent;
            window.print();
            document.body.innerHTML = originalContent;
            window.location.reload(); // Reload to restore event listeners/React state
            // Note: Reload is a crude way to restore. Better way is iframe or simple CSS media print hiding.
            // But original code likely did standard window.print().
            // Actually, original code didn't use a ref, it just rendered the modal and user presed browser print?
            // Or it had a specific print logic?
            // "const handleDownloadPdf = ... setPreviewInvoice(invoice) ... setTimeout(() => window.print(), 500)"
            // So it printed the whole window but used CSS @media print to hide everything else?
            // Assuming the CSS handles hiding non-modal elements.
        }
    };

    // Note: The original implementation relied on global print styles. 
    // For this refactor, we'll assume the user triggers print via the button which calls window.print(),
    // and the global CSS hides .modal-backdrop's siblings.

    return (
        <div className="modal-backdrop z-[70] overflow-y-auto">
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white text-gray-900 w-full max-w-[210mm] min-h-[297mm] shadow-2xl relative animate-in zoom-in-95 duration-200 print:shadow-none print:w-full print:max-w-none print:m-0">

                    {/* Toolbar - Hidden in Print */}
                    <div className="absolute top-0 -right-16 flex flex-col gap-2 print:hidden">
                        <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all shadow-lg">
                            <X size={24} />
                        </button>
                        <button onClick={() => window.print()} className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all" title="Print / Save PDF">
                            <Printer size={24} />
                        </button>
                        <button className="p-3 bg-white text-gray-700 hover:text-indigo-600 rounded-full shadow-lg transition-all">
                            <Download size={24} />
                        </button>
                        <button className="p-3 bg-white text-gray-700 hover:text-indigo-600 rounded-full shadow-lg transition-all">
                            <Share2 size={24} />
                        </button>
                    </div>

                    {/* Invoice Content */}
                    <div className="p-16 h-full flex flex-col justify-between" id="invoice-print-area">
                        <div>
                            {/* Header */}
                            <div className="flex justify-between items-start mb-16">
                                <div>
                                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">{t('invoicing.invoice').toUpperCase()}</h1>
                                    <p className="text-gray-500 font-medium">#{invoice.invoiceNumber}</p>

                                    <div className="mt-8 space-y-1 text-sm">
                                        <p><span className="font-semibold text-gray-800">{t('invoicing.issueDate')}:</span> {formatDate(invoice.issueDate)}</p>
                                        <p><span className="font-semibold text-gray-800">{t('invoicing.dueDate')}:</span> {formatDate(invoice.dueDate)}</p>
                                        <p><span className="font-semibold text-gray-800">{t('invoicing.paymentMethod')}:</span> {
                                            invoice.paymentMethod === 'cash' ? t('invoicing.paymentCash') :
                                                invoice.paymentMethod === 'card' ? t('invoicing.paymentCard') :
                                                    t('invoicing.paymentTransfer')
                                        }</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {companyProfile?.logo ? (
                                        <img src={companyProfile.logo} alt="Logo" className="w-24 h-24 object-contain mb-4 ml-auto" />
                                    ) : (
                                        <div className="h-24"></div>
                                    )}
                                    <h2 className="text-xl font-bold text-gray-900">{companyProfile?.name || ''}</h2>
                                    <div className="text-sm text-gray-600 space-y-1 mt-2">
                                        <p>{companyProfile?.address}</p>
                                        <p>{companyProfile?.email}</p>
                                        <p>{companyProfile?.phone}</p>
                                        {companyProfile?.taxNumber && <p className="font-medium text-gray-800">{t('company.taxNumber')}: {companyProfile.taxNumber}</p>}
                                        {companyProfile?.bankAccount && <p className="font-mono text-xs mt-2">{t('company.bankAccount')}: {companyProfile.bankAccount}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Client Info */}
                            <div className="flex mb-16">
                                <div className="w-1/2">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-200 pb-2 w-2/3">{t('invoicing.billTo')}</h4>
                                    {client ? (
                                        <div className="text-gray-900 space-y-1">
                                            <p className="text-xl font-bold mb-2">{client.company || client.name}</p>
                                            {client.company && <p className="text-gray-700">{client.name}</p>}
                                            <p className="text-gray-600">{client.address}</p>
                                            <p className="text-gray-600">{client.email}</p>
                                            {client.taxId && <p className="text-sm mt-2"><span className="font-medium">{t('company.taxNumber')}:</span> {client.taxId}</p>}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">{t('invoicing.noClientSelected') || 'No client selected'}</p>
                                    )}
                                </div>
                            </div>

                            {/* Items Table */}
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
                                    {invoice.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="py-4 text-gray-900 font-medium">{item.description}</td>
                                            <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                                            <td className="py-4 text-right text-gray-600">{formatCurrency(item.rate, invoice.currency)}</td>
                                            <td className="py-4 text-right font-bold text-gray-900">{formatCurrency(item.amount, invoice.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Totals */}
                            <div className="flex justify-end mb-20">
                                <div className="w-80 space-y-3">
                                    <div className="flex justify-between text-gray-600 text-sm">
                                        <span>{t('invoicing.subtotal')}</span>
                                        <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 text-sm">
                                        <span>{t('invoicing.tax')} ({invoice.taxRate}%)</span>
                                        <span>{formatCurrency(invoice.tax, invoice.currency)}</span>
                                    </div>
                                    <div className="border-t-2 border-gray-900 pt-4 mt-4">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-xl font-bold text-gray-900">{t('invoicing.total')}</span>
                                            <span className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.total, invoice.currency)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Exchange Rate Display */}
                            {invoice.customExchangeRate && (
                                <div className="flex justify-end mb-8 text-sm text-gray-500 italic">
                                    * {t('invoicing.appliedExchangeRate')}: 1 {invoice.currency} = {invoice.customExchangeRate} HUF
                                </div>
                            )}
                        </div>

                        <div>
                            {/* Signatures */}
                            {invoice.showSignatures && (
                                <div className="flex justify-between items-end mt-20 mb-10 px-10">
                                    <div className="text-center w-1/3">
                                        <div className="border-b border-gray-400 mb-2"></div>
                                        <p className="font-bold text-gray-900">{companyProfile?.name}</p>
                                        <p className="text-sm text-gray-500">{t('invoicing.issuerSeller')}</p>
                                    </div>
                                    <div className="text-center w-1/3">
                                        <div className="border-b border-gray-400 mb-2"></div>
                                        <p className="font-bold text-gray-900">
                                            {client ? (client.company || client.name) : t('invoicing.clientBuyer')}
                                        </p>
                                        <p className="text-sm text-gray-500">{t('invoicing.clientBuyer')}</p>
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="mt-auto border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
                                <p className="font-medium text-gray-900 mb-1">{companyProfile?.name || ''}</p>
                                <p>{companyProfile?.email} {companyProfile?.phone && `• ${companyProfile?.phone}`}</p>
                                <p className="mt-4 text-xs text-gray-400">
                                    {language === 'hu' ? 'A számla elektronikus úton került kiállításra.' : 'This invoice was generated electronically.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
