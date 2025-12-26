import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Building2, Upload, Trash2, Mail, Phone, FileText, CreditCard } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { companyProfileSchema, CompanyProfileFormData } from '../schemas';

interface AddCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CompanyProfileFormData) => void;
    initialData?: Partial<CompanyProfileFormData>;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const { t } = useLanguage();
    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CompanyProfileFormData>({
        resolver: zodResolver(companyProfileSchema),
        defaultValues: initialData || {}
    });

    useEffect(() => {
        if (isOpen && initialData) {
            reset(initialData);
        } else if (isOpen) {
            reset({});
        }
    }, [isOpen, initialData, reset]);

    const logo = watch('logo');

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setValue('logo', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('invoicing.companySettingsTitle')}</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSave)} className="space-y-4">
                    {/* Logo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('company.logo')}</label>
                        <div className="flex items-center gap-4">
                            {logo ? (
                                <img src={logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-gray-50 border border-gray-200" />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 border border-dashed border-gray-300 dark:border-gray-600">
                                    <Building2 size={24} />
                                </div>
                            )}
                            <div className="flex-1">
                                <label className="cursor-pointer btn-secondary inline-flex items-center gap-2 text-sm px-3 py-2">
                                    <Upload size={16} />
                                    {t('company.uploadLogo')}
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                </label>
                                {logo && (
                                    <button
                                        type="button"
                                        onClick={() => setValue('logo', null)}
                                        className="ml-3 text-red-500 text-sm hover:underline flex items-center gap-1 inline-flex"
                                    >
                                        <Trash2 size={14} /> {t('common.delete')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('company.name')} *</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input {...register('name')} className="input-field pl-10 w-full" placeholder={t('company.namePlaceholder')} />
                        </div>
                        {errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('company.address')}</label>
                        <input {...register('address')} className="input-field w-full" placeholder={t('company.addressPlaceholder')} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.email')}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input {...register('email')} className="input-field pl-10 w-full" placeholder="email@company.com" />
                            </div>
                            {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.phone')}</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input {...register('phone')} className="input-field pl-10 w-full" placeholder="+1 234 567 890" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('company.taxNumber')}</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input {...register('taxNumber')} className="input-field pl-10 w-full" placeholder="TAX-123456" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('company.bankAccount')}</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input {...register('bankAccount')} className="input-field pl-10 w-full" placeholder="IBAN / Account" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn-primary px-6 py-2 text-sm font-medium">
                            {t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
