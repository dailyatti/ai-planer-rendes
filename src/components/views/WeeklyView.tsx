import React, { useState } from 'react';
import { Plus, CalendarDays, ChevronLeft, ChevronRight, CheckCircle, Circle, Pencil, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlanItem } from '../../types/planner';

const WeeklyView: React.FC = () => {
  const { plans, addPlan, updatePlan, deletePlan } = useData();
  const { t } = useLanguage();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [useDate, setUseDate] = useState(true);
  // Modal-based expanded view for a day
  const [expandedDayData, setExpandedDayData] = useState<{ date: Date; dayName: string } | null>(null);

  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDays = getWeekDays(currentWeek);
  const dayNames = [
    t('days.monday'), t('days.tuesday'), t('days.wednesday'), t('days.thursday'),
    t('days.friday'), t('days.saturday'), t('days.sunday')
  ];
  const monthNames = [
    t('months.january'), t('months.february'), t('months.march'), t('months.april'), t('months.may'), t('months.june'),
    t('months.july'), t('months.august'), t('months.september'), t('months.october'), t('months.november'), t('months.december')
  ];

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPlansForDay = (date: Date) => {
    const dateStr = formatDate(date);
    return plans.filter(plan =>
      plan.date && formatDate(plan.date) === dateStr
    );
  };

  const generalPlans = plans.filter(plan => !plan.date).sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPlan) {
      updatePlan(editingPlan.id, {
        title: newPlan.title,
        description: newPlan.description,
        priority: newPlan.priority,
      });
    } else if (selectedDay || !useDate) {
      addPlan({
        title: newPlan.title,
        description: newPlan.description,
        date: useDate && selectedDay ? selectedDay : null,
        completed: false,
        priority: newPlan.priority,
        linkedNotes: [],
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewPlan({ title: '', description: '', priority: 'medium' });
    setShowAddForm(false);
    setSelectedDay(null);
    setEditingPlan(null);
    setUseDate(true);
  };

  const handleEditPlan = (plan: PlanItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPlan(plan);
    setUseDate(!!plan.date);
    if (plan.date) setSelectedDay(plan.date);
    setNewPlan({
      title: plan.title,
      description: plan.description || '',
      priority: plan.priority,
    });
    setExpandedDayData(null);
    setShowAddForm(true);
  };

  const handleDeletePlan = (planId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    deletePlan(planId);
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

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-gray-400';
    }
  };

  // Get expanded day plans for the modal
  const expandedPlans = expandedDayData ? getPlansForDay(expandedDayData.date) : [];
  const expandedCompleted = expandedPlans.filter(p => p.completed).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <CalendarDays className="text-purple-500" size={32} />
                {t('weekly.title')}
              </h1>
              <motion.button
                onClick={() => {
                  setSelectedDay(new Date());
                  setEditingPlan(null);
                  setUseDate(false);
                  setShowAddForm(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-500/20 ml-4 text-sm font-medium"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Plus size={16} />
                {t('daily.newTask')}
              </motion.button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              {t('weekly.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                onClick={() => setCurrentWeek(new Date())}
                className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
              >
                {t('common.today') || 'Ma'}
              </button>

              <button
                onClick={() => navigateWeek('next')}
                className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="text-center min-w-[140px]">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {monthNames[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {weekDays[0].getDate()}. - {weekDays[6].getDate()}.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetForm}
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
                {editingPlan ? t('common.edit') || 'Szerkesztés' : t('weekly.addTask')}
                {useDate && selectedDay && !editingPlan && ` - ${selectedDay.getFullYear()}. ${selectedDay.getMonth() + 1}. ${selectedDay.getDate()}.`}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('daily.taskTitle')}
                  </label>
                  <input
                    type="text"
                    value={newPlan.title}
                    onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('daily.taskDescription')}
                  </label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2.5 px-4 rounded-xl font-medium shadow-md hover:shadow-lg transition-shadow"
                  >
                    {editingPlan ? t('common.save') || 'Mentés' : t('weekly.addTask')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
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

      {/* ─── EXPANDED DAY MODAL (proper full-screen modal) ─── */}
      <AnimatePresence>
        {expandedDayData && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedDayData(null)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                <div className="flex items-center gap-3">
                  <CalendarDays className="text-purple-500" size={22} />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {expandedDayData.dayName} {expandedDayData.date.getDate()}.
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {expandedPlans.length} feladat · {expandedCompleted} kész
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedDay(expandedDayData.date);
                      setEditingPlan(null);
                      setUseDate(true);
                      setExpandedDayData(null);
                      setShowAddForm(true);
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    onClick={() => setExpandedDayData(null)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Task List */}
              <div className="max-h-[60vh] overflow-y-auto overscroll-contain p-3 space-y-2">
                {expandedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm group/item cursor-pointer transition-all hover:ring-1 hover:ring-purple-200 dark:hover:ring-purple-700 ${getPriorityBg(plan.priority, plan.completed)
                      } ${plan.completed ? 'line-through' : ''}`}
                    onClick={() => handleEditPlan(plan)}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getPriorityDot(plan.priority)}`} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePlan(plan.id, { completed: !plan.completed });
                      }}
                      className="flex-shrink-0"
                    >
                      {plan.completed ? <CheckCircle size={16} /> : <Circle size={16} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{plan.title}</span>
                      {plan.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{plan.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditPlan(plan); }}
                        className="opacity-0 group-hover/item:opacity-100 p-1 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeletePlan(plan.id, e)}
                        className="opacity-0 group-hover/item:opacity-100 p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              {expandedPlans.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${(expandedCompleted / expandedPlans.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {expandedCompleted}/{expandedPlans.length}
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* General Plans Section */}
      {generalPlans.length > 0 && (
        <div className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Napi terv (általános tervek)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {generalPlans.map((plan) => (
              <div
                key={plan.id}
                className={`p-4 rounded-xl border-l-4 ${plan.priority === 'high' ? 'border-l-red-500' : plan.priority === 'medium' ? 'border-l-amber-500' : 'border-l-emerald-500'
                  } bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all group cursor-pointer`}
                onClick={(e) => handleEditPlan(plan, e)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePlan(plan.id, { completed: !plan.completed });
                        }}
                        className="text-purple-500 hover:text-purple-600 transition-colors flex-shrink-0"
                      >
                        {plan.completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                      </button>
                      <h4 className={`font-semibold truncate ${plan.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {plan.title}
                      </h4>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 pl-7">{plan.description}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeletePlan(plan.id, e)}
                    className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week Grid — NO entrance animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dayPlans = getPlansForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const completedTasks = dayPlans.filter(plan => plan.completed).length;

          return (
            <div
              key={day.toISOString()}
              className={`bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-lg p-4 transition-shadow duration-300 border border-gray-100 dark:border-gray-700/50 ${isToday ? 'ring-2 ring-purple-500 shadow-purple-500/10' : ''
                }`}
            >
              {isToday && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50 relative" style={{ position: 'absolute', top: '-4px', right: '-4px' }} />
              )}

              {/* Day Header */}
              <div className="mb-3">
                <div className={`text-center ${isToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400">{dayNames[index]}</div>
                  <div className={`text-2xl font-bold ${isToday ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full w-11 h-11 flex items-center justify-center mx-auto shadow-lg shadow-purple-500/30' : ''}`}>
                    {day.getDate()}
                  </div>
                </div>

                {dayPlans.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${(completedTasks / dayPlans.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400">{completedTasks}/{dayPlans.length}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Task Preview (max 3) */}
              <div className="space-y-1.5 mb-3 min-h-[80px]">
                {dayPlans.slice(0, 3).map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-2 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer group/task transition-all hover:ring-1 hover:ring-purple-300 dark:hover:ring-purple-600 ${getPriorityBg(plan.priority, plan.completed)
                      } ${plan.completed ? 'line-through' : ''}`}
                    onClick={(e) => handleEditPlan(plan, e)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePlan(plan.id, { completed: !plan.completed });
                      }}
                      className="flex-shrink-0 transition-colors"
                    >
                      {plan.completed ? <CheckCircle size={13} /> : <Circle size={13} />}
                    </button>
                    <span className="truncate flex-1 font-medium">{plan.title}</span>
                    <div className="hidden group-hover/task:flex items-center gap-0.5">
                      <button
                        onClick={(e) => handleDeletePlan(plan.id, e)}
                        className="hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* "+N more" opens modal */}
                {dayPlans.length > 3 && (
                  <button
                    onClick={() => setExpandedDayData({ date: day, dayName: dayNames[index] })}
                    className="w-full text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 py-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-center"
                  >
                    +{dayPlans.length - 3} {t('common.more')}
                  </button>
                )}
              </div>

              {/* Add Task Button */}
              <button
                onClick={() => {
                  setSelectedDay(day);
                  setEditingPlan(null);
                  setUseDate(true);
                  setShowAddForm(true);
                }}
                className="w-full p-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 dark:text-gray-500 hover:border-purple-400 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />
                <span className="text-xs font-medium">{t('weekly.addTask')}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyView;