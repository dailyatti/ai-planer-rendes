import React from 'react';
import {
  Clock, Calendar, CalendarDays, CalendarRange,
  CalendarCheck, StickyNote, Target, Brush,
  DollarSign, Timer, BarChart3, FileText, Link2,
  X, Globe
} from 'lucide-react';
import { ViewType } from '../types/planner';
import { useLanguage, Language, LANGUAGE_NAMES } from '../contexts/LanguageContext';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, isOpen, onClose }) => {
  const { t, language, setLanguage } = useLanguage();

  // Language flag/code mapping
  const languageFlags: Record<Language, string> = {
    en: '🇺🇸', hu: '🇭🇺', ro: '🇷🇴', sk: '🇸🇰', hr: '🇭🇷',
    de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', pl: '🇵🇱',
    cn: '🇨🇳', jp: '🇯🇵', pt: '🇵🇹', tr: '🇹🇷', ar: '🇸🇦',
    ru: '🇷🇺', hi: '🇮🇳', bn: '🇧🇩', ur: '🇵🇰', th: '🇹🇭',
    id: '🇮🇩', ko: '🇰🇷'
  };

  const menuItems = [
    { id: 'hourly' as ViewType, label: t('nav.hourlyPlanning'), icon: Clock, color: 'from-blue-500 to-cyan-500' },
    { id: 'daily' as ViewType, label: t('nav.dailyPlanning'), icon: Calendar, color: 'from-green-500 to-emerald-500' },
    { id: 'weekly' as ViewType, label: t('nav.weeklyPlanning'), icon: CalendarDays, color: 'from-purple-500 to-violet-500' },
    { id: 'monthly' as ViewType, label: t('nav.monthlyPlanning'), icon: CalendarRange, color: 'from-orange-500 to-amber-500' },
    { id: 'yearly' as ViewType, label: t('nav.yearlyPlanning'), icon: CalendarCheck, color: 'from-red-500 to-rose-500' },
    { id: 'notes' as ViewType, label: t('nav.smartNotes'), icon: StickyNote, color: 'from-yellow-500 to-orange-400' },
    { id: 'goals' as ViewType, label: t('nav.goals'), icon: Target, color: 'from-teal-500 to-cyan-500' },
    { id: 'drawing' as ViewType, label: t('nav.visualPlanning'), icon: Brush, color: 'from-pink-500 to-rose-500' },
    { id: 'budget' as ViewType, label: t('nav.budgetTracker'), icon: DollarSign, color: 'from-emerald-500 to-green-500' },
    { id: 'invoicing' as ViewType, label: t('nav.invoicing'), icon: FileText, color: 'from-indigo-500 to-purple-500' },
    { id: 'pomodoro' as ViewType, label: t('nav.pomodoroTimer'), icon: Timer, color: 'from-rose-500 to-pink-500' },
    { id: 'statistics' as ViewType, label: t('nav.statistics'), icon: BarChart3, color: 'from-indigo-500 to-blue-500' },
    { id: 'integrations' as ViewType, label: t('nav.integrations'), icon: Link2, color: 'from-cyan-500 to-blue-500' },
  ];

  const handleItemClick = (viewId: ViewType) => {
    onViewChange(viewId);
    // Auto-close on mobile after selection
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay - Click to close */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static top-0 md:top-0 bottom-0 left-0 z-50 
          w-72 md:w-64 lg:w-72
          bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl 
          border-r border-gray-200/50 dark:border-gray-700/50 
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col
        `}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('nav.menu')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block px-4 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t('nav.navigation')}
          </h2>
        </div>

        {/* Navigation Menu */}
        <nav
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto hide-scrollbar"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`
                  relative w-full flex items-center gap-3 px-3 py-3 rounded-xl 
                  transition-all duration-200 text-left
                  min-h-[48px] group
                  ${isActive
                    ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/30 dark:to-primary-800/20'
                    : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/50'
                  }
                  active:scale-[0.98]
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active Indicator Line */}
                <div
                  className={`
                    absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full
                    bg-gradient-to-b ${item.color}
                    transition-all duration-300
                    ${isActive ? 'h-8 opacity-100' : 'h-0 opacity-0'}
                  `}
                />

                {/* Icon Container */}
                <div className={`
                  relative flex-shrink-0 p-2 rounded-lg transition-all duration-200
                  ${isActive
                    ? `bg-gradient-to-br ${item.color} shadow-lg`
                    : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                  }
                `}>
                  <Icon
                    size={18}
                    className={`
                      transition-colors duration-200
                      ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'}
                    `}
                  />
                  {/* Icon Glow */}
                  {isActive && (
                    <div className={`absolute inset-0 rounded-lg bg-gradient-to-br ${item.color} blur-lg opacity-40 -z-10`} />
                  )}
                </div>

                {/* Label */}
                <span className={`
                  font-medium text-sm truncate transition-colors duration-200
                  ${isActive
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                  }
                `}>
                  {item.label}
                </span>

                {/* Active Dot */}
                {isActive && (
                  <div className="ml-auto flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400 animate-pulse" />
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-3">
          {/* Language Selector */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100/50 dark:bg-gray-800/50">
            <Globe size={16} className="text-gray-500 dark:text-gray-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="flex-1 bg-transparent text-sm font-medium text-gray-700 dark:text-gray-300 
                         border-0 focus:ring-0 cursor-pointer"
            >
              {(Object.entries(LANGUAGE_NAMES) as [Language, string][]).map(([code, name]) => (
                <option key={code} value={code}>
                  {languageFlags[code]} {name}
                </option>
              ))}
            </select>
          </div>

          {/* Version Info */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/5 to-secondary-500/5 dark:from-primary-500/10 dark:to-secondary-500/10">
            <p className="text-xs font-semibold text-gray-900 dark:text-white">
              Digital Planner Pro
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              v1.1.9 • {t('nav.tagline')}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
