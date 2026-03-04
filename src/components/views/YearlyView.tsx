import React, { useState, useMemo } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight, TrendingUp, Target, CheckCircle, Calendar, Circle, Trash2, Edit2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';

const YearlyView: React.FC = () => {
  const { plans, goals, updatePlan, deletePlan } = useData();
  const { t } = useLanguage();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const monthKeys = [
    'months.january', 'months.february', 'months.march', 'months.april', 'months.may', 'months.june',
    'months.july', 'months.august', 'months.september', 'months.october', 'months.november', 'months.december'
  ];

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentYear(prev => prev + (direction === 'next' ? 1 : -1));
    setSelectedMonth(null);
  };

  // Memoize month data to avoid recalculating on every render
  const monthDataMap = useMemo(() => {
    const map: Record<number, { total: number; completed: number; completionRate: number; plans: typeof plans }> = {};
    for (let i = 0; i < 12; i++) {
      const monthPlans = plans.filter(plan => {
        if (!plan.date) return false;
        const planDate = new Date(plan.date);
        return planDate.getFullYear() === currentYear && planDate.getMonth() === i;
      });
      const completed = monthPlans.filter(plan => plan.completed).length;
      const total = monthPlans.length;
      map[i] = {
        total,
        completed,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        plans: monthPlans,
      };
    }
    return map;
  }, [plans, currentYear]);

  const handleMonthClick = (monthIndex: number) => {
    setSelectedMonth(selectedMonth === monthIndex ? null : monthIndex);
  };

  const yearlyGoals = goals.filter(goal => {
    if (!goal.targetDate) return false;
    const targetYear = new Date(goal.targetDate).getFullYear();
    return targetYear === currentYear;
  });

  const yearlyStats = useMemo(() => {
    const totalPlans = plans.filter(plan => plan.date && new Date(plan.date).getFullYear() === currentYear).length;
    const completedPlans = plans.filter(plan =>
      plan.date && new Date(plan.date).getFullYear() === currentYear && plan.completed
    ).length;
    return {
      totalPlans,
      completedPlans,
      activeGoals: yearlyGoals.filter(goal => goal.status === 'in-progress').length,
      completedGoals: yearlyGoals.filter(goal => goal.status === 'completed').length,
    };
  }, [plans, currentYear, yearlyGoals]);

  const yearlyCompletionRate = yearlyStats.totalPlans > 0
    ? (yearlyStats.completedPlans / yearlyStats.totalPlans) * 100
    : 0;

  const getPriorityBg = (priority: string, completed: boolean) => {
    if (completed) return 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500';
    switch (priority) {
      case 'high': return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
      case 'medium': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
      case 'low': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';
      default: return 'bg-gray-100 dark:bg-gray-700/50 text-gray-600';
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="view-container">
      {/* Header Section */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="view-title flex items-center gap-2 md:gap-3">
              <CalendarCheck className="text-red-500 w-6 h-6 md:w-8 md:h-8" />
              {t('yearly.title')}
            </h1>
            <p className="view-subtitle">
              {t('yearly.subtitle')}
            </p>
          </div>

          {/* Year Navigation */}
          <div className="flex items-center gap-3 md:gap-4">
            <motion.button
              onClick={() => navigateYear('prev')}
              className="touch-target p-2 md:p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Previous year"
            >
              <ChevronLeft size={20} className="md:w-6 md:h-6" />
            </motion.button>

            <div className="text-center min-w-20 md:min-w-24">
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {currentYear}
              </div>
            </div>

            <motion.button
              onClick={() => navigateYear('next')}
              className="touch-target p-2 md:p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Next year"
            >
              <ChevronRight size={20} className="md:w-6 md:h-6" />
            </motion.button>
          </div>
        </div>

        {/* Yearly Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { value: yearlyStats.totalPlans, label: t('yearly.stats.totalPlans'), icon: <CalendarCheck size={20} className="opacity-80 md:w-6 md:h-6" />, gradient: 'from-blue-500 to-purple-500' },
            { value: `${Math.round(yearlyCompletionRate)}%`, label: t('yearly.stats.completion'), icon: <TrendingUp size={20} className="opacity-80 md:w-6 md:h-6" />, gradient: 'from-emerald-500 to-teal-500' },
            { value: yearlyStats.activeGoals, label: t('yearly.stats.activeGoals'), icon: <Target size={20} className="opacity-80 md:w-6 md:h-6" />, gradient: 'from-orange-500 to-red-500' },
            { value: yearlyStats.completedGoals, label: t('yearly.stats.achieved'), icon: <CheckCircle size={20} className="opacity-80 md:w-6 md:h-6" />, gradient: 'from-purple-500 to-pink-500' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`card-compact bg-gradient-to-r ${stat.gradient} text-white border-none relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/5" />
              <div className="flex items-center justify-between relative">
                <div>
                  <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs md:text-sm opacity-90 mt-1">{stat.label}</div>
                </div>
                {stat.icon}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Monthly Grid - Interactive */}
      <div className="card mb-6 md:mb-8">
        <h3 className="section-title mb-4 md:mb-6">
          {t('yearly.monthly.title')}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
          {monthKeys.map((monthKey, index) => {
            const monthName = t(monthKey);
            const monthData = monthDataMap[index];
            const isCurrentMonth = new Date().getFullYear() === currentYear && new Date().getMonth() === index;
            const isSelected = selectedMonth === index;

            return (
              <motion.button
                key={monthKey}
                onClick={() => handleMonthClick(index)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`
                  p-3 md:p-4 rounded-xl border-2 transition-all duration-200
                  text-left w-full min-h-[120px] md:min-h-[140px]
                  ${isSelected
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-lg shadow-red-500/10 scale-[1.02]'
                    : isCurrentMonth
                      ? 'border-red-400 bg-red-50/50 dark:bg-red-900/10 shadow-md'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-red-300 hover:shadow-md'
                  }
                `}
              >
                <div className="text-center mb-2 md:mb-3">
                  <div className={`text-sm md:text-lg font-bold ${isSelected || isCurrentMonth ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {monthName.substring(0, 3)}
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {monthData.total} {monthData.total === 1 ? t('yearly.monthly.plan') : t('yearly.monthly.plans')}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                    <span>{t('yearly.monthly.progress')}</span>
                    <span className="font-semibold">{Math.round(monthData.completionRate)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 md:h-2 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${monthData.completionRate}%` }}
                      transition={{ type: 'spring', stiffness: 80, damping: 20, delay: index * 0.02 }}
                    />
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300">
                    {monthData.completed}/{monthData.total}
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-2 flex justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Selected Month Details — SCROLLABLE & INTERACTIVE */}
        <AnimatePresence>
          {selectedMonth !== null && (
            <motion.div
              className="mt-6 rounded-2xl border-2 border-red-200 dark:border-red-800 overflow-hidden"
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/15 dark:to-orange-900/15 border-b border-red-100 dark:border-red-800">
                <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="text-red-500 w-5 h-5 md:w-6 md:h-6" />
                  {t(monthKeys[selectedMonth])} {currentYear}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold ml-1">
                    {monthDataMap[selectedMonth].total} feladat
                  </span>
                </h4>
                <motion.button
                  onClick={() => setSelectedMonth(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={18} />
                </motion.button>
              </div>

              {/* Scrollable Task List */}
              {monthDataMap[selectedMonth].plans.length > 0 ? (
                <div className="max-h-80 overflow-y-auto overscroll-contain p-3 space-y-2 bg-white/50 dark:bg-gray-800/50 custom-scrollbar-yearly">
                  {monthDataMap[selectedMonth].plans.map((plan, idx) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`flex items-center gap-3 p-3 rounded-xl group/item transition-all hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-600 ${getPriorityBg(plan.priority, plan.completed)
                        } ${plan.completed ? 'line-through' : ''}`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getPriorityDot(plan.priority)}`} />
                      <button
                        onClick={() => updatePlan(plan.id, { completed: !plan.completed })}
                        className="flex-shrink-0 transition-colors"
                      >
                        {plan.completed ? <CheckCircle size={16} /> : <Circle size={16} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm md:text-base font-medium truncate ${plan.completed ? 'text-gray-400 dark:text-gray-500' : ''
                          }`}>
                          {plan.title}
                        </div>
                        {plan.date && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(plan.date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full flex-shrink-0 font-medium ${plan.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          plan.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                        {plan.priority === 'high' ? t('daily.highPriority') :
                          plan.priority === 'medium' ? t('daily.mediumPriority') :
                            t('daily.lowPriority')}
                      </div>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="flex-shrink-0 opacity-0 group-hover/item:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-white/50 dark:bg-gray-800/50">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-400 dark:text-gray-500">{t('yearly.monthly.noPlans')}</p>
                </div>
              )}

              {/* Panel Footer — Progress */}
              {monthDataMap[selectedMonth].total > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-white/30 dark:bg-gray-800/30 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${monthDataMap[selectedMonth].completionRate}%` }}
                      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {monthDataMap[selectedMonth].completed}/{monthDataMap[selectedMonth].total} ({Math.round(monthDataMap[selectedMonth].completionRate)}%)
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Goals Overview */}
      {yearlyGoals.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-4 md:mb-6 flex items-center gap-2">
            <Target className="text-red-500 w-5 h-5 md:w-6 md:h-6" />
            {currentYear} {t('yearly.goals.title')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {yearlyGoals.map((goal, idx) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="card-compact hover:shadow-lg transition-all duration-200"
              >
                <h4 className="font-semibold text-sm md:text-base text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {goal.order !== undefined && <span className="text-red-500 mr-1.5">#{goal.order}</span>}
                  {goal.title}
                </h4>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                  {goal.description}
                </p>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{t('yearly.monthly.progress')}</span>
                    <span className="font-semibold">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 md:h-2 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      transition={{ type: 'spring', stiffness: 80, damping: 20, delay: idx * 0.03 }}
                    />
                  </div>
                </div>

                {/* Status and Date */}
                <div className="flex justify-between items-center text-xs">
                  <span className={`px-2.5 py-1 rounded-full font-medium ${goal.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                      goal.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        goal.status === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                    {goal.status === 'completed' ? t('yearly.goals.status.completed') :
                      goal.status === 'in-progress' ? t('yearly.goals.status.inProgress') :
                        goal.status === 'paused' ? t('yearly.goals.status.paused') : t('yearly.goals.status.notStarted')}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }) : t('goals.noDate')}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar-yearly::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar-yearly::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-yearly::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 9999px;
        }
        .custom-scrollbar-yearly::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
};

export default YearlyView;
