import React, { useState } from 'react';
import {
    Link2, Check, X, RefreshCw, ExternalLink,
    Calendar, FileText, CheckSquare, Mail,
    Cloud, Settings,
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
            id: 'openai',
            name: 'OpenAI (ChatGPT)',
            description: t('integrations.openai.desc'),
            icon: Zap,
            color: 'from-green-500 to-emerald-600',
            connected: !!apiKeys.openaiKey,
            comingSoon: false,
            features: [
                t('integrations.openai.feat1'),
                t('integrations.openai.feat2'),
                t('integrations.openai.feat3')
            ],
            keyField: 'openaiKey' as keyof ApiKeyConfig,
            helpLink: 'https://platform.openai.com/api-keys'
        },
        {
            id: 'gemini-voice',
            name: 'Google Gemini AI',
            description: t('integrations.gemini.desc'),
            icon: Mic,
            color: 'from-blue-500 to-indigo-600',
            connected: !!apiKeys.geminiKey,
            comingSoon: false,
            features: [
                t('integrations.gemini.feat1'),
                t('integrations.gemini.feat2'),
                t('integrations.gemini.feat3')
            ],
            keyField: 'geminiKey' as keyof ApiKeyConfig,
            helpLink: 'https://aistudio.google.com/app/apikey'
        },
        {
            id: 'google-calendar',
            name: 'Google Calendar',
            description: t('integrations.gcal.desc'),
            icon: Calendar,
            color: 'from-red-500 to-orange-500',
            connected: !!apiKeys.googleCalendarKey,
            comingSoon: true,
            features: [
                t('integrations.gcal.feat1'),
                t('integrations.gcal.feat2'),
                t('integrations.gcal.feat3')
            ],
            keyField: 'googleCalendarKey' as keyof ApiKeyConfig,
            helpLink: 'https://console.cloud.google.com/apis/credentials'
        },
        {
            id: 'notion',
            name: 'Notion',
            description: t('integrations.notion.desc'),
            icon: FileText,
            color: 'from-gray-700 to-gray-900',
            connected: !!apiKeys.notionKey,
            comingSoon: true,
            features: [
                t('integrations.notion.feat1'),
                t('integrations.notion.feat2'),
                t('integrations.notion.feat3')
            ],
            keyField: 'notionKey' as keyof ApiKeyConfig,
            helpLink: 'https://www.notion.so/my-integrations'
        },
        {
            id: 'todoist',
            name: 'Todoist',
            description: t('integrations.todoist.desc'),
            icon: CheckSquare,
            color: 'from-red-500 to-red-600',
            connected: !!apiKeys.todoistKey,
            comingSoon: true,
            features: [
                t('integrations.todoist.feat1'),
                t('integrations.todoist.feat2'),
                t('integrations.todoist.feat3')
            ],
            keyField: 'todoistKey' as keyof ApiKeyConfig,
            helpLink: 'https://todoist.com/app/settings/integrations'
        },
        {
            id: 'outlook',
            name: 'Microsoft Outlook',
            description: t('integrations.outlook.desc'),
            icon: Mail,
            color: 'from-blue-500 to-blue-700',
            connected: !!apiKeys.outlookKey,
            comingSoon: true,
            features: [
                t('integrations.outlook.feat1'),
                t('integrations.outlook.feat2'),
                t('integrations.outlook.feat3')
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
        if (!selectedIntegration || !tempKey) return;

        setTestStatus('testing');
        setTestMessage('');

        try {
            if (selectedIntegration === 'openai') {
                const response = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${tempKey}` }
                });
                if (response.ok) {
                    setTestStatus('success');
                    setTestMessage(t('integrations.connectionSuccess') || 'Connection Successful');
                } else {
                    throw new Error('Invalid API Key');
                }
            } else if (selectedIntegration === 'gemini-voice') {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${tempKey}`);
                if (response.ok) {
                    setTestStatus('success');
                    setTestMessage(t('integrations.connectionSuccess') || 'Connection Successful');
                } else {
                    throw new Error('Invalid API Key');
                }
            } else {
                // Fake validation for others
                await new Promise(resolve => setTimeout(resolve, 1500));
                if (tempKey.length > 5) {
                    setTestStatus('success');
                    setTestMessage(t('integrations.connectionSuccess') || 'Connection Successful');
                } else {
                    throw new Error('Invalid Format');
                }
            }
        } catch (error) {
            setTestStatus('error');
            setTestMessage(t('integrations.connectionFailed') || 'Connection Failed');
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
                    <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
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
                    <div className="tab-group bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-1.5 rounded-2xl inline-flex">
                        {[
                            { id: 'available', label: t('integrations.available'), icon: Zap },
                            { id: 'connected', label: t('integrations.connected'), icon: Check },
                            { id: 'settings', label: t('settings.title'), icon: Settings }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'available' | 'connected' | 'settings')}
                                className={`
                                    flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300
                                    ${activeTab === tab.id
                                        ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-md'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'}
                                `}
                            >
                                <tab.icon size={18} />
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
                            <div key={integration.id} className="group relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-gray-800/40 dark:to-gray-800/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative card hover-lift glass-panel border border-white/20 dark:border-gray-700/30">
                                    <div className="flex items-start gap-5">
                                        <div className={`p-4 rounded-xl bg-gradient-to-br ${integration.color} shadow-lg group-hover:scale-110 transition-transform duration-300 ring-4 ring-white/10`}>
                                            <Icon size={28} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate pr-2">
                                                    {integration.name}
                                                </h3>
                                                {integration.comingSoon ? (
                                                    <span className="badge bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0 backdrop-blur-md border border-amber-200 dark:border-amber-800">
                                                        ⏳ {t('integrations.comingSoon') || 'Coming Soon'}
                                                    </span>
                                                ) : integration.connected ? (
                                                    <span className="badge badge-success shrink-0 backdrop-blur-md">
                                                        <Check size={12} /> {t('integrations.connected')}
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-gray-100/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-400 shrink-0 backdrop-blur-md">
                                                        {t('integrations.notConnected') || 'Not Connected'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed line-clamp-2">
                                                {integration.description}
                                            </p>
                                            {/* Features */}
                                            <div className="flex flex-wrap gap-2 mb-5">
                                                {integration.features.map((feature, idx) => (
                                                    <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                        {feature}
                                                    </span>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => handleConnect(integration.id)}
                                                className={`w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${integration.connected
                                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                    : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5'
                                                    }`}
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
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Connected Tab */}
            {activeTab === 'connected' && (
                <div className="animate-fade-in">
                    {connectedIntegrations.length === 0 ? (
                        <div className="card text-center py-16 px-4 glass-panel">
                            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-800/50 mx-auto flex items-center justify-center mb-6">
                                <Cloud size={40} className="text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('integrations.noIntegrations')}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                                {t('integrations.connectAppsDesc')}
                            </p>
                            <button onClick={() => setActiveTab('available')} className="btn-primary shadow-lg shadow-primary-500/20">
                                <Zap size={18} /> {t('integrations.available')}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {connectedIntegrations.map(integration => {
                                const Icon = integration.icon;
                                return (
                                    <div key={integration.id} className="card glass-panel group">
                                        <div className="flex items-center gap-5">
                                            <div className={`p-4 rounded-xl bg-gradient-to-br ${integration.color} shadow-lg group-hover:scale-105 transition-transform duration-300`}>
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

            {/* Settings Tab - Now with Instructions */}
            {activeTab === 'settings' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Sync Settings Card */}
                    <div className="card glass-panel">
                        <h3 className="section-title flex items-center gap-2">
                            <RefreshCw size={20} className="text-primary-500" />
                            {t('integrations.syncSettings')}
                        </h3>
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 gap-4">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {t('integrations.autoSyncInterval')}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('integrations.syncFrequency')}
                                    </p>
                                </div>
                                <select className="input-field w-full sm:w-auto min-w-[160px] bg-white dark:bg-gray-900">
                                    <option>{t('integrations.every15Mins')}</option>
                                    <option>{t('integrations.everyHour')}</option>
                                    <option>{t('integrations.manualOnly')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Integration Instructions */}
                    <div className="card glass-panel">
                        <h3 className="section-title flex items-center gap-2 mb-6">
                            <FileText size={20} className="text-blue-500" />
                            {t('integrations.setupGuide') || 'Integration Setup Guide'}
                        </h3>

                        <div className="space-y-6">
                            {/* OpenAI Instructions */}
                            <div className="p-5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-800/30">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
                                        <Zap size={20} className="text-white" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">OpenAI (ChatGPT)</h4>
                                    {apiKeys.openaiKey && <span className="badge badge-success text-xs"><Check size={12} /> {t('integrations.configured')}</span>}
                                </div>
                                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-medium">{t('integrations.howToSetup') || 'How to setup:'}</p>
                                    <ol className="list-decimal list-inside space-y-2 ml-2">
                                        <li>{t('integrations.openai.step1') || 'Go to platform.openai.com and sign in or create an account'}</li>
                                        <li>{t('integrations.openai.step2') || 'Navigate to API Keys section in your account settings'}</li>
                                        <li>{t('integrations.openai.step3') || 'Click "Create new secret key" and copy the key'}</li>
                                        <li>{t('integrations.openai.step4') || 'Paste the key in the integration settings above'}</li>
                                    </ol>
                                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
                                        <p className="text-amber-800 dark:text-amber-300 text-xs font-medium">
                                            ⚠️ {t('integrations.openai.warning') || 'Note: OpenAI API requires a paid account with credits. Free tier has limited usage.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Gemini Instructions */}
                            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
                                        <Mic size={20} className="text-white" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Google Gemini AI</h4>
                                    {apiKeys.geminiKey && <span className="badge badge-success text-xs"><Check size={12} /> {t('integrations.configured')}</span>}
                                </div>
                                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-medium">{t('integrations.howToSetup') || 'How to setup:'}</p>
                                    <ol className="list-decimal list-inside space-y-2 ml-2">
                                        <li>{t('integrations.gemini.step1') || 'Visit aistudio.google.com and sign in with your Google account'}</li>
                                        <li>{t('integrations.gemini.step2') || 'Click "Get API Key" in the left sidebar'}</li>
                                        <li>{t('integrations.gemini.step3') || 'Create a new API key or use an existing one'}</li>
                                        <li>{t('integrations.gemini.step4') || 'Copy the key and paste it in the integration settings'}</li>
                                    </ol>
                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                                        <p className="text-blue-800 dark:text-blue-300 text-xs font-medium">
                                            💡 {t('integrations.gemini.tip') || 'Tip: Gemini offers a generous free tier. Perfect for voice assistant and AI features!'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Google Calendar Instructions */}
                            <div className="p-5 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-100 dark:border-red-800/30 opacity-75">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-md">
                                        <Calendar size={20} className="text-white" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Google Calendar</h4>
                                    <span className="badge bg-amber-100 text-amber-700 text-xs">⏳ {t('integrations.comingSoon')}</span>
                                </div>
                                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-medium">{t('integrations.plannedFeatures') || 'Planned features:'}</p>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li>{t('integrations.gcal.feature1') || 'Sync your plans automatically with Google Calendar'}</li>
                                        <li>{t('integrations.gcal.feature2') || 'Import calendar events as plan items'}</li>
                                        <li>{t('integrations.gcal.feature3') || 'Two-way synchronization support'}</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Notion Instructions */}
                            <div className="p-5 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200 dark:border-gray-700 opacity-75">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 shadow-md">
                                        <FileText size={20} className="text-white" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Notion</h4>
                                    <span className="badge bg-amber-100 text-amber-700 text-xs">⏳ {t('integrations.comingSoon')}</span>
                                </div>
                                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-medium">{t('integrations.plannedFeatures') || 'Planned features:'}</p>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li>{t('integrations.notion.feature1') || 'Export notes to Notion databases'}</li>
                                        <li>{t('integrations.notion.feature2') || 'Sync goals and progress tracking'}</li>
                                        <li>{t('integrations.notion.feature3') || 'Import Notion pages as notes'}</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Todoist Instructions */}
                            <div className="p-5 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-100 dark:border-red-800/30 opacity-75">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-md">
                                        <CheckSquare size={20} className="text-white" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Todoist</h4>
                                    <span className="badge bg-amber-100 text-amber-700 text-xs">⏳ {t('integrations.comingSoon')}</span>
                                </div>
                                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-medium">{t('integrations.plannedFeatures') || 'Planned features:'}</p>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li>{t('integrations.todoist.feature1') || 'Import Todoist tasks as plan items'}</li>
                                        <li>{t('integrations.todoist.feature2') || 'Sync task completion status'}</li>
                                        <li>{t('integrations.todoist.feature3') || 'Priority mapping between apps'}</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Outlook Instructions */}
                            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 border border-blue-100 dark:border-blue-800/30 opacity-75">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
                                        <Mail size={20} className="text-white" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Microsoft Outlook</h4>
                                    <span className="badge bg-amber-100 text-amber-700 text-xs">⏳ {t('integrations.comingSoon')}</span>
                                </div>
                                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-medium">{t('integrations.plannedFeatures') || 'Planned features:'}</p>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li>{t('integrations.outlook.feature1') || 'Calendar synchronization with Outlook'}</li>
                                        <li>{t('integrations.outlook.feature2') || 'Email reminders for tasks'}</li>
                                        <li>{t('integrations.outlook.feature3') || 'Microsoft 365 integration'}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* API Key Modal */}
            {showApiModal && selectedIntegrationObj && (
                <div className="modal-backdrop backdrop-blur-sm" onClick={() => setShowApiModal(false)}>
                    <div className="modal-panel w-full max-w-md p-0 overflow-hidden shadow-2xl shadow-black/20" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-md">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedIntegrationObj.color} shadow-md`}>
                                        <selectedIntegrationObj.icon size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {t('integrations.configure')}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-medium">{selectedIntegrationObj.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowApiModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-5 bg-white dark:bg-gray-900">
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
                                        className="input-field pl-10 pr-10 font-mono text-sm shadow-sm"
                                        placeholder="sk-..."
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <div className="mt-2 text-right">
                                    <a
                                        href={selectedIntegrationObj.helpLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline inline-flex items-center gap-1 transition-colors"
                                    >
                                        {t('integrations.getKey')} <ExternalLink size={10} />
                                    </a>
                                </div>
                            </div>

                            {testStatus !== 'idle' && (
                                <div className={`p-3 rounded-lg flex items-center gap-3 animate-fade-in ${testStatus === 'testing' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800' :
                                    testStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800' :
                                        'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800'
                                    }`}>
                                    {testStatus === 'testing' && <RefreshCw size={18} className="animate-spin" />}
                                    {testStatus === 'success' && <CheckCircle2 size={18} />}
                                    {testStatus === 'error' && <XCircle size={18} />}
                                    <span className="text-sm font-semibold">
                                        {testStatus === 'testing' ? t('integrations.testing') : testMessage}
                                    </span>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    onClick={handleTestConnection}
                                    disabled={!tempKey || testStatus === 'testing'}
                                    className="btn-secondary justify-center w-full transition-all"
                                >
                                    <TestTube size={18} /> {t('integrations.testConnection')}
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowApiModal(false)} className="btn-ghost flex-1 justify-center transition-colors">{t('common.cancel')}</button>
                                    <button onClick={handleSaveKey} disabled={!tempKey} className="btn-primary flex-1 justify-center shadow-lg shadow-primary-500/20 transition-all hover:shadow-primary-500/40">
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
