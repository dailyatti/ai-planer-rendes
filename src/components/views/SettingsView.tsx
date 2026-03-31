import React, { useState } from 'react';
import { Settings, Save, Download, Upload, Palette, Bell, Globe, Shield, Moon, Sun, RefreshCw, Users, FileJson, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { DateFormat, TimeZone, useSettings } from '../../contexts/SettingsContext';
import { CurrencyService } from '../../services/CurrencyService';
import { AVAILABLE_CURRENCIES } from '../../constants/currencyData';
// import { AIService } from '../../services/AIService';
import { DataTransferService } from '../../services/DataTransferService';
import { JsonProfile } from '../../types/planner';

type SettingsSection = 'general' | 'budget' | 'appearance' | 'notifications' | 'data' | 'network';

const SettingsView: React.FC = () => {
  const { budgetSettings, updateBudgetSettings, clearAllData } = useData();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSettings } = useSettings();
  const [tempSettings, setTempSettings] = useState(budgetSettings);
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(CurrencyService.getAllRates());
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [rateMessage, setRateMessage] = useState<string | null>(null);

  // Profiles State
  const [profiles, setProfiles] = useState<JsonProfile[]>(DataTransferService.getProfiles());
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<JsonProfile | null>(null);
  const [applyBudgetSettings, setApplyBudgetSettings] = useState(false);

  const currencies = AVAILABLE_CURRENCIES.map(c => c.code);
  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'en', name: t('lang.english'), nativeName: 'English' },
    { code: 'hu', name: t('lang.hungarian'), nativeName: 'Magyar' },
    { code: 'ro', name: t('lang.romanian'), nativeName: 'Română' },
    { code: 'sk', name: t('lang.slovak'), nativeName: 'Slovenčina' },
    { code: 'hr', name: t('lang.croatian'), nativeName: 'Hrvatski' },
    { code: 'de', name: t('lang.german'), nativeName: 'Deutsch' },
    { code: 'fr', name: t('lang.french'), nativeName: 'Français' },
    { code: 'es', name: t('lang.spanish'), nativeName: 'Español' },
    { code: 'it', name: t('lang.italian'), nativeName: 'Italiano' },
    { code: 'pl', name: t('lang.polish'), nativeName: 'Polski' },
    { code: 'cn', name: t('lang.chinese'), nativeName: '中文' },
    { code: 'jp', name: t('lang.japanese'), nativeName: '日本語' },
    { code: 'pt', name: t('lang.portuguese'), nativeName: 'Português' },
    { code: 'tr', name: t('lang.turkish'), nativeName: 'Türkçe' },
    { code: 'ar', name: t('lang.arabic'), nativeName: 'العربية' },
    { code: 'ru', name: t('lang.russian'), nativeName: 'Русский' },
    { code: 'hi', name: t('lang.hindi'), nativeName: 'हिन्दी' },
    { code: 'bn', name: t('lang.bengali'), nativeName: 'বাংলা' },
    { code: 'ur', name: t('lang.urdu'), nativeName: 'اردو' },
    { code: 'th', name: t('lang.thai'), nativeName: 'ไทย' },
    { code: 'id', name: t('lang.indonesian'), nativeName: 'Bahasa Indonesia' },
    { code: 'ko', name: t('lang.korean'), nativeName: '한국어' },
  ];


  const handleSaveBudgetSettings = () => {
    updateBudgetSettings(tempSettings);
  };

  const sections = [
    { id: 'general', label: t('settings.general'), icon: Settings },
    { id: 'budget', label: t('settings.budget'), icon: Globe },
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'data', label: t('settings.dataPrivacy'), icon: Shield },
    { id: 'network', label: 'Csapat Profilok', icon: Users },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Settings className="text-gray-600 dark:text-gray-400" size={32} />
          {t('settings.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as SettingsSection)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${activeSection === section.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {/* General Settings */}
            {activeSection === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('settings.general')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.language')}
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.nativeName} ({lang.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.timeZone')}
                    </label>
                    <select
                      value={settings.general.timeZone}
                      onChange={(e) => updateSettings({
                        general: { ...settings.general, timeZone: e.target.value as TimeZone }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="Europe/Budapest">Europe/Budapest</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Europe/Berlin">Europe/Berlin</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="Europe/Rome">Europe/Rome</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.dateFormat')}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="dateFormat"
                        value="MM/DD/YYYY"
                        className="mr-2"
                        checked={settings.general.dateFormat === 'MM/DD/YYYY'}
                        onChange={(e) => updateSettings({
                          general: { ...settings.general, dateFormat: e.target.value as DateFormat }
                        })}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{t('settings.dateFormatUS')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="dateFormat"
                        value="DD/MM/YYYY"
                        className="mr-2"
                        checked={settings.general.dateFormat === 'DD/MM/YYYY'}
                        onChange={(e) => updateSettings({
                          general: { ...settings.general, dateFormat: e.target.value as DateFormat }
                        })}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{t('settings.dateFormatEU')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="dateFormat"
                        value="YYYY-MM-DD"
                        className="mr-2"
                        checked={settings.general.dateFormat === 'YYYY-MM-DD'}
                        onChange={(e) => updateSettings({
                          general: { ...settings.general, dateFormat: e.target.value as DateFormat }
                        })}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{t('settings.dateFormatISO')}</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('settings.autoSave')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.autoSaveDesc')}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.general.autoSave}
                      onChange={(e) => updateSettings({
                        general: { ...settings.general, autoSave: e.target.checked }
                      })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Budget Settings */}
            {activeSection === 'budget' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('settings.budget')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.monthlyBudget')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tempSettings.monthlyBudget}
                      onChange={(e) => setTempSettings({ ...tempSettings, monthlyBudget: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.defaultCurrency')}
                    </label>
                    <select
                      value={tempSettings.currency}
                      onChange={(e) => setTempSettings({ ...tempSettings, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      {currencies.map(currency => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.warningThreshold')} ({tempSettings.warningThreshold}%)
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={tempSettings.warningThreshold}
                    onChange={(e) => setTempSettings({ ...tempSettings, warningThreshold: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span>50%</span>
                    <span>95%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('settings.budgetNotifications')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.budgetNotificationsDesc')}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={tempSettings.notifications}
                      onChange={(e) => setTempSettings({ ...tempSettings, notifications: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Exchange Rates Section */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      💱 {t('settings.exchangeRates')}
                    </h4>

                    <button
                      onClick={async () => {
                        setIsFetchingRates(true);
                        setRateMessage(null);
                        const result = await CurrencyService.fetchRealTimeRates(true);
                        setRateMessage(result.message);
                        if (result.success) {
                          setExchangeRates(CurrencyService.getAllRates());
                        }
                        setIsFetchingRates(false);
                      }}
                      disabled={isFetchingRates}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {isFetchingRates ? (
                        <><span className="animate-spin">⏳</span> {t('settings.fetching')}</>
                      ) : (
                        <><RefreshCw size={16} /> {t('settings.refresh') || 'Frissítés'}</>
                      )}
                    </button>

                  </div>

                  {rateMessage && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${rateMessage.includes('frissítve') ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                      {rateMessage}
                    </div>
                  )}

                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {t('settings.baseCurrencyDesc').split('{currency}').join(tempSettings.currency)}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'CZK', 'RON', 'TRY'].filter(c => c !== tempSettings.currency).map(currency => (
                      <div key={currency} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="font-mono font-bold text-gray-700 dark:text-gray-300 w-12">{currency}</span>
                        <span className="text-gray-400">=</span>
                        <input
                          type="number"
                          step="0.01"
                          value={exchangeRates[currency] || ''}
                          onChange={(e) => {
                            const rate = parseFloat(e.target.value) || 0;
                            CurrencyService.setRate(currency, rate);
                            setExchangeRates({ ...exchangeRates, [currency]: rate });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-right font-mono w-20"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">{tempSettings.currency}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveBudgetSettings}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
                >
                  <Save size={16} />
                  {t('settings.saveBudgetSettings')}
                </button>
              </div>
            )}

            {/* Appearance Settings */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('settings.appearance')}</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    {t('settings.theme')}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={toggleTheme}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${!isDark
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                        }`}
                    >
                      <Sun size={24} className="mx-auto mb-2 text-yellow-500" />
                      <div className="font-medium text-gray-900 dark:text-white">{t('settings.lightTheme')}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.lightThemeDesc')}</div>
                    </button>

                    <button
                      onClick={toggleTheme}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${isDark
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                        }`}
                    >
                      <Moon size={24} className="mx-auto mb-2 text-blue-500" />
                      <div className="font-medium text-gray-900 dark:text-white">{t('settings.darkTheme')}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.darkThemeDesc')}</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.sidebarPosition')}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="radio" name="sidebarPosition" value="left" className="mr-2" defaultChecked />
                      <span className="text-gray-700 dark:text-gray-300">{t('settings.leftSide')}</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="sidebarPosition" value="right" className="mr-2" />
                      <span className="text-gray-700 dark:text-gray-300">{t('settings.rightSide')}</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('settings.compactMode')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.compactModeDesc')}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('settings.animations')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.animationsDesc')}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('settings.notificationSettings')}</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{t('settings.taskReminders')}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.taskRemindersDesc')}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{t('settings.goalMilestones')}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.goalMilestonesDesc')}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{t('settings.subscriptionPayments')}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.subscriptionPaymentsDesc')}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{t('settings.weeklySummary')}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.weeklySummaryDesc')}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.notificationTime')}
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                    <option value="09:00">9:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="18:00">6:00 PM</option>
                    <option value="20:00">8:00 PM</option>
                  </select>
                </div>
              </div>
            )}

            {/* Data & Privacy Settings */}
            {activeSection === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('settings.dataPrivacy')}</h3>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="text-blue-600 dark:text-blue-400" size={20} />
                    <span className="font-medium text-blue-900 dark:text-blue-100">{t('settings.privacyMatters')}</span>
                  </div>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    {t('settings.privacyDesc')}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{t('settings.analytics')}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.analyticsDesc')}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{t('settings.crashReports')}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.crashReportsDesc')}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.dataManagement')}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        const result = DataTransferService.exportAll();
                        if (!result.success) {
                          alert(t('settings.exportFailed') || 'Export failed');
                        }
                      }}
                      className="flex items-center justify-center gap-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <Download size={20} />
                      <span>{t('settings.exportAllData')}</span>
                    </button>

                    <label className="flex items-center justify-center gap-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer">
                      <Upload size={20} />
                      <span>{t('settings.importData')}</span>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (!confirm(t('settings.importConfirm') || 'Are you sure? This will overwrite all existing data!')) {
                            e.target.value = ''; // Reset input to allow re-selection of same file
                            return;
                          }

                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            try {
                              const json = JSON.parse(event.target?.result as string);
                              const result = await DataTransferService.importAll(json);
                              if (result.success) {
                                alert(result.message);
                                window.location.reload();
                              } else {
                                alert(t('settings.importFailed') || 'Import failed: ' + result.message);
                              }
                            } catch {
                              alert('Invalid JSON file');
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">{t('settings.dangerZone')}</h4>
                  <p className="text-red-700 dark:text-red-300 text-sm mb-4">
                    {t('settings.dangerZoneDesc')}
                  </p>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                    onClick={() => {
                      if (confirm(t('settings.clearAllDataConfirm') || 'Are you absolutely sure? This will permanently delete ALL your data!')) {
                        clearAllData();
                        window.location.reload();
                      }
                    }}
                  >
                    {t('settings.clearAllData')}
                  </button>
                </div>
              </div>
            )}

            {/* Network / Profiles Settings */}
            {activeSection === 'network' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Csapat Profilok Kezelése</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Itt töltheted fel és kezelheted a csapattársaid vagy más felhasználók kimentett JSON profiljait.
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <FileJson size={18} /> Mentett Profilok
                    </h4>
                    <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors flex items-center gap-2">
                      <Upload size={16} />
                      <span>Új Profil Feltöltése</span>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          e.target.value = ''; // reset

                          const name = prompt('Add meg a profil nevét (pl. Attila jsonja):', file.name.replace('.json', ''));
                          if (!name) return;

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              JSON.parse(event.target?.result as string); // Validate
                              const success = DataTransferService.saveProfile(name, event.target?.result as string);
                              if (success) {
                                setProfiles(DataTransferService.getProfiles());
                              } else {
                                alert('Nem sikerült menteni a profilt. Lehet, hogy betelt a tárhely.');
                              }
                            } catch {
                              alert('Érvénytelen JSON fájl!');
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                  </div>

                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {profiles.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Még nincsenek elmentett profilok.
                      </div>
                    ) : (
                      profiles.map(profile => (
                        <div key={profile.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{profile.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Hozzáadva: {new Date(profile.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedProfile(profile);
                                setApplyBudgetSettings(false); // Default: don't overwrite budget
                                setShowProfileModal(true);
                              }}
                              className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1 text-sm font-medium"
                            >
                              <CheckCircle size={14} /> Alkalmaz
                            </button>
                            <button
                              onClick={() => {
                                const newName = prompt('Új név:', profile.name);
                                if (newName && newName.trim()) {
                                  DataTransferService.renameProfile(profile.id, newName.trim());
                                  setProfiles(DataTransferService.getProfiles());
                                }
                              }}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Átnevez"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Biztosan törlöd a(z) ${profile.name} profilt?`)) {
                                  DataTransferService.deleteProfile(profile.id);
                                  setProfiles(DataTransferService.getProfiles());
                                }
                              }}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Törlés"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Tipp</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Zökkenőmentes adatcseréhez javasolt, hogy mielőtt valaki JSON-ját betöltenéd felülírással, a saját adataidból is készíts és ments el egy profilt ide, hogy visszatérhess rá!
                  </p>
                  <button 
                    onClick={() => {
                      DataTransferService.exportAll(); // Only to invoke local generation
                      // Wait, we don't want to download, we want to directly save
                      const data: Record<string, unknown> = {};
                      const prefixPlanner = 'planner-';
                      const prefixSequence = 'invoice_sequence_';
                      const prefixDigital = 'digitalplanner-';
                      const prefixContent = 'contentplanner-';

                      for (let i = 0; i < localStorage.length; i++) {
                          const key = localStorage.key(i);
                          if (key && (
                              key.startsWith(prefixPlanner) ||
                              key.startsWith(prefixSequence) ||
                              key.startsWith(prefixDigital) ||
                              key.startsWith(prefixContent)
                          )) {
                              data[key] = localStorage.getItem(key);
                          }
                      }
                      const name = prompt('Milyen néven mentsem el a jelenlegi bázisodat?', 'Saját mentés');
                      if(name) {
                        DataTransferService.saveProfile(name, JSON.stringify(data));
                        setProfiles(DataTransferService.getProfiles());
                      }
                    }}
                    className="mt-3 text-sm bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:hover:bg-yellow-800 text-yellow-800 dark:text-yellow-100 px-4 py-2 rounded transition-colors"
                  >
                    Jelenlegi állapot mentése új profilként
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Profile Apply Modal */}
      {showProfileModal && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profil Alkalmazása: {selectedProfile.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hogyan szeretnéd betölteni ezeket az adatokat?</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 mb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={applyBudgetSettings}
                    onChange={(e) => setApplyBudgetSettings(e.target.checked)}
                    className="mt-1 flex-shrink-0"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">A profilban szereplő költségvetés betöltése</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Ha bekapcsolod, a jelenlegi költségvetési beállításaid felülíródnak a profil tulajdonosának adataival. Ha kikapcsolod, a Te jelenlegi költségvetésed marad érvényben az új adatok mellett is.
                    </div>
                  </div>
                </label>
              </div>

              <button
                onClick={async () => {
                  if (confirm('Biztosan felülírod a jelenlegi adataidat ezzel a profillal? Minden korábbi listád törlődik!')) {
                    try {
                      // Save current budget if we need to keep it
                      const currentBudget = localStorage.getItem('planner-budget-settings');
                      
                      const data = JSON.parse(selectedProfile.data);
                      await DataTransferService.importAll(data);
                      
                      // Restore current budget if the checkbox was UNCHECKED
                      if (!applyBudgetSettings && currentBudget) {
                        localStorage.setItem('planner-budget-settings', currentBudget);
                      }
                      
                      window.location.reload();
                    } catch (e) {
                      alert('Hiba történt a profil betöltésekor.');
                    }
                  }
                }}
                className="w-full text-left p-4 rounded-xl border-2 border-transparent bg-red-50 hover:border-red-500 dark:bg-red-900/20 transition-all group"
              >
                <div className="font-semibold text-red-700 dark:text-red-400 mb-1 group-hover:text-red-800">
                  ⚠️ Teljes Csere (Minden korábbi adat törlése)
                </div>
                <div className="text-sm text-red-600/80 dark:text-red-300">
                  Töröl minden jelenlegi adatot (kivéve a költségvetést, ha azt felül fentről kikapcsoltad), és betölti az új profil tartalmát.
                </div>
              </button>

              <button
                onClick={async () => {
                  if (confirm('A meglévő adataid mellé fűzzük a profil tartalmát?')) {
                    try {
                      const data = JSON.parse(selectedProfile.data);
                      
                      // If user checked the box to apply the budget from the JSON, we need to manually extract it and apply it alongside the merge
                      if (applyBudgetSettings && data['planner-budget-settings']) {
                        localStorage.setItem('planner-budget-settings', typeof data['planner-budget-settings'] === 'string' ? data['planner-budget-settings'] : JSON.stringify(data['planner-budget-settings']));
                      }
                      
                      await DataTransferService.importMerge(data);
                      window.location.reload();
                    } catch (e) {
                      alert('Hiba történt az összefűzéskor.');
                    }
                  }
                }}
                className="w-full text-left p-4 rounded-xl border-2 border-transparent bg-blue-50 hover:border-blue-500 dark:bg-blue-900/20 transition-all group"
              >
                <div className="font-semibold text-blue-700 dark:text-blue-400 mb-1 group-hover:text-blue-800">
                  ➕ Hozzáadás / Összefűzés (Merge)
                </div>
                <div className="text-sm text-blue-600/80 dark:text-blue-300">
                  Bemásolja a tranzakciókat és a feladatokat az új profilból a Te jelenlegi listáid végére.
                </div>
              </button>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setSelectedProfile(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
