import React, { useState } from 'react';
import { Settings, Save, Download, Upload, Palette, Bell, Globe, Shield, User, Moon, Sun } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';

const SettingsView: React.FC = () => {
  const { budgetSettings, updateBudgetSettings } = useData();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSettings, resetSettings, exportSettings, importSettings } = useSettings();
  const [tempSettings, setTempSettings] = useState(budgetSettings);
  const [activeSection, setActiveSection] = useState<'general' | 'budget' | 'appearance' | 'notifications' | 'data'>('general');

  const currencies = ['USD', 'EUR', 'GBP', 'HUF', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK'];
  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'en', name: t('lang.english'), nativeName: 'English' },
    { code: 'hu', name: t('lang.hungarian'), nativeName: 'Magyar' },
    { code: 'de', name: t('lang.german'), nativeName: 'Deutsch' },
    { code: 'fr', name: t('lang.french'), nativeName: 'Français' },
    { code: 'es', name: t('lang.spanish'), nativeName: 'Español' },
    { code: 'it', name: t('lang.italian'), nativeName: 'Italiano' },
  ];
  const themes = ['System', 'Light', 'Dark', 'Auto'];

  const handleSaveBudgetSettings = () => {
    updateBudgetSettings(tempSettings);
  };

  const sections = [
    { id: 'general', label: t('settings.general'), icon: Settings },
    { id: 'budget', label: t('settings.budget'), icon: Globe },
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'data', label: t('settings.dataPrivacy'), icon: Shield },
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
                    onClick={() => setActiveSection(section.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                      activeSection === section.id
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
                        general: { ...settings.general, timeZone: e.target.value as any } 
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
                          general: { ...settings.general, dateFormat: e.target.value as any } 
                        })}
                      />
                      <span className="text-gray-700 dark:text-gray-300">MM/DD/YYYY (US Format)</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="dateFormat" 
                        value="DD/MM/YYYY" 
                        className="mr-2" 
                        checked={settings.general.dateFormat === 'DD/MM/YYYY'}
                        onChange={(e) => updateSettings({ 
                          general: { ...settings.general, dateFormat: e.target.value as any } 
                        })}
                      />
                      <span className="text-gray-700 dark:text-gray-300">DD/MM/YYYY (European Format)</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="dateFormat" 
                        value="YYYY-MM-DD" 
                        className="mr-2" 
                        checked={settings.general.dateFormat === 'YYYY-MM-DD'}
                        onChange={(e) => updateSettings({ 
                          general: { ...settings.general, dateFormat: e.target.value as any } 
                        })}
                      />
                      <span className="text-gray-700 dark:text-gray-300">YYYY-MM-DD (ISO Format)</span>
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
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Budget Settings</h3>
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
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Appearance Settings</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    {t('settings.theme')}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={toggleTheme}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        !isDark
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
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        isDark
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
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Data & Privacy</h3>
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
                    <button className="flex items-center justify-center gap-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      <Download size={20} />
                      <span>{t('settings.exportAllData')}</span>
                    </button>
                    
                    <button className="flex items-center justify-center gap-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      <Upload size={20} />
                      <span>{t('settings.importData')}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">{t('settings.dangerZone')}</h4>
                  <p className="text-red-700 dark:text-red-300 text-sm mb-4">
                    {t('settings.dangerZoneDesc')}
                  </p>
                  <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200">
                    {t('settings.clearAllData')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;