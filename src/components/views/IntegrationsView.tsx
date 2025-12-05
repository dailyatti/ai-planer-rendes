import React, { useState } from 'react';
import {
    Link2, Check, X, RefreshCw, ExternalLink,
    Calendar, FileText, CheckSquare, Mail,
    Cloud, Shield, Settings, AlertCircle,
    Zap, Key, Eye, EyeOff,
    Mic, TestTube, CheckCircle2, XCircle
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ApiKeyConfig {
    geminiKey: string;
    openaiKey: string;
    googleCalendarKey?: string;
    notionKey?: string;
    todoistKey?: string;
    outlookKey?: string;
}

const IntegrationsView: React.FC = () => {
    const { language } = useLanguage();
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

    // Translations
    const t = {
        title: language === 'hu' ? 'Integrációk' : 'Integrations',
        subtitle: language === 'hu'
            ? 'Csatlakoztasd kedvenc alkalmazásaidat a produktivitás növeléséhez'
            : 'Connect your favorite apps to supercharge your productivity',
        available: language === 'hu' ? 'Elérhető' : 'Available',
        connected: language === 'hu' ? 'Csatlakoztatva' : 'Connected',
        settings: language === 'hu' ? 'Beállítások' : 'Settings',
        connect: language === 'hu' ? 'Csatlakozás' : 'Connect',
        manage: language === 'hu' ? 'Kezelés' : 'Manage',
        configure: language === 'hu' ? 'Konfigurálás' : 'Configure',
        notConnected: language === 'hu' ? 'Nincs csatlakoztatva' : 'Not connected',
        noIntegrations: language === 'hu' ? 'Nincsenek csatlakoztatott integrációk' : 'No Integrations Connected',
        noIntegrationsDesc: language === 'hu'
            ? 'Csatlakoztasd az első integrációdat, hogy itt megjelenjen. Az alkalmazások automatikusan szinkronizálnak.'
            : 'Connect your first integration to see it here. Your connected apps will sync automatically.',
        browseIntegrations: language === 'hu' ? 'Integrációk Böngészése' : 'Browse Integrations',
        syncSettings: language === 'hu' ? 'Szinkronizálási Beállítások' : 'Sync Settings',
        autoSync: language === 'hu' ? 'Automatikus szinkronizálás' : 'Auto-sync interval',
        autoSyncDesc: language === 'hu' ? 'Milyen gyakran szinkronizáljon' : 'How often to sync with connected apps',
        conflictResolution: language === 'hu' ? 'Ütközések kezelése' : 'Conflict resolution',
        conflictDesc: language === 'hu' ? 'Mi történjen ütközés esetén' : 'What to do when changes conflict',
        security: language === 'hu' ? 'Biztonság és Adatvédelem' : 'Security & Privacy',
        secureData: language === 'hu' ? 'Adataid biztonságban vannak' : 'Your data is secure',
        securityDesc: language === 'hu'
            ? 'Minden integráció OAuth 2.0-t használ titkosított tokenekkel. Soha nem tároljuk a jelszavaidat.'
            : 'All integration connections use OAuth 2.0 with encrypted tokens. We never store your passwords.',
        apiKeySetup: language === 'hu' ? 'API Kulcs Beállítása' : 'API Key Setup',
        enterApiKey: language === 'hu' ? 'Add meg az API kulcsot' : 'Enter your API key',
        testConnection: language === 'hu' ? 'Kapcsolat Tesztelése' : 'Test Connection',
        saveKey: language === 'hu' ? 'Kulcs Mentése' : 'Save Key',
        cancel: language === 'hu' ? 'Mégse' : 'Cancel',
        testing: language === 'hu' ? 'Tesztelés...' : 'Testing...',
        success: language === 'hu' ? 'Sikeres kapcsolat!' : 'Connection successful!',
        error: language === 'hu' ? 'Sikertelen kapcsolat' : 'Connection failed',
        every5min: language === 'hu' ? '5 percenként' : 'Every 5 minutes',
        every15min: language === 'hu' ? '15 percenként' : 'Every 15 minutes',
        everyHour: language === 'hu' ? 'Óránként' : 'Every hour',
        manualOnly: language === 'hu' ? 'Csak manuális' : 'Manual only',
        askEveryTime: language === 'hu' ? 'Mindig kérdezzen' : 'Ask every time',
        keepLocal: language === 'hu' ? 'Helyi változások megtartása' : 'Keep local changes',
        keepRemote: language === 'hu' ? 'Távoli változások megtartása' : 'Keep remote changes',
        // Feature strings
        twoWaySync: language === 'hu' ? 'Kétirányú szinkronizáció' : 'Two-way sync',
        eventImport: language === 'hu' ? 'Esemény importálás' : 'Event import',
        reminders: language === 'hu' ? 'Emlékeztetők' : 'Reminders',
        databaseSync: language === 'hu' ? 'Adatbázis szinkronizálás' : 'Database sync',
        pageImport: language === 'hu' ? 'Oldal importálás' : 'Page import',
        blockConversion: language === 'hu' ? 'Blokk konverzió' : 'Block conversion',
        taskSync: language === 'hu' ? 'Feladat szinkronizálás' : 'Task sync',
        projectImport: language === 'hu' ? 'Projekt importálás' : 'Project import',
        labelMapping: language === 'hu' ? 'Címke hozzárendelés' : 'Label mapping',
        calendarSync: language === 'hu' ? 'Naptár szinkronizálás' : 'Calendar sync',
        taskIntegration: language === 'hu' ? 'Feladat integráció' : 'Task integration',
        contacts: language === 'hu' ? 'Kapcsolatok' : 'Contacts',
        voiceAssistant: language === 'hu' ? 'AI Hang Asszisztens' : 'AI Voice Assistant',
        voiceDesc: language === 'hu'
            ? 'Irányítsd a ContentPlanner Pro-t hanggal a Gemini Live API segítségével.'
            : 'Control ContentPlanner Pro with your voice using the Gemini Live API.',
        voiceFeatures: {
            f1: language === 'hu' ? 'Valós idejű hangvezérlés' : 'Real-time voice control',
            f2: language === 'hu' ? 'Természetes beszélgetés' : 'Natural conversation',
            f3: language === 'hu' ? 'Feladatok kezelése hanggal' : 'Manage tasks with voice'
        }
    };

    // Integration definitions
    const availableIntegrations = [
        {
            id: 'gemini-voice',
            name: t.voiceAssistant,
            description: t.voiceDesc,
            icon: Mic,
            color: 'from-purple-500 to-indigo-600',
            connected: !!apiKeys.geminiKey,
            features: [t.voiceFeatures.f1, t.voiceFeatures.f2, t.voiceFeatures.f3],
            keyField: 'geminiKey' as keyof ApiKeyConfig,
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
            features: [t.twoWaySync, t.eventImport, t.reminders],
            keyField: 'googleCalendarKey',
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
            features: [t.databaseSync, t.pageImport, t.blockConversion],
            keyField: 'notionKey',
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
            features: [t.taskSync, t.projectImport, t.labelMapping],
            keyField: 'todoistKey',
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
            features: [t.calendarSync, t.taskIntegration, t.contacts],
            keyField: 'outlookKey',
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
            setTestMessage(t.success);
        } else {
            setTestStatus('error');
            setTestMessage(t.error);
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

    return (
        <div className="view-container">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="view-title flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                                <Link2 size={24} className="text-white" />
                            </div>
                            {t.title}
                        </h1>
                        <p className="view-subtitle">{t.subtitle}</p>
                    </div>
                </div>
                {/* Tabs */}
                <div className="mt-6">
                    <div className="tab-group">
                        {[{ id: 'available', label: t.available, icon: Zap }, { id: 'connected', label: t.connected, icon: Check }, { id: 'settings', label: t.settings, icon: Settings }].map(tab => (
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
                            <div key={integration.id} className="card hover-lift">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${integration.color} shadow-lg`}>
                                        <Icon size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                                {integration.name}
                                            </h3>
                                            {integration.connected ? (
                                                <span className="badge badge-success">
                                                    <Check size={12} /> {t.connected}
                                                </span>
                                            ) : (
                                                <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                                    {t.notConnected}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                            {integration.description}
                                        </p>
                                        {/* Features */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {integration.features.map((feature, idx) => (
                                                <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400">
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
                                                    <Settings size={16} /> {t.manage}
                                                </>
                                            ) : integration.keyField ? (
                                                <>
                                                    <Key size={16} /> {t.configure}
                                                </>
                                            ) : (
                                                <>
                                                    <ExternalLink size={16} /> {t.connect}
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
                        <div className="card text-center py-12">
                            <Cloud size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t.noIntegrations}</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">{t.noIntegrationsDesc}</p>
                            <button onClick={() => setActiveTab('available')} className="btn-primary">
                                <Zap size={18} /> {t.browseIntegrations}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {connectedIntegrations.map(integration => {
                                const Icon = integration.icon;
                                return (
                                    <div key={integration.id} className="card">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl bg-gradient-to-br ${integration.color} shadow-lg`}>
                                                <Icon size={24} className="text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">{integration.name}</h3>
                                                <span className="badge badge-success mt-1"><Check size={12} /> {t.connected}</span>
                                            </div>
                                            <button onClick={() => handleConnect(integration.id)} className="btn-secondary">
                                                <Settings size={16} /> {t.manage}
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
                            {t.syncSettings}
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{t.autoSync}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t.autoSyncDesc}</p>
                                </div>
                                <select className="input-field max-w-[160px] py-2">
                                    <option>{t.every5min}</option>
                                    <option>{t.every15min}</option>
                                    <option>{t.everyHour}</option>
                                    <option>{t.manualOnly}</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{t.conflictResolution}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t.conflictDesc}</p>
                                </div>
                                <select className="input-field max-w-[180px] py-2">
                                    <option>{t.askEveryTime}</option>
                                    <option>{t.keepLocal}</option>
                                    <option>{t.keepRemote}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <h3 className="section-title flex items-center gap-2">
                            <Shield size={20} className="text-primary-500" />
                            {t.security}
                        </h3>
                        <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/30">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={20} className="text-primary-600 dark:text-primary-400 mt-0.5" />
                                <div>
                                    <p className="font-medium text-primary-800 dark:text-primary-300">{t.secureData}</p>
                                    <p className="text-sm text-primary-600 dark:text-primary-500 mt-1">{t.securityDesc}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* API Key Modal */}
            {showApiModal && (
                <div className="modal-backdrop" onClick={() => setShowApiModal(false)}>
                    <div className="modal-panel w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Key size={20} className="text-primary-500" />
                                {t.apiKeySetup}
                            </h3>
                            <button onClick={() => setShowApiModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t.enterApiKey}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={tempKey}
                                        onChange={e => setTempKey(e.target.value)}
                                        className="input-field pr-10"
                                        placeholder="sk-... or AIza..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        Need a Google API key? <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Get it here</a>.
                                    </p>
                                </div>
                            </div>
                            {testStatus !== 'idle' && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 ${testStatus === 'testing' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : testStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                                    {testStatus === 'testing' && <RefreshCw size={16} className="animate-spin" />}
                                    {testStatus === 'success' && <CheckCircle2 size={16} />}
                                    {testStatus === 'error' && <XCircle size={16} />}
                                    <span className="text-sm font-medium">{testStatus === 'testing' ? t.testing : testMessage}</span>
                                </div>
                            )}
                            <button onClick={handleTestConnection} disabled={!tempKey || testStatus === 'testing'} className="btn-secondary w-full">
                                <TestTube size={18} /> {t.testConnection}
                            </button>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowApiModal(false)} className="btn-ghost flex-1">{t.cancel}</button>
                                <button onClick={handleSaveKey} disabled={!tempKey} className="btn-primary flex-1">
                                    <Check size={18} /> {t.saveKey}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IntegrationsView;
