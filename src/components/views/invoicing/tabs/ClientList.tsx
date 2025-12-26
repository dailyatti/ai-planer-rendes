import React from 'react';
import { User, MoreHorizontal, Mail, Building2, Plus } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Client } from '../../../../types/planner';

interface ClientListProps {
    clients: Client[];
    onAddClient: () => void;
}

export const ClientList: React.FC<ClientListProps> = ({ clients, onAddClient }) => {
    const { t } = useLanguage();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
            {clients.map(client => (
                <div key={client.id} className="card group hover:shadow-lg transition-all border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
                            {client.name.charAt(0)}
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary-600 transition-colors">{client.company || client.name}</h3>
                    <p className="text-sm text-gray-500 font-medium mb-4 flex items-center gap-2">
                        <User size={14} /> {client.name}
                    </p>

                    <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Mail size={14} className="text-gray-400" /> {client.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 truncate">
                            <Building2 size={14} className="text-gray-400" /> {client.address || t('common.noAddress') || 'No address'}
                        </div>
                    </div>
                </div>
            ))}

            <button onClick={onAddClient} className="card border-2 border-dashed border-gray-300 dark:border-gray-700 bg-transparent hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 flex flex-col items-center justify-center min-h-[200px] gap-4 group transition-all rounded-xl">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center text-gray-400 group-hover:text-primary-600 transition-colors">
                    <Plus size={28} />
                </div>
                <span className="font-bold text-lg text-gray-500 group-hover:text-primary-600 transition-colors">{t('invoicing.addClient')}</span>
            </button>
        </div>
    );
};
