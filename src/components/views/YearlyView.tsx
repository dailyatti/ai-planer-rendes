import React, { useState, useMemo } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight, TrendingUp, CheckCircle, Calendar, Circle, Trash2, Pencil, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlanItem } from '../../types/planner';

const YearlyView: React.FC = () => {
  const { plans, updatePlan, deletePlan } = useData();
  const { t } = useLanguage();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Edit/Add modal state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // Modal Standardization & Persistence
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetEditForm();
    };
    if (showEditForm) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showEditForm]);

  React.useEffect(() => {
    if (showEditForm && !editingPlan) {
      localStorage.setItem('yearly-plan-draft', JSON.stringify(editFormData));
    }
  }, [showEditForm, editingPlan, editFormData]);

  React.useEffect(() => {
    const saved = localStorage.getItem('yearly-plan-draft');
    if (saved && !showEditForm) {
      try {
        const draft = JSON.parse(saved);
        setEditFormData(draft);
      } catch (e) {
        console.error("Failed to load yearly draft", e);
      }
    }
  }, [showEditForm]);

  const monthKeys = [
    'months.january', 'months.february', 'months.march', 'months.april', 'months.may', 'months.june',
    'months.july', 'months.august', 'months.september', 'months.october', 'months.november', 'months.december'
  ];

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentYear(prev => prev + (direction === 'next' ? 1 : -1));
    setSelectedMonth(null);
  };

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

  const yearlyStats = useMemo(() => {
    const monthlyEntries = Object.values(monthDataMap);
    const totalPlans = monthlyEntries.reduce((sum, month) => sum + month.total, 0);
    const completedPlans = monthlyEntries.reduce((sum, month) => sum + month.completed, 0);
    return {
      totalPlans,
      completedPlans,
      activeMonths: monthlyEntries.filter(month => month.total > 0).length,
    };
  }, [monthDataMap]);

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

  const handleEditPlan = (plan: PlanItem) => {
    setEditingPlan(plan);
    setEditFormData({
      title: plan.title,
      description: plan.description || '',
      priority: plan.priority,
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updatePlan(editingPlan.id, {
        title: editFormData.title,
        description: editFormData.description,
        priority: editFormData.priority,
      });
    }
    localStorage.removeItem('yearly-plan-draft');
    setShowEditForm(false);
    setEditingPlan(null);
    setEditFormData({ title: '', description: '', priority: 'medium' });
  };

  const resetEditForm = () => {
    setShowEditForm(false);
    setEditingPlan(null);
    setEditFormData({ title: '', description: '', priority: 'medium' });
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

          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => navigateYear('prev')}
              className="touch-target p-2 md:p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
            >
              <ChevronLeft size={20} className="md:w-6 md:h-6" />
            </button>

            <div className="text-center min-w-20 md:min-w-24">
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {currentYear}
              </div>
            </div>

            <button
              onClick={() => navigateYear('next')}
              className="touch-target p-2 md:p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
            >
              <ChevronRight size={20} className="md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* Yearly Statistics Cards — NO entrance animations */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="card-compact bg-gradient-to-r from-blue-500 to-purple-500 text-white border-none relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5" />
            <div className="flex items-center justify-between relative">
              <div>
                <div className="text-xl md:text-2xl font-bold">{yearlyStats.totalPlans}</div>
                <div className="text-xs md:text-sm opacity-90 mt-1">{t('yearly.stats.totalPlans')}</div>
              </div>
              <CalendarCheck size={20} className="opacity-80 md:w-6 md:h-6" />
            </div>
          </div>

          <div className="card-compact bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-none relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5" />
            <div className="flex items-center justify-between relative">
              <div>
                <div className="text-xl md:text-2xl font-bold">{Math.round(yearlyCompletionRate)}%</div>
                <div className="text-xs md:text-sm opacity-90 mt-1">{t('yearly.stats.completion')}</div>
              </div>
              <TrendingUp size={20} className="opacity-80 md:w-6 md:h-6" />
            </div>
          </div>

          <div className="card-compact bg-gradient-to-r from-orange-500 to-red-500 text-white border-none relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5" />
            <div className="flex items-center justify-between relative">
              <div>
                <div className="text-xl md:text-2xl font-bold">{yearlyStats.completedPlans}</div>
                <div className="text-xs md:text-sm opacity-90 mt-1">{t('yearly.stats.completedPlans')}</div>
              </div>
              <CheckCircle size={20} className="opacity-80 md:w-6 md:h-6" />
            </div>
          </div>

          <div className="card-compact bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5" />
            <div className="flex items-center justify-between relative">
              <div>
                <div className="text-xl md:text-2xl font-bold">{yearlyStats.activeMonths}</div>
                <div className="text-xs md:text-sm opacity-90 mt-1">{t('yearly.stats.activeMonths')}</div>
              </div>
              <Calendar size={20} className="opacity-80 md:w-6 md:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      <AnimatePresence>
        {showEditForm && editingPlan && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetEditForm}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t('common.edit')}
              </h3>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('daily.taskTitle')}
                  </label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('daily.taskDescription')}
                  </label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('daily.priority')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, priority: level })}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${editFormData.priority === level
                          ? level === 'high'
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                            : level === 'medium'
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                              : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                          }`}
                      >
                        {level === 'high' ? t('daily.highPriority') :
                          level === 'medium' ? t('daily.mediumPriority') :
                            t('daily.lowPriority')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white py-2.5 px-4 rounded-xl font-medium shadow-md hover:shadow-lg transition-shadow"
                  >
                    {t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={resetEditForm}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 px-4 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly Grid — NO entrance animations */}
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
              <button
                key={monthKey}
                onClick={() => handleMonthClick(index)}
                className={`
                  p-3 md:p-4 rounded-xl border-2 transition-all duration-200
                  text-left w-full min-h-[120px] md:min-h-[140px]
                  ${isSelected
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-lg'
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
                    {monthData.total} {monthData.total === 1 ? t('weekly.task') : t('weekly.tasks')}
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                    <span>{t('yearly.monthly.progress')}</span>
                    <span className="font-semibold">{Math.round(monthData.completionRate)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 md:h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${monthData.completionRate}%` }}
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
              </button>
            );
          })}
        </div>

        {/* Selected Month Details — SCROLLABLE & INTERACTIVE with EDIT */}
        <AnimatePresence>
          {selectedMonth !== null && (
            <motion.div
              className="mt-6 rounded-2xl border-2 border-red-200 dark:border-red-800 overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/15 dark:to-orange-900/15 border-b border-red-100 dark:border-red-800">
                <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="text-red-500 w-5 h-5 md:w-6 md:h-6" />
                  {t(monthKeys[selectedMonth])} {currentYear}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold ml-1">
                    {monthDataMap[selectedMonth].total} {t('weekly.tasks')}
                  </span>
                </h4>
                <button
                  onClick={() => setSelectedMonth(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Task List */}
              {monthDataMap[selectedMonth].plans.length > 0 ? (
                <div className="max-h-80 overflow-y-auto overscroll-contain p-3 space-y-2 bg-white/50 dark:bg-gray-800/50">
                  {monthDataMap[selectedMonth].plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`flex items-center gap-3 p-3 rounded-xl group/item transition-all hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-600 cursor-pointer ${getPriorityBg(plan.priority, plan.completed)
                        } ${plan.completed ? 'line-through' : ''}`}
                      onClick={() => handleEditPlan(plan)}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getPriorityDot(plan.priority)}`} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePlan(plan.id, { completed: !plan.completed });
                        }}
                        className="flex-shrink-0 transition-colors"
                      >
                        {plan.completed ? <CheckCircle size={16} /> : <Circle size={16} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm md:text-base font-medium truncate ${plan.completed ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                          {plan.title}
                        </div>
                        {plan.date && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(plan.date).toLocaleDateString(navigator.language, { month: 'short', day: 'numeric' })}
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
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditPlan(plan); }}
                          className="opacity-0 group-hover/item:opacity-100 p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                          className="opacity-0 group-hover/item:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-white/50 dark:bg-gray-800/50">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-400 dark:text-gray-500">{t('yearly.monthly.noPlans')}</p>
                </div>
              )}

              {/* Panel Footer */}
              {monthDataMap[selectedMonth].total > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-white/30 dark:bg-gray-800/30 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${monthDataMap[selectedMonth].completionRate}%` }}
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

    </div>
  );
};

export default YearlyView;
