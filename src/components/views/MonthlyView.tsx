import React, { useState, useEffect, useRef } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Trash2, CheckCircle, Circle, X, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { PlanItem } from '../../types/planner';
import { useLanguage } from '../../contexts/LanguageContext';

// --- Habit Types (Matching HabitView) ---
type Habit = {
  id: string;
  name: string;
  createdAtISO: string;
  checkins: Record<string, { completed: boolean }>;
  isMastered?: boolean;
};

const MonthlyView: React.FC = () => {
  const { t } = useLanguage();
  const { plans, addPlan, updatePlan, deletePlan } = useData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const expandedRef = useRef<HTMLDivElement>(null);

  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // Modal Standardization & Persistence
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetForm();
    };
    if (showAddForm) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showAddForm]);

  useEffect(() => {
    if (showAddForm && !editingPlan) {
      localStorage.setItem('monthly-plan-draft', JSON.stringify(newPlan));
    }
  }, [showAddForm, editingPlan, newPlan]);

  useEffect(() => {
    const saved = localStorage.getItem('monthly-plan-draft');
    if (saved && !showAddForm) {
      try {
        const draft = JSON.parse(saved);
        setNewPlan(draft);
      } catch (e) {
        console.error("Failed to load monthly draft", e);
      }
    }
  }, [showAddForm]);

  useEffect(() => {
    const saved = localStorage.getItem('planner.habits.v2');
    if (saved) setHabits(JSON.parse(saved));
  }, []);

  // Click outside to close expanded panel
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (expandedRef.current && !expandedRef.current.contains(e.target as Node)) {
        setExpandedDay(null);
      }
    };
    if (expandedDay) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [expandedDay]);

  const monthNames = [
    t('months.january'), t('months.february'), t('months.march'), t('months.april'), t('months.may'), t('months.june'),
    t('months.july'), t('months.august'), t('months.september'), t('months.october'), t('months.november'), t('months.december')
  ];

  const dayNamesShort = [
    t('days.short.monday'), t('days.short.tuesday'), t('days.short.wednesday'), t('days.short.thursday'),
    t('days.short.friday'), t('days.short.saturday'), t('days.short.sunday')
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    const startDay = firstDay.getDay();
    startDate.setDate(startDate.getDate() - (startDay === 0 ? 6 : startDay - 1));
    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newDate);
    setExpandedDay(null);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const getPlansForDay = (date: Date) => {
    const dateStr = formatDate(date);
    return plans.filter((plan: PlanItem) =>
      plan.date && formatDate(plan.date) === dateStr
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPlan) {
      updatePlan(editingPlan.id, {
        title: newPlan.title,
        description: newPlan.description,
        priority: newPlan.priority,
      });
    } else if (selectedDay) {
      addPlan({
        title: newPlan.title,
        description: newPlan.description,
        date: selectedDay,
        completed: false,
        priority: newPlan.priority,
        linkedNotes: [],
      });
    }
    localStorage.removeItem('monthly-plan-draft');
    resetForm();
  };

  const resetForm = () => {
    setNewPlan({ title: '', description: '', priority: 'medium' });
    setShowAddForm(false);
    setSelectedDay(null);
    setEditingPlan(null);
  };

  const handleEditPlan = (plan: PlanItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlan(plan);
    setNewPlan({
      title: plan.title,
      description: plan.description || '',
      priority: plan.priority,
    });
    setShowAddForm(true);
  };

  const handleDeletePlan = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deletePlan(planId);
  };

  const days = getDaysInMonth(currentMonth);
  const isCurrentMonth = (date: Date) => date.getMonth() === currentMonth.getMonth();
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityBg = (priority: string, completed: boolean) => {
    if (completed) return 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500';
    switch (priority) {
      case 'high': return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
      case 'medium': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
      case 'low': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';
      default: return 'bg-gray-50 dark:bg-gray-700/50 text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <CalendarRange className="text-orange-500" size={32} />
              {t('monthly.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('monthly.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigateMonth('prev')}
              className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft size={20} />
            </motion.button>

            <div className="text-center min-w-48">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>
            </div>

            <motion.button
              onClick={() => navigateMonth('next')}
              className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight size={20} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showAddForm && (selectedDay || editingPlan) && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetForm}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingPlan ? t('common.edit') : t('weekly.addTask')}
                {selectedDay && !editingPlan && ` - ${selectedDay.toLocaleDateString()}`}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('daily.taskTitle')}
                  </label>
                  <input
                    type="text"
                    value={newPlan.title}
                    onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('daily.taskDescription')}
                  </label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('daily.priority')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setNewPlan({ ...newPlan, priority: level })}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${newPlan.priority === level
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
                  <motion.button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 px-4 rounded-xl font-medium shadow-md"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {editingPlan ? t('common.save') : t('weekly.addTask')}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 px-4 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t('common.cancel')}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600">
          {dayNamesShort.map((day) => (
            <div key={day} className="bg-gray-50 dark:bg-gray-750 dark:bg-gray-700 p-3 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{day}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600">
          {days.map((day) => {
            const dayPlans = getPlansForDay(day);
            const completedTasks = dayPlans.filter((plan: PlanItem) => plan.completed).length;
            const dayKey = formatDate(day);
            const isExpanded = expandedDay === dayKey;

            return (
              <div
                key={day.toISOString()}
                className={`min-h-32 p-2 bg-white dark:bg-gray-800 transition-colors duration-200 relative ${!isCurrentMonth(day) ? 'opacity-40' : ''
                  } ${isToday(day) ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}
              >
                <div className="flex items-center justify-between mb-1.5 ">
                  <span className={`text-sm font-semibold ${isToday(day)
                    ? 'bg-purple-500 text-white w-7 h-7 rounded-full flex items-center justify-center'
                    : isCurrentMonth(day) ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                    {day.getDate()}
                  </span>
                  {isCurrentMonth(day) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDay(day);
                        setEditingPlan(null);
                        setShowAddForm(true);
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all opacity-0 group-hover:opacity-100"
                      style={{ opacity: undefined }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '')}
                      title={t('weekly.addTask')}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>

                {/* Task Preview (max 2) */}
                <div className="space-y-1">
                  {dayPlans.slice(0, 2).map((plan: PlanItem) => (
                    <div
                      key={plan.id}
                      className={`text-xs p-1.5 rounded-lg cursor-pointer group/task flex items-center gap-1.5 ${getPriorityBg(plan.priority, plan.completed)
                        } ${plan.completed ? 'line-through' : ''} hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-500 transition-all`}
                      onClick={(e) => handleEditPlan(plan, e)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePlan(plan.id, { completed: !plan.completed });
                        }}
                        className="flex-shrink-0 transition-colors"
                      >
                        {plan.completed ? <CheckCircle size={11} /> : <Circle size={11} />}
                      </button>
                      <span className="truncate flex-1 font-medium">{plan.title}</span>
                      <button
                        onClick={(e) => handleDeletePlan(plan.id, e)}
                        className="flex-shrink-0 opacity-0 group-hover/task:opacity-100 hover:text-red-600 transition-opacity"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}

                  {/* "+N more" — Expand trigger */}
                  {dayPlans.length > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDay(isExpanded ? null : dayKey);
                      }}
                      className="w-full text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 py-0.5 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left px-1.5"
                    >
                      +{dayPlans.length - 2} {t('common.more')}
                    </button>
                  )}
                </div>

                {/* Completion indicator */}
                {dayPlans.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${(completedTasks / dayPlans.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{completedTasks}/{dayPlans.length}</span>
                  </div>
                )}

                {/* Habit Indicators */}
                <div className="flex flex-wrap gap-0.5 mt-auto pt-1">
                  {habits.map(h => {
                    const iso = toISODate(day);
                    const isDone = h.checkins?.[iso]?.completed;
                    const wasCreated = h.createdAtISO <= iso;
                    const isTodayOrPast = day <= new Date();

                    if (!wasCreated || !isTodayOrPast) return null;

                    return (
                      <div
                        key={h.id}
                        title={`${h.name}: ${isDone ? t('habits.success') : t('habits.missed')}`}
                        className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-green-500 shadow-sm shadow-green-500/30' : 'bg-red-400 opacity-50'}`}
                      />
                    );
                  })}
                </div>

                {/* ─── EXPANDED DAY OVERLAY ─── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      ref={expandedRef}
                      className="absolute z-40 left-0 right-0 top-0 min-w-[280px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-600 overflow-hidden"
                      style={{ minWidth: '280px', transform: 'translateX(-20%)' }}
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Panel Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-orange-50 dark:from-purple-900/20 dark:to-orange-900/20 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {day.toLocaleDateString(navigator.language, { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold truncate max-w-[120px]">
                            {dayPlans.length} {t('weekly.tasks')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(day);
                              setEditingPlan(null);
                              setShowAddForm(true);
                              setExpandedDay(null);
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedDay(null);
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Scrollable Task List */}
                      <div className="max-h-64 overflow-y-auto overscroll-contain px-2 py-2 space-y-1.5 custom-scrollbar">
                        {dayPlans.map((plan: PlanItem, idx: number) => (
                          <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`flex items-center gap-2 p-2.5 rounded-xl text-sm group/item cursor-pointer transition-all hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-600 ${getPriorityBg(plan.priority, plan.completed)
                              } ${plan.completed ? 'line-through' : ''}`}
                            onClick={(e) => handleEditPlan(plan, e)}
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityDot(plan.priority)}`} />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePlan(plan.id, { completed: !plan.completed });
                              }}
                              className="flex-shrink-0"
                            >
                              {plan.completed ? <CheckCircle size={14} /> : <Circle size={14} />}
                            </button>
                            <span className="truncate flex-1 font-medium">{plan.title}</span>
                            <button
                              onClick={(e) => handleDeletePlan(plan.id, e)}
                              className="flex-shrink-0 opacity-0 group-hover/item:opacity-100 hover:text-red-600 dark:hover:text-red-400 transition-opacity p-0.5 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </motion.div>
                        ))}
                      </div>

                      {/* Panel Footer */}
                      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-emerald-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(completedTasks / dayPlans.length) * 100}%` }}
                            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {completedTasks}/{dayPlans.length}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
};

export default MonthlyView;