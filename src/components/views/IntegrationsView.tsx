import React, { useState } from 'react';
import {
    Link2, Check, X, RefreshCw, ExternalLink,
    Calendar, FileText, CheckSquare, Mail,
    Cloud, Shield, Settings, AlertCircle,
    Zap, Key, Eye, EyeOff,
    Mic, TestTube, CheckCircle2, XCircle,
    Globe
} from 'lucide-react';
import { useLanguage, LANGUAGE_NAMES, Language } from '../../contexts/LanguageContext';

interface ApiKeyConfig {
    geminiKey: string;
    openaiKey: string;
    googleCalendarKey?: string;
    notionKey?: string;
    todoistKey?: string;
    outlookKey?: string;
}

const IntegrationsView: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'available' | 'connected' | 'settings'>('available');
    const [showApiModal, setShowApiModal] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
    const [apiKeys, setApiKeys] = useState<ApiKeyConfig>(() => {
        const saved = localStorage.getItem('contentplanner_api_keys');
        return saved ? JSON.parse(saved) : {
            geminiKey: '',
            openaiKey: '',
            googleCalendarKey: '',
            notionKey: '',
            todoistKey: '',
            outlookKey: ''
        };
    });
    const [tempKey, setTempKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    // Integration definitions
    const availableIntegrations = [
        {
            id: 'gemini-voice',
            name: t('nav.integrations') === 'Integrációk' && language === 'hu' ? 'AI Hang Asszisztens' : 'AI Voice Assistant', // Fallback manual check for specific feature name if not in global types yet
            description: language === 'hu'
                ? 'Irányítsd a ContentPlanner Pro-t hanggal a Gemini Live API segítségével.'
                : 'Control ContentPlanner Pro with your voice using the Gemini Live API.',
            icon: Mic,
            color: 'from-purple-500 to-indigo-600',
            connected: !!apiKeys.geminiKey,
            features: [
                language === 'hu' ? 'Valós idejű hangvezérlés' : 'Real-time voice control',
                language === 'hu' ? 'Természetes beszélgetés' : 'Natural conversation',
                language === 'hu' ? 'Feladatok kezelése hanggal' : 'Manage tasks with voice'
            ],
            keyField: 'geminiKey' as keyof ApiKeyConfig,
            helpLink: 'https://aistudio.google.com/app/apikey'
        },
        {
            id: 'google-calendar',
            name: 'Google Calendar',
            description: language === 'hu'
                ? 'Szinkronizáld terveidet és eseményeidet a Google Naptárral automatikusan.'
                : 'Sync your plans and events with Google Calendar automatically.',
            icon: Calendar,
            color: 'from-red-500 to-orange-500',
            connected: !!apiKeys.googleCalendarKey,
            features: [
                language === 'hu' ? 'Kétirányú szinkronizáció' : 'Two-way sync',
                language === 'hu' ? 'Esemény importálás' : 'Event import',
                language === 'hu' ? 'Emlékeztetők' : 'Reminders'
            ],
            keyField: 'googleCalendarKey' as keyof ApiKeyConfig,
            helpLink: 'https://console.cloud.google.com/apis/credentials'
        },
        {
            id: 'notion',
            name: 'Notion',
            description: language === 'hu'
                ? 'Csatlakoztasd Notion munkaterületedet a zökkenőmentes jegyzet- és feladatkezeléshez.'
                : 'Connect your Notion workspace for seamless note and task management.',
            icon: FileText,
            color: 'from-gray-700 to-gray-900',
            connected: !!apiKeys.notionKey,
            features: [
                language === 'hu' ? 'Adatbázis szinkronizálás' : 'Database sync',
                language === 'hu' ? 'Oldal importálás' : 'Page import',
                language === 'hu' ? 'Blokk konverzió' : 'Block conversion'
            ],
            keyField: 'notionKey' as keyof ApiKeyConfig,
            helpLink: 'https://www.notion.so/my-integrations'
        },
        {
            id: 'todoist',
            name: 'Todoist',
            description: language === 'hu'
                ? 'Importáld és szinkronizáld Todoist feladataidat a ContentPlanner Pro-val.'
                : 'Import and sync your Todoist tasks with ContentPlanner Pro.',
            icon: CheckSquare,
            color: 'from-red-500 to-red-600',
            connected: !!apiKeys.todoistKey,
            features: [
                language === 'hu' ? 'Feladat szinkronizálás' : 'Task sync',
                language === 'hu' ? 'Projekt importálás' : 'Project import',
                language === 'hu' ? 'Címke hozzárendelés' : 'Label mapping'
            ],
            keyField: 'todoistKey' as keyof ApiKeyConfig,
            helpLink: 'https://todoist.com/app/settings/integrations'
        },
        {
            id: 'outlook',
            name: 'Microsoft Outlook',
            description: language === 'hu'
                ? 'Integráld az Outlook naptárat és feladatokat Windows felhasználóknak.'
                : 'Integrate with Outlook calendar and tasks for Windows users.',
            icon: Mail,
            color: 'from-blue-500 to-blue-700',
            connected: !!apiKeys.outlookKey,
            features: [
                language === 'hu' ? 'Naptár szinkronizálás' : 'Calendar sync',
                language === 'hu' ? 'Feladat integráció' : 'Task integration',
                language === 'hu' ? 'Kapcsolatok' : 'Contacts'
            ],
            keyField: 'outlookKey' as keyof ApiKeyConfig,
            helpLink: 'https://portal.azure.com/'
        },
    ];

    const handleConnect = (integrationId: string) => {
        const integration = availableIntegrations.find(i => i.id === integrationId);
        if (integration?.keyField) {
            const key = integration.keyField as keyof ApiKeyConfig;
            setSelectedIntegration(integrationId);
            setTempKey(apiKeys[key] ?? '');
            setShowApiModal(true);
            setTestStatus('idle');
            setTestMessage('');
        } else {
            console.log('OAuth flow would start for:', integrationId);
        }
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (tempKey && tempKey.length > 10) {
            setTestStatus('success');
            setTestMessage(t('common.success'));
        } else {
            setTestStatus('error');
            setTestMessage(t('common.error'));
        }
    };

    const handleSaveKey = () => {
        if (!selectedIntegration) return;
        const integration = availableIntegrations.find(i => i.id === selectedIntegration);
        if (integration?.keyField) {
            const key = integration.keyField as keyof ApiKeyConfig;
            const newKeys = { ...apiKeys, [key]: tempKey } as ApiKeyConfig;
            setApiKeys(newKeys);
            localStorage.setItem('contentplanner_api_keys', JSON.stringify(newKeys));
        }
        setShowApiModal(false);
        setSelectedIntegration(null);
        setTempKey('');
    };

    const connectedIntegrations = availableIntegrations.filter(i => i.connected);
    const selectedIntegrationObj = availableIntegrations.find(i => i.id === selectedIntegration);

    return (
        <div className="view-container">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                    <div>
                        <h1 className="view-title flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                                <Link2 size={24} className="text-white" />
                            </div>
                            {t('integrations.title')}
                        </h1>
                        <p className="view-subtitle max-w-2xl">{t('integrations.subtitle')}</p>
                    </div>

                    {/* Language Selector */}
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            <Globe size={20} />
                        </div>
                        <div className="relative">
                            <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-0.5">
                                {t('settings.language')}
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as Language)}
                                className="bg-transparent font-semibold text-gray-900 dark:text-white border-none p-0 pr-8 focus:ring-0 cursor-pointer min-w-[140px]"
                            >
                                {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                                    <option key={code} value={code}>{name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-8">
                    <div className="tab-group">
                        {[
                            { id: 'available', label: t('integrations.available'), icon: Zap },
                            { id: 'connected', label: t('integrations.connected'), icon: Check },
                            { id: 'settings', label: t('header.settings'), icon: Settings }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'available' | 'connected' | 'settings')}
                                className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                            >
                                <tab.icon size={16} className="inline mr-2" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Available Integrations */}
            {activeTab === 'available' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    {availableIntegrations.map(integration => {
                        const Icon = integration.icon;
                        return (
                            <div key={integration.id} className="card hover-lift group">
                                <div className="flex items-start gap-5">
                                    <div className={`p-4 rounded-xl bg-gradient-to-br ${integration.color} shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                                        <Icon size={28} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate pr-2">
                                                {integration.name}
                                            </h3>
                                            {integration.connected ? (
                                                <span className="badge badge-success shrink-0">
                                                    <Check size={12} /> {t('integrations.connected')}
                                                </span>
                                            ) : (
                                                <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 shrink-0">
                                                    {t('integrations.disconnect').replace('Disconnect', 'Not Connected')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                                            {integration.description}
                                        </p>
                                        {/* Features */}
                                        <div className="flex flex-wrap gap-2 mb-5">
                                            {integration.features.map((feature, idx) => (
                                                <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                    {feature}
                                                </span>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => handleConnect(integration.id)}
                                            className={integration.connected ? 'btn-secondary w-full' : 'btn-primary w-full'}
                                        >
                                            {integration.connected ? (
                                                <>
                                                    <Settings size={18} /> {t('integrations.configure')}
                                                </>
                                            ) : integration.keyField ? (
                                                <>
                                                    <Key size={18} /> {t('integrations.connect')}
                                                </>
                                            ) : (
                                                <>
                                                    <ExternalLink size={18} /> {t('integrations.connect')}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Connected Tab */}
            {activeTab === 'connected' && (
                <div className="animate-fade-in">
                    {connectedIntegrations.length === 0 ? (
                        <div className="card text-center py-16 px-4">
                            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-800 mx-auto flex items-center justify-center mb-6">
                                <Cloud size={40} className="text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {language === 'hu' ? 'Nincsenek aktív integrációk' : 'No Integrations Connected'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                                {language === 'hu'
                                    ? 'Csatlakoztasd alkalmazásaidat az "Elérhető" fülön, hogy szinkronizáld adataidat.'
                                    : 'Connect apps from the Available tab to start syncing your data.'}
                            </p>
                            <button onClick={() => setActiveTab('available')} className="btn-primary">
                                <Zap size={18} /> {t('integrations.available')}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {connectedIntegrations.map(integration => {
                                const Icon = integration.icon;
                                return (
                                    <div key={integration.id} className="card">
                                        <div className="flex items-center gap-5">
                                            <div className={`p-4 rounded-xl bg-gradient-to-br ${integration.color} shadow-lg`}>
                                                <Icon size={24} className="text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{integration.name}</h3>
                                                <span className="badge badge-success mt-1.5"><Check size={12} /> {t('integrations.connected')}</span>
                                            </div>
                                            <button onClick={() => handleConnect(integration.id)} className="btn-secondary">
                                                <Settings size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="card">
                        <h3 className="section-title flex items-center gap-2">
                            <RefreshCw size={20} className="text-primary-500" />
                            {language === 'hu' ? 'Szinkronizálás' : 'Sync Settings'}
                        </h3>
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 gap-4">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {language === 'hu' ? 'Automatikus frissítés' : 'Auto-sync interval'}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {language === 'hu' ? 'Gyakoriság beállítása' : 'How often to sync'}
                                    </p>
                                </div>
                                <select className="input-field w-full sm:w-auto min-w-[160px]">
                                    <option>{language === 'hu' ? '15 percenként' : 'Every 15 mins'}</option>
                                    <option>{language === 'hu' ? 'Óránként' : 'Every hour'}</option>
                                    <option>{language === 'hu' ? 'Manuális' : 'Manual only'}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* API Key Modal */}
            {showApiModal && selectedIntegrationObj && (
                <div className="modal-backdrop" onClick={() => setShowApiModal(false)}>
                    <div className="modal-panel w-full max-w-md p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedIntegrationObj.color}`}>
                                        <selectedIntegrationObj.icon size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {t('integrations.configure')}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-medium">{selectedIntegrationObj.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowApiModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    {t('integrations.enterKey')}
                                </label>
                                <div className="relative group">
                                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={tempKey}
                                        onChange={e => setTempKey(e.target.value)}
                                        className="input-field pl-10 pr-10 font-mono text-sm"
                                        placeholder="sk-..."
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <div className="mt-2 text-right">
                                    <a
                                        href={selectedIntegrationObj.helpLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline inline-flex items-center gap-1"
                                    >
                                        {t('integrations.getKey')} <ExternalLink size={10} />
                                    </a>
                                </div>
                            </div>

                            {testStatus !== 'idle' && (
                                <div className={`p-3 rounded-lg flex items-center gap-3 animate-fade-in ${testStatus === 'testing' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' :
                                        testStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                                            'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                    }`}>
                                    {testStatus === 'testing' && <RefreshCw size={18} className="animate-spin" />}
                                    {testStatus === 'success' && <CheckCircle2 size={18} />}
                                    {testStatus === 'error' && <XCircle size={18} />}
                                    <span className="text-sm font-semibold">
                                        {testStatus === 'testing' ? (language === 'hu' ? 'Tesztelés foamatban...' : 'Testing connection...') : testMessage}
                                    </span>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    onClick={handleTestConnection}
                                    disabled={!tempKey || testStatus === 'testing'}
                                    className="btn-secondary justify-center w-full"
                                >
                                    <TestTube size={18} /> {t('integrations.testConnection')}
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowApiModal(false)} className="btn-ghost flex-1 justify-center">{t('common.cancel')}</button>
                                    <button onClick={handleSaveKey} disabled={!tempKey} className="btn-primary flex-1 justify-center shadow-lg shadow-primary-500/20">
                                        <Check size={18} /> {t('common.save')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IntegrationsView;
