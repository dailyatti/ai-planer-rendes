import React, { useState } from 'react';
import { Plus, CalendarDays, ChevronLeft, ChevronRight, CheckCircle, Circle, Pencil, Trash2 } from 'lucide-react';
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
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
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

  // Helper to compare dates ignoring time/timezone shifts
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPlansForDay = (date: Date) => {
    const dateStr = formatDate(date);
    return plans.filter(plan =>
      formatDate(plan.date) === dateStr
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPlan) {
      // Update existing plan
      updatePlan(editingPlan.id, {
        title: newPlan.title,
        description: newPlan.description,
        priority: newPlan.priority,
      });
    } else if (selectedDay) {
      // Add new plan
      addPlan({
        title: newPlan.title,
        description: newPlan.description,
        date: selectedDay,
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
    if (window.confirm(t('common.confirmDelete') || 'Biztosan törölni szeretnéd?')) {
      deletePlan(planId);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <CalendarDays className="text-purple-500" size={32} />
              {t('weekly.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('weekly.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                onClick={() => setCurrentWeek(new Date())}
                className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
              >
                {t('common.today') || 'Ma'}
              </button>

              <button
                onClick={() => navigateWeek('next')}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="text-center min-w-[140px]">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {monthNames[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {weekDays[0].getDate()}. - {weekDays[6].getDate()}.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (selectedDay || editingPlan) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingPlan ? t('common.edit') || 'Szerkesztés' : t('weekly.addTask')}
              {selectedDay && !editingPlan && ` - ${selectedDay.getFullYear()}. ${selectedDay.getMonth() + 1}. ${selectedDay.getDate()}.`}
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('daily.priority')}
                </label>
                <select
                  value={newPlan.priority}
                  onChange={(e) => setNewPlan({ ...newPlan, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">{t('daily.lowPriority')}</option>
                  <option value="medium">{t('daily.mediumPriority')}</option>
                  <option value="high">{t('daily.highPriority')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {editingPlan ? t('common.save') || 'Mentés' : t('weekly.addTask')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dayPlans = getPlansForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const completedTasks = dayPlans.filter(plan => plan.completed).length;

          return (
            <div
              key={day.toISOString()}
              className={`relative bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-gray-200/50 dark:border-gray-700/50 ${isToday ? 'ring-2 ring-purple-500 shadow-purple-500/20' : ''
                }`}
            >
              {isToday && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse shadow-lg shadow-purple-500/50" />
              )}
              <div className="mb-4">
                <div className={`text-center ${isToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                  <div className="text-sm font-medium mb-1">{dayNames[index]}</div>
                  <div className={`text-2xl font-bold ${isToday ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto shadow-lg shadow-purple-500/30' : ''}`}>
                    {day.getDate()}
                  </div>
                </div>

                {dayPlans.length > 0 && (
                  <div className="text-center mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {completedTasks}/{dayPlans.length} {t('daily.completion')}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4 min-h-32">
                {dayPlans.slice(0, 3).map((plan) => (
                  <div
                    key={plan.id}
                    className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-700/80 border border-gray-200/30 dark:border-gray-600/30 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer group"
                    onClick={(e) => handleEditPlan(plan, e)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePlan(plan.id, { completed: !plan.completed });
                        }}
                        className="text-purple-500 hover:text-purple-600 transition-colors duration-200"
                      >
                        {plan.completed ? <CheckCircle size={16} /> : <Circle size={16} />}
                      </button>
                      <span className={`text-sm font-medium flex-1 ${plan.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {plan.title.length > 15 ? plan.title.substring(0, 15) + '...' : plan.title}
                      </span>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <Pencil size={12} className="text-gray-400" />
                        <button
                          onClick={(e) => handleDeletePlan(plan.id, e)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg ${getPriorityColor(plan.priority)}`}>
                      {plan.priority === 'high' ? 'H' : plan.priority === 'medium' ? 'M' : 'L'}
                    </span>
                  </div>
                ))}

                {dayPlans.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    +{dayPlans.length - 3} {t('common.more')}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedDay(day);
                  setEditingPlan(null);
                  setShowAddForm(true);
                }}
                className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-purple-500 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                <Plus size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">{t('weekly.addTask')}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyView;