import React from 'react';
import { Menu, Moon, Sun, Calendar, Download, Settings, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
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
  const { t } = useLanguage();
  const [showImportExport, setShowImportExport] = React.useState(false);

  const getHeaderInfo = () => {
    switch (activeView) {
      case 'daily': return { title: t('nav.dailyPlanning'), subtitle: t('hourly.subtitle') }; // Reusing appropriate subtitle or generic
      case 'weekly': return { title: t('nav.weeklyPlanning'), subtitle: t('settings.subtitle') };
      case 'monthly': return { title: t('nav.monthlyPlanning'), subtitle: t('settings.subtitle') };
      case 'yearly': return { title: t('nav.yearlyPlanning'), subtitle: t('settings.subtitle') };
      case 'hourly': return { title: t('nav.hourlyPlanning'), subtitle: t('hourly.subtitle') };
      case 'notes': return { title: t('nav.smartNotes'), subtitle: t('settings.subtitle') };
      case 'goals': return { title: t('nav.goals'), subtitle: t('settings.subtitle') };
      case 'visual': return { title: t('nav.visualPlanning'), subtitle: t('settings.subtitle') };
      case 'budget': return { title: t('budget.title'), subtitle: t('budget.subtitle') };
      case 'invoicing': return { title: t('invoicing.title'), subtitle: t('invoicing.subtitle') };
      case 'pomodoro': return { title: t('nav.pomodoroTimer'), subtitle: t('settings.subtitle') };
      case 'statistics': return { title: t('nav.statistics'), subtitle: t('settings.subtitle') };
      case 'integrations': return { title: t('nav.integrations'), subtitle: t('settings.subtitle') };
      case 'settings': return { title: t('settings.title'), subtitle: t('settings.subtitle') };
      default: return { title: 'ContentPlanner Pro', subtitle: 'Manage your life' };
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
                      ContentPlanner
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
