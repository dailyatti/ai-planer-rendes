import React, { useState, useRef, useEffect } from 'react';
import { Menu, Moon, Sun, Calendar, Download, Settings, Sparkles, Globe, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage, Language, LANGUAGE_NAMES } from '../contexts/LanguageContext';
import ImportExportModal from './common/ImportExportModal';

import { ViewType } from '../types/planner';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
  onSettingsClick?: () => void;
  activeView: ViewType;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, sidebarOpen, onSettingsClick, activeView }) => {
  const { isDark, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const [showImportExport, setShowImportExport] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Language flag/code mapping
  const languageFlags: Record<Language, string> = {
    en: '🇺🇸', hu: '🇭🇺', ro: '🇷🇴', sk: '🇸🇰', hr: '🇭🇷',
    de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', pl: '🇵🇱',
    cn: '🇨🇳', jp: '🇯🇵', pt: '🇵🇹', tr: '🇹🇷', ar: '🇸🇦',
    ru: '🇷🇺', hi: '🇮🇳', bn: '🇧🇩', ur: '🇵🇰', th: '🇹🇭',
    id: '🇮🇩', ko: '🇰🇷'
  };

  const getHeaderInfo = () => {
    switch (activeView) {
      case 'daily': return { title: t('daily.title'), subtitle: t('daily.subtitle') };
      case 'weekly': return { title: t('weekly.title'), subtitle: t('weekly.subtitle') };
      case 'monthly': return { title: t('monthly.title'), subtitle: t('monthly.subtitle') };
      case 'yearly': return { title: t('yearly.title'), subtitle: t('yearly.subtitle') };
      case 'hourly': return { title: t('hourly.title'), subtitle: t('hourly.subtitle') };
      case 'notes': return { title: t('notes.title'), subtitle: t('notes.subtitle') };
      case 'goals': return { title: t('goals.title'), subtitle: t('goals.subtitle') };
      case 'drawing': return { title: t('visual.title'), subtitle: t('visual.subtitle') };
      case 'budget': return { title: t('budget.title'), subtitle: t('budget.subtitle') };
      case 'invoicing': return { title: t('invoicing.title'), subtitle: t('invoicing.subtitle') };
      case 'pomodoro': return { title: t('pomodoro.title'), subtitle: t('pomodoro.subtitle') };
      case 'statistics': return { title: t('statistics.title'), subtitle: t('statistics.subtitle') };
      case 'integrations': return { title: t('integrations.title'), subtitle: t('integrations.subtitle') };
      case 'settings': return { title: t('settings.title'), subtitle: t('settings.subtitle') };
      default: return { title: 'Digital Planner Pro', subtitle: 'Manage your life' };

    }
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 md:static">
        {/* Glassmorphism Header */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 md:h-18">
              {/* Left Section */}
              <div className="flex items-center gap-3 md:gap-4">
                {/* Hamburger Menu (Mobile Only) */}
                <button
                  onClick={onMenuClick}
                  className="md:hidden p-2.5 rounded-xl text-gray-600 dark:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-800 
                           active:scale-95 transition-all duration-200 
                           min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={sidebarOpen}
                >
                  <Menu size={22} />
                </button>

                {/* Logo & Title */}
                <div className="flex items-center gap-3">
                  {/* Premium Gradient Logo */}
                  <div className="relative">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 
                                  shadow-lg shadow-primary-500/30">
                      <Calendar size={20} className="text-white" />
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 
                                  blur-lg opacity-30 -z-10 scale-110" />
                  </div>

                  {/* Desktop Title */}
                  <div className="hidden md:block">
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                      {title}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full 
                                     bg-gradient-to-r from-primary-500/10 to-secondary-500/10
                                     text-primary-600 dark:text-primary-400 text-xs font-semibold">
                        <Sparkles size={10} />
                        PRO
                      </span>
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {subtitle}
                    </p>
                  </div>

                  {/* Mobile Title */}
                  <div className="md:hidden">
                    <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                      Digital Planner Pro
                    </h1>
                  </div>
                </div>
              </div>

              {/* Right Section - Action Buttons */}
              <div className="flex items-center gap-1 md:gap-2">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="relative p-2.5 rounded-xl text-gray-600 dark:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-800 
                           active:scale-95 transition-all duration-200 
                           min-w-[44px] min-h-[44px] flex items-center justify-center
                           group"
                  title={isDark ? t('header.lightTheme') : t('header.darkTheme')}
                  aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                >
                  <div className="relative">
                    {isDark ? (
                      <Sun size={20} className="group-hover:text-warning-500 transition-colors" />
                    ) : (
                      <Moon size={20} className="group-hover:text-primary-500 transition-colors" />
                    )}
                  </div>
                </button>

                {/* Language Selector */}
                <div className="relative" ref={langDropdownRef}>
                  <button
                    onClick={() => setShowLangDropdown(!showLangDropdown)}
                    className="relative p-2.5 rounded-xl text-gray-600 dark:text-gray-300 
                             hover:bg-gray-100 dark:hover:bg-gray-800 
                             active:scale-95 transition-all duration-200 
                             min-w-[44px] min-h-[44px] flex items-center justify-center gap-1
                             group"
                    title={t('settings.language')}
                    aria-label="Change language"
                  >
                    <span className="text-lg">{languageFlags[language]}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showLangDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-80 overflow-y-auto">
                      {(Object.entries(LANGUAGE_NAMES) as [Language, string][]).map(([code, name]) => (
                        <button
                          key={code}
                          onClick={() => {
                            setLanguage(code);
                            setShowLangDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                            ${language === code ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          <span className="text-lg">{languageFlags[code]}</span>
                          <span>{name}</span>
                          {language === code && <Globe size={14} className="ml-auto text-primary-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Import/Export */}
                <button
                  onClick={() => setShowImportExport(true)}
                  className="p-2.5 rounded-xl text-gray-600 dark:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-800 
                           active:scale-95 transition-all duration-200 
                           min-w-[44px] min-h-[44px] flex items-center justify-center
                           group"
                  title={t('header.importExport')}
                  aria-label="Import or export data"
                >
                  <Download size={20} className="group-hover:text-accent-500 transition-colors" />
                </button>

                {/* Settings (Desktop Only) */}
                <button
                  onClick={onSettingsClick}
                  className="hidden md:flex p-2.5 rounded-xl text-gray-600 dark:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-800 
                           active:scale-95 transition-all duration-200 
                           min-w-[44px] min-h-[44px] items-center justify-center
                           group"
                  title={t('header.settings')}
                  aria-label="Open settings"
                >
                  <Settings size={20} className="group-hover:text-primary-500 group-hover:rotate-90 transition-all duration-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
      />
    </>
  );
};

export default Header;
