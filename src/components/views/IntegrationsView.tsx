import React, { useMemo, useState } from 'react';
import {
    Link2, Check, X, RefreshCw, ExternalLink,
    FileText, Cloud, Settings,
    Key, Eye, EyeOff,
    Mic, TestTube, CheckCircle2, XCircle,
    Globe, Zap, BrainCircuit, Trash2
} from 'lucide-react';
import { useLanguage, LANGUAGE_NAMES, Language } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';
import { AIService } from '../../services/AIService';
import {
    DEFAULT_GEMINI_AUDIO_LIVE_MODEL,
    DEFAULT_GEMINI_TEXT_LIVE_MODEL,
    DEFAULT_GEMINI_TEXT_MODEL,
    DEFAULT_OPENAI_BASE_URL,
    DEFAULT_OPENAI_MODEL,
    EMPTY_AI_CONFIG,
    isLikelyResponsesEndpoint,
    normalizeAIConfig,
} from '../../config/aiDefaults';
import { AIConfig, AIProvider } from '../../types/ai';

type IntegrationId = 'gemini' | 'openai';

const matchesGeminiModel = (availableModels: string[], targetModel: string) => {
    if (!targetModel) return false;

    return availableModels.some((modelName) =>
        modelName === targetModel ||
        modelName.endsWith(`/${targetModel}`) ||
        modelName.includes(targetModel),
    );
};

