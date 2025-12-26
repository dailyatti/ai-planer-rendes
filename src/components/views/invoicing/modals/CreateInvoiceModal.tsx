import React, { useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Plus, Trash2, Calendar, Download, Send, Save } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Client, CompanyProfile, Invoice } from '../../../types/planner';
import { invoiceSchema, InvoiceFormData } from '../schemas';
import { InvoiceCalculator } from '../../../utils/InvoiceCalculator';
import { SequenceService } from '../../../services/SequenceService';

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: InvoiceFormData) => void;
    clients: Client[];
    companyProfiles: CompanyProfile[];
    onAddClient: () => void;
    onAddCompany: () => void;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
    isOpen,
    onClose,
    onCreate,
    clients,
    companyProfiles,
    onAddClient,
    onAddCompany
}) => {
    const { t } = useLanguage();

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormData>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            items: [{ id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }],
            taxRate: 27, // Default Hungarian VAT
            currency: 'USD',
            status: 'draft',
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 days
            fulfillmentDate: new Date(),
            paymentMethod: 'transfer',
            subtotal: 0,
            tax: 0,
            total: 0
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    // Watch values for real-time calculation
    const items = useWatch({ control, name: 'items' });
    const taxRate = useWatch({ control, name: 'taxRate' });
    const currency = useWatch({ control, name: 'currency' });

    // Recalculate totals whenever dependencies change
    useEffect(() => {
        if (!items) return;

        // Map form items to calculation items (ensuring types)
        const calcItems = items.map(i => ({
            ...i,
            id: i.id || crypto.randomUUID(),
            amount: (i.quantity || 0) * (i.rate || 0),
            description: i.description || ''
        }));

        const totals = InvoiceCalculator.calculateTotals(calcItems, taxRate || 0, currency || 'USD');

        setValue('subtotal', totals.subtotal);
        setValue('tax', totals.taxAmount);
        setValue('total', totals.total);
    }, [items, taxRate, currency, setValue]);

    if (!isOpen) return null;

    const toDateInput = (d: any) => {
        if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        if (typeof d === 'string') return d.slice(0, 10);
        return '';
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <form onSubmit={handleSubmit(onCreate)} className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                                <Plus className="text-primary-600 dark:text-primary-400" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('invoicing.createInvoice')}</h2>
                                <p className="text-sm text-gray-500">{t('common.details')}</p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Top Section: Issuer & Client */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Issuer */}
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    {t('invoicing.company')}
                                </label>
                                <select
                                    {...register('companyProfileId')}
                                    className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">{t('invoicing.selectPlaceholder')}</option>
                                    {companyProfiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <button type="button" onClick={onAddCompany} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                                    <Plus size={14} /> {t('invoicing.new')}
                                </button>
                            </div>

                            {/* Client */}
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    {t('invoicing.client')}
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        {...register('clientId')}
                                        className="flex-1 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">{t('invoicing.selectPlaceholder')}</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <button type="button" onClick={onAddClient} className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                        <Plus size={20} />
                                    </button>
                                </div>
                                {errors.clientId && <span className="text-red-500 text-sm">{errors.clientId.message}</span>}
                            </div>
                        </div>

                        {/* Invoice Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div>
                                <label className="text-xs text-gray-500 uppercase mb-1 block">{t('invoicing.invoiceNumber')}</label>
                                <input {...register('invoiceNumber')} placeholder="Auto-generated" className="w-full bg-transparent font-mono text-sm border-none focus:ring-0 p-0" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase mb-1 block">{t('invoicing.invoiceDate')}</label>
                                <input type="date" {...register('issueDate', { valueAsDate: true })}
                                    className="w-full bg-transparent text-sm border-none focus:ring-0 p-0"
                                    onInput={(e: any) => setValue('issueDate', new Date(e.target.valueAsDate))}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase mb-1 block">{t('invoicing.dueDate')}</label>
                                <input type="date" {...register('dueDate', { valueAsDate: true })}
                                    className="w-full bg-transparent text-sm border-none focus:ring-0 p-0"
                                    onInput={(e: any) => setValue('dueDate', new Date(e.target.valueAsDate))}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs text-gray-500 uppercase mb-1 block">{t('invoicing.currency')}</label>
                                <select {...register('currency')} className="w-full bg-transparent text-sm border-none focus:ring-0 p-0 font-bold text-primary-600">
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="HUF">HUF (Ft)</option>
                                </select>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div>
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                        <th className="pb-3 pl-2 w-1/2">{t('invoicing.item')}</th>
                                        <th className="pb-3 text-right w-20">{t('invoicing.quantity')}</th>
                                        <th className="pb-3 text-right w-32">{t('invoicing.rate')}</th>
                                        <th className="pb-3 text-right w-32">{t('invoicing.amount')}</th>
                                        <th className="pb-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {fields.map((field, index) => (
                                        <tr key={field.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="py-2 pl-2">
                                                <input
                                                    {...register(`items.${index}.description`)}
                                                    placeholder="Item description"
                                                    className="w-full bg-transparent border-none focus:ring-0 text-sm"
                                                />
                                            </td>
                                            <td className="py-2">
                                                <input
                                                    type="number"
                                                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-right"
                                                    min="0" step="any"
                                                />
                                            </td>
                                            <td className="py-2">
                                                <input
                                                    type="number"
                                                    {...register(`items.${index}.rate`, { valueAsNumber: true })}
                                                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-right"
                                                    min="0" step="any"
                                                />
                                            </td>
                                            <td className="py-2 text-right text-xs pr-4">
                                                {/* Calculated amount display handled by watch/recalc logic would be complex here, relying on base useWatch is better */}
                                                {(watch(`items.${index}.quantity`) * watch(`items.${index}.rate`)).toFixed(2)}
                                            </td>
                                            <td className="py-2 text-center">
                                                <button type="button" onClick={() => remove(index)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button
                                type="button"
                                onClick={() => append({ id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 })}
                                className="mt-4 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                            >
                                <Plus size={16} /> {t('invoicing.addItem')}
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-6">
                            <div className="w-64 space-y-3">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>{t('invoicing.subtotal')}:</span>
                                    <span>{watch('subtotal').toFixed(2)} {watch('currency')}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500 items-center">
                                    <span>{t('invoicing.tax')}:</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            {...register('taxRate', { valueAsNumber: true })}
                                            className="w-12 text-right border-b border-gray-300 dark:border-gray-600 bg-transparent text-xs p-0 focus:ring-0 focus:border-primary-500"
                                        />
                                        <span>%</span>
                                    </div>
                                    <span>{watch('tax').toFixed(2)} {watch('currency')}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <span>{t('invoicing.total')}:</span>
                                    <span className="text-primary-600">{watch('total').toFixed(2)} {watch('currency')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between bg-gray-50 dark:bg-gray-800/50">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn-primary flex items-center gap-2 px-6">
                            <Save size={18} />
                            {t('invoicing.saveInvoice')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
