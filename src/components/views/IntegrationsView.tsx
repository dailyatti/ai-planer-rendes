import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Key,
  Link2,
  RefreshCw,
  Settings,
  TestTube,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useLanguage, LANGUAGE_NAMES, Language } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';
import { AIService } from '../../services/AIService';
import {
  DEFAULT_PERPLEXITY_BASE_URL,
  DEFAULT_PERPLEXITY_MODEL,
  EMPTY_AI_CONFIG,
  normalizeAIConfig,
} from '../../config/aiDefaults';
import { AIConfig } from '../../types/ai';

const IntegrationsView: React.FC = () => {
  const { language, changeLanguage, t } = useLanguage();
  const { settings, updateSettings } = useSettings();

  const [showModal, setShowModal] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [tempModel, setTempModel] = useState(DEFAULT_PERPLEXITY_MODEL);
  const [tempBaseUrl, setTempBaseUrl] = useState(DEFAULT_PERPLEXITY_BASE_URL);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const isConnected = settings.aiConfig?.provider === 'perplexity' && Boolean(settings.aiConfig.apiKey);
  const activeConfig = useMemo(() => normalizeAIConfig(settings.aiConfig), [settings.aiConfig]);

  const openModal = () => {
    setTempKey(isConnected ? activeConfig.apiKey : '');
    setTempModel(isConnected ? (activeConfig.model || DEFAULT_PERPLEXITY_MODEL) : DEFAULT_PERPLEXITY_MODEL);
    setTempBaseUrl(isConnected ? (activeConfig.baseUrl || DEFAULT_PERPLEXITY_BASE_URL) : DEFAULT_PERPLEXITY_BASE_URL);
    setShowKey(false);
    setShowAdvanced(false);
    setTestStatus('idle');
    setTestMessage('');
    setShowModal(true);
  };

  const buildDraftConfig = (): AIConfig => normalizeAIConfig({
    provider: 'perplexity',
    apiKey: tempKey.trim(),
    model: tempModel.trim(),
    baseUrl: tempBaseUrl.trim(),
  });

  const handleTestConnection = async () => {
    if (!tempKey.trim()) return;
    setTestStatus('testing');
    setTestMessage('');

    try {
      const draftConfig = buildDraftConfig();
      const response = await fetch(draftConfig.baseUrl || DEFAULT_PERPLEXITY_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${draftConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: draftConfig.model || DEFAULT_PERPLEXITY_MODEL,
          messages: [{ role: 'user', content: 'Reply with one word: ready' }],
          max_tokens: 16,
          temperature: 0,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || t('integrations.connectionFailed'));
      }

      setTestStatus('success');
      setTestMessage(t('integrations.connectionSuccess'));
    } catch (error: unknown) {
      setTestStatus('error');
      setTestMessage(error instanceof Error ? error.message : t('integrations.connectionFailed'));
    }
  };

  const handleSave = () => {
    if (!tempKey.trim()) return;
    const nextConfig = buildDraftConfig();
    updateSettings({ aiConfig: nextConfig });
    AIService.setProvider(nextConfig);
    setShowModal(false);
  };

  const handleDisconnect = () => {
    updateSettings({ aiConfig: { ...EMPTY_AI_CONFIG } });
    AIService.clearProvider();
  };

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
      </div>

      <div className="max-w-2xl">
        <div className="card hover-lift glass-panel border border-white/20 dark:border-gray-700/30">
          <div className="flex items-start gap-5">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg ring-4 ring-white/10">
              <Settings size={28} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2 gap-3">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">Perplexity Sonar Pro</h3>
                {isConnected ? (
                  <span className="badge badge-success shrink-0">
                    <Check size={12} /> {t('integrations.connected')}
                  </span>
                ) : (
                  <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 shrink-0">
                    {t('integrations.notConnected')}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                Unified web-aware AI provider. Model is editable, default is <span className="font-mono">sonar-pro</span>.
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Web-native answers
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Sonar Pro model
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Editable endpoint
                </span>
              </div>

              <div className="flex gap-2 w-full">
                <button
                  onClick={openModal}
                  className={`${isConnected ? 'btn-secondary' : 'btn-primary'} flex-1 justify-center`}
                >
                  {isConnected ? t('integrations.edit') : t('integrations.connect')}
                </button>
                {isConnected && (
                  <button
                    onClick={handleDisconnect}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title={t('integrations.remove')}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="modal-panel w-full max-w-md p-0 overflow-hidden shadow-2xl shadow-black/20" onClick={(event) => event.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-md">
                    <Settings size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('integrations.configure')}</h3>
                    <p className="text-xs text-gray-500 font-medium">Perplexity Sonar Pro</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
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
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={tempKey}
                    onChange={(event) => setTempKey(event.target.value)}
                    className="input-field pl-10 pr-10 font-mono text-sm shadow-sm"
                    placeholder="pplx-..."
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
                    href="https://www.perplexity.ai/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline inline-flex items-center gap-1 transition-colors"
                  >
                    {t('integrations.getKey')} <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {showAdvanced && (
                <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800 border border-gray-200 dark:border-gray-700 shadow-inner">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Model</label>
                    <input
                      type="text"
                      value={tempModel}
                      onChange={(event) => setTempModel(event.target.value)}
                      className="input-field text-sm w-full bg-white dark:bg-gray-900 shadow-sm"
                      placeholder={DEFAULT_PERPLEXITY_MODEL}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Base URL</label>
                    <input
                      type="text"
                      value={tempBaseUrl}
                      onChange={(event) => setTempBaseUrl(event.target.value)}
                      className="input-field text-sm w-full bg-white dark:bg-gray-900 shadow-sm"
                      placeholder={DEFAULT_PERPLEXITY_BASE_URL}
                    />
                  </div>
                </div>
              )}

              {testStatus !== 'idle' && (
                <div className={`p-3 rounded-lg flex items-center gap-3 ${
                  testStatus === 'testing'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800'
                    : testStatus === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800'
                }`}>
                  {testStatus === 'testing' && <RefreshCw size={18} className="animate-spin" />}
                  {testStatus === 'success' && <CheckCircle2 size={18} />}
                  {testStatus === 'error' && <XCircle size={18} />}
                  <span className="text-sm font-semibold">{testStatus === 'testing' ? t('integrations.testing') : testMessage}</span>
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
                  <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 justify-center">{t('common.cancel')}</button>
                  <button onClick={handleSave} disabled={!tempKey.trim()} className="btn-primary flex-1 justify-center">
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