const IntegrationsView: React.FC = () => {
    const { language, changeLanguage, t } = useLanguage();
    const { settings, updateSettings } = useSettings();
    const [activeTab, setActiveTab] = useState<'available' | 'connected' | 'settings'>('available');
    const [showApiModal, setShowApiModal] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<IntegrationId | null>(null);

    const activeProvider = settings.aiConfig?.provider || null;

    const [tempKey, setTempKey] = useState('');
    const [tempModel, setTempModel] = useState('');
    const [tempBaseUrl, setTempBaseUrl] = useState('');
    const [tempLiveTextModel, setTempLiveTextModel] = useState('');
    const [tempLiveAudioModel, setTempLiveAudioModel] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [showKey, setShowKey] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    const availableIntegrations = useMemo(() => ([
        {
            id: 'gemini' as const,
            name: 'Google Gemini',
            description: t('integrations.gemini.descUnified'),
            icon: Mic,
            color: 'from-blue-500 to-indigo-600',
            connected: activeProvider === 'gemini',
            provider: 'gemini' as AIProvider,
            features: [
                t('integrations.gemini.featureTextModel'),
                t('integrations.gemini.featureLiveText'),
                t('integrations.gemini.featureLiveVoice'),
            ],
            helpLink: 'https://aistudio.google.com/app/apikey',
        },
        {
            id: 'openai' as const,
            name: 'OpenAI',
            description: t('integrations.openai.descUnified'),
            icon: BrainCircuit,
            color: 'from-emerald-500 to-teal-600',
            connected: activeProvider === 'openai',
            provider: 'openai' as AIProvider,
            features: [
                t('integrations.openai.featureResponses'),
                t('integrations.openai.featureKnowledge'),
                t('integrations.openai.featureAdvanced'),
            ],
            helpLink: 'https://platform.openai.com/api-keys',
        },
    ]), [activeProvider, t]);

    const selectedIntegrationObj = availableIntegrations.find((integration) => integration.id === selectedIntegration);
    const selectedIsGemini = selectedIntegrationObj?.provider === 'gemini';

    const buildDraftConfig = (provider: AIProvider, apiKey: string): AIConfig =>
        normalizeAIConfig({
            provider,
            apiKey,
            model: tempModel,
            baseUrl: tempBaseUrl,
            liveTextModel: tempLiveTextModel,
            liveAudioModel: tempLiveAudioModel,
        });

    const handleConnect = (integrationId: IntegrationId) => {
        const integration = availableIntegrations.find((item) => item.id === integrationId);
        if (!integration) return;

        const savedConfig = integration.connected
            ? normalizeAIConfig(settings.aiConfig)
            : null;

        setSelectedIntegration(integrationId);
        setTempKey(savedConfig?.provider === integration.provider ? savedConfig.apiKey : '');
        setTempModel(
            savedConfig?.provider === integration.provider
                ? savedConfig.model || ''
                : integration.provider === 'openai'
                    ? DEFAULT_OPENAI_MODEL
                    : DEFAULT_GEMINI_TEXT_MODEL,
        );
        setTempBaseUrl(savedConfig?.provider === integration.provider ? savedConfig.baseUrl || '' : '');
        setTempLiveTextModel(
            savedConfig?.provider === integration.provider
                ? savedConfig.liveTextModel || DEFAULT_GEMINI_TEXT_LIVE_MODEL
                : DEFAULT_GEMINI_TEXT_LIVE_MODEL,
        );
        setTempLiveAudioModel(
            savedConfig?.provider === integration.provider
                ? savedConfig.liveAudioModel || DEFAULT_GEMINI_AUDIO_LIVE_MODEL
                : DEFAULT_GEMINI_AUDIO_LIVE_MODEL,
        );
        setShowAdvanced(false);
        setShowApiModal(true);
        setShowKey(false);
        setTestStatus('idle');
        setTestMessage('');
    };

    const testGeminiConnection = async (draftConfig: AIConfig) => {
        const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${draftConfig.apiKey}`);
        const modelsData = await modelsResponse.json();
        if (!modelsResponse.ok) {
            throw new Error(modelsData.error?.message || t('integrations.connectionFailed'));
        }

        const availableModels = (modelsData.models || []).map((model: { name?: string }) => model.name || '');
        if (!matchesGeminiModel(availableModels, draftConfig.model || '')) {
            throw new Error(`${t('integrations.invalidTextModel')}: ${draftConfig.model}`);
        }
        if (!matchesGeminiModel(availableModels, draftConfig.liveTextModel || '')) {
            throw new Error(`${t('integrations.invalidLiveTextModel')}: ${draftConfig.liveTextModel}`);
        }
        if (!matchesGeminiModel(availableModels, draftConfig.liveAudioModel || '')) {
            throw new Error(`${t('integrations.invalidLiveAudioModel')}: ${draftConfig.liveAudioModel}`);
        }

        let textEndpoint = draftConfig.baseUrl?.trim();
        if (!textEndpoint) {
            textEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${draftConfig.model}:generateContent?key=${draftConfig.apiKey}`;
        } else if (!textEndpoint.includes('?key=')) {
            textEndpoint = `${textEndpoint}${textEndpoint.includes('?') ? '&' : '?'}key=${draftConfig.apiKey}`;
        }

        const response = await fetch(textEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: 'Reply with one word: ready' }],
                }],
                generationConfig: {
                    maxOutputTokens: 16,
                    temperature: 0,
                },
            }),
        });

        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.error?.message || t('integrations.connectionFailed'));
        }
    };

    const testOpenAIConnection = async (draftConfig: AIConfig) => {
        const testUrl = draftConfig.baseUrl || DEFAULT_OPENAI_BASE_URL;
        if (!isLikelyResponsesEndpoint(testUrl)) {
            throw new Error(t('integrations.responsesEndpointRequired'));
        }

        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${draftConfig.apiKey}`,
            },
            body: JSON.stringify({
                model: draftConfig.model || DEFAULT_OPENAI_MODEL,
                input: [{ role: 'user', content: [{ type: 'input_text', text: 'Reply with one word: ready' }] }],
                max_output_tokens: 16,
            }),
        });

        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.error?.message || t('integrations.connectionFailed'));
        }
    };

    const handleTestConnection = async () => {
        if (!selectedIntegrationObj || !tempKey.trim()) return;

        setTestStatus('testing');
        setTestMessage('');

        try {
            const draftConfig = buildDraftConfig(selectedIntegrationObj.provider, tempKey.trim());

            if (selectedIntegrationObj.provider === 'gemini') {
                await testGeminiConnection(draftConfig);
            } else {
                await testOpenAIConnection(draftConfig);
            }

            setTestStatus('success');
            setTestMessage(t('integrations.connectionSuccess'));
        } catch (error: unknown) {
            setTestStatus('error');
            setTestMessage(error instanceof Error ? error.message : t('integrations.connectionFailed'));
        }
    };

    const handleSaveKey = () => {
        if (!selectedIntegrationObj || !tempKey.trim()) return;

        const nextConfig = buildDraftConfig(selectedIntegrationObj.provider, tempKey.trim());
        updateSettings({ aiConfig: nextConfig });
        AIService.setProvider(nextConfig);

        setShowApiModal(false);
        setSelectedIntegration(null);
        setTempKey('');
        setTempModel('');
        setTempBaseUrl('');
        setTempLiveTextModel('');
        setTempLiveAudioModel('');
        setTestStatus('idle');
        setTestMessage('');
    };

    const handleDisconnect = (id: IntegrationId, event?: React.MouseEvent) => {
        event?.stopPropagation();
        const integration = availableIntegrations.find((item) => item.id === id);
        if (!integration?.provider) return;

        updateSettings({ aiConfig: { ...EMPTY_AI_CONFIG } });
        AIService.clearProvider();
    };

    const connectedIntegrations = availableIntegrations.filter((integration) => integration.connected);

    return (
        <div className="view-container">
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
                                onChange={(event) => changeLanguage(event.target.value as Language)}
                                className="bg-transparent font-semibold text-gray-900 dark:text-white border-none p-0 pr-8 focus:ring-0 cursor-pointer min-w-[140px]"
                            >
                                {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                                    <option key={code} value={code}>{name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <div className="tab-group bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-1.5 rounded-2xl inline-flex">
                        {[
                            { id: 'available', label: t('integrations.available'), icon: Zap },
                            { id: 'connected', label: t('integrations.connected'), icon: Check },
                            { id: 'settings', label: t('settings.title'), icon: Settings },
                        ].map((tab) => (
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
            {activeTab === 'available' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    {availableIntegrations.map((integration) => {
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
                                                {integration.connected ? (
                                                    <span className="badge badge-success shrink-0 backdrop-blur-md">
                                                        <Check size={12} /> {t('integrations.connected')}
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-gray-100/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-400 shrink-0 backdrop-blur-md">
                                                        {t('integrations.notConnected')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed line-clamp-2">
                                                {integration.description}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mb-5">
                                                {integration.features.map((feature) => (
                                                    <span
                                                        key={feature}
                                                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 text-xs font-medium text-gray-600 dark:text-gray-400"
                                                    >
                                                        {feature}
                                                    </span>
                                                ))}
                                            </div>
                                            {integration.connected ? (
                                                <div className="flex gap-2 w-full">
                                                    <button
                                                        onClick={(event) => handleDisconnect(integration.id, event)}
                                                        className="w-12 py-2.5 rounded-xl font-semibold flex items-center justify-center transition-all duration-300 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                                                        title={t('integrations.remove')}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleConnect(integration.id)}
                                                        className="flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                    >
                                                        <Settings size={18} /> {t('integrations.configure')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleConnect(integration.id)}
                                                    className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5"
                                                >
                                                    <Key size={18} /> {t('integrations.connect')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

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
                            {connectedIntegrations.map((integration) => {
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
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(event) => handleDisconnect(integration.id, event)}
                                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title={t('integrations.remove')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <button onClick={() => handleConnect(integration.id)} className="btn-secondary">
                                                    <Settings size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="space-y-6 animate-fade-in">
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

                    <div className="card glass-panel">
                        <h3 className="section-title flex items-center gap-2 mb-6">
                            <FileText size={20} className="text-blue-500" />
                            {t('integrations.setupGuide')}
                        </h3>

                        <div className="space-y-6">
                            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
                                        <Mic size={20} className="text-white" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Google Gemini</h4>
                                    {activeProvider === 'gemini' && <span className="badge badge-success text-xs"><Check size={12} /> {t('integrations.configured')}</span>}
                                </div>
                                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-medium">{t('integrations.howToSetup')}</p>
                                    <ol className="list-decimal list-inside space-y-2 ml-2">
                                        <li>{t('integrations.gemini.step1')}</li>
                                        <li>{t('integrations.gemini.step2')}</li>
                                        <li>{t('integrations.gemini.step3')}</li>
                                        <li>{t('integrations.gemini.step4')}</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showApiModal && selectedIntegrationObj && (
                <div className="modal-backdrop backdrop-blur-sm" onClick={() => setShowApiModal(false)}>
                    <div className="modal-panel w-full max-w-md p-0 overflow-hidden shadow-2xl shadow-black/20" onClick={(event) => event.stopPropagation()}>
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
                                        onChange={(event) => setTempKey(event.target.value)}
                                        className="input-field pl-10 pr-10 font-mono text-sm shadow-sm"
                                        placeholder={selectedIsGemini ? 'AIza...' : 'sk-proj-...'}
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
                                <div className="mt-3 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {showAdvanced ? t('integrations.hideAdvanced') : t('integrations.showAdvanced')}
                                    </button>
                                    <a
                                        href={selectedIntegrationObj.helpLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline inline-flex items-center gap-1 transition-colors"
                                    >
                                        {t('integrations.getKey')} <ExternalLink size={10} />
                                    </a>
                                </div>

                                {showAdvanced && (
                                    <div className="mt-4 space-y-4 p-4 rounded-xl relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800 border border-gray-200 dark:border-gray-700 shadow-inner">
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <Settings size={64} />
                                        </div>
                                        <div className="relative z-10 w-full mb-2">
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t('integrations.advancedParameters')}</div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                {t('integrations.textModelLabel')}
                                            </label>
                                            <input
                                                type="text"
                                                value={tempModel}
                                                onChange={(event) => setTempModel(event.target.value)}
                                                className="input-field text-sm w-full bg-white dark:bg-gray-900 shadow-sm"
                                                placeholder={selectedIsGemini ? DEFAULT_GEMINI_TEXT_MODEL : DEFAULT_OPENAI_MODEL}
                                            />
                                            <div className="text-[10px] text-gray-400 mt-1 pl-1">
                                                {t('integrations.textModelHelp')}
                                            </div>
                                        </div>

                                        {selectedIsGemini && (
                                            <>
                                                <div className="relative z-10 w-full">
                                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                        {t('integrations.liveTextModelLabel')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={tempLiveTextModel}
                                                        onChange={(event) => setTempLiveTextModel(event.target.value)}
                                                        className="input-field text-sm w-full bg-white dark:bg-gray-900 shadow-sm"
                                                        placeholder={DEFAULT_GEMINI_TEXT_LIVE_MODEL}
                                                    />
                                                    <div className="text-[10px] text-gray-400 mt-1 pl-1">
                                                        {t('integrations.liveTextModelHelp')}
                                                    </div>
                                                </div>

                                                <div className="relative z-10 w-full">
                                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                        {t('integrations.liveAudioModelLabel')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={tempLiveAudioModel}
                                                        onChange={(event) => setTempLiveAudioModel(event.target.value)}
                                                        className="input-field text-sm w-full bg-white dark:bg-gray-900 shadow-sm"
                                                        placeholder={DEFAULT_GEMINI_AUDIO_LIVE_MODEL}
                                                    />
                                                    <div className="text-[10px] text-gray-400 mt-1 pl-1">
                                                        {t('integrations.liveAudioModelHelp')}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div className="relative z-10 w-full">
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                {t('integrations.baseUrlLabel')}
                                            </label>
                                            <input
                                                type="text"
                                                value={tempBaseUrl}
                                                onChange={(event) => setTempBaseUrl(event.target.value)}
                                                className="input-field text-sm w-full bg-white dark:bg-gray-900 shadow-sm"
                                                placeholder={selectedIsGemini ? t('integrations.geminiEndpointPlaceholder') : DEFAULT_OPENAI_BASE_URL}
                                            />
                                            <div className="text-[10px] text-gray-400 mt-1 pl-1">
                                                {selectedIsGemini ? t('integrations.baseUrlHelpGemini') : t('integrations.baseUrlHelpOpenAI')}
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                    onClick={() => void handleTestConnection()}
                                    disabled={!tempKey.trim() || testStatus === 'testing'}
                                    className="btn-secondary justify-center w-full transition-all"
                                >
                                    <TestTube size={18} /> {t('integrations.testConnection')}
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowApiModal(false)} className="btn-ghost flex-1 justify-center transition-colors">{t('common.cancel')}</button>
                                    <button
                                        onClick={handleSaveKey}
                                        disabled={!tempKey.trim()}
                                        className="btn-primary flex-1 justify-center shadow-lg shadow-primary-500/20 transition-all hover:shadow-primary-500/40"
                                    >
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
