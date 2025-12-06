import React, { useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { PlanItem } from '../../types/planner';
import { useLanguage } from '../../contexts/LanguageContext';

const MonthlyView: React.FC = () => {
  const { t } = useLanguage();
  const { plans, addPlan, updatePlan, deletePlan } = useData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

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

    // Adjust to Monday as first day
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
  };

  const getPlansForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return plans.filter((plan: PlanItem) =>
      plan.date.toISOString().split('T')[0] === dateStr
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

  const days = getDaysInMonth(currentMonth);
  const isCurrentMonth = (date: Date) => date.getMonth() === currentMonth.getMonth();
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

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
            <button
              onClick={() => navigateMonth('prev')}
              className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center min-w-48">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>
            </div>

            <button
              onClick={() => navigateMonth('next')}
              className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (selectedDay || editingPlan) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingPlan ? t('common.edit') || 'Szerkesztés' : t('weekly.addTask')}
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('daily.priority')}
                </label>
                <select
                  value={newPlan.priority}
                  onChange={(e) => setNewPlan({ ...newPlan, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="low">{t('daily.lowPriority')}</option>
                  <option value="medium">{t('daily.mediumPriority')}</option>
                  <option value="high">{t('daily.highPriority')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
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

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600">
          {dayNamesShort.map((day) => (
            <div key={day} className="bg-gray-100 dark:bg-gray-700 p-3 text-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{day}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600">
          {days.map((day) => {
            const dayPlans = getPlansForDay(day);
            const completedTasks = dayPlans.filter((plan: PlanItem) => plan.completed).length;

            return (
              <div
                key={day.toISOString()}
                className={`min-h-32 p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer ${!isCurrentMonth(day) ? 'opacity-40' : ''
                  } ${isToday(day) ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
                onClick={() => {
                  setSelectedDay(day);
                  setEditingPlan(null);
                  setShowAddForm(true);
                }}
              >
                <div className={`text-sm font-medium mb-2 ${isToday(day) ? 'text-purple-600 dark:text-purple-400' :
                  isCurrentMonth(day) ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                  {day.getDate()}
                </div>

                <div className="space-y-1">
                  {dayPlans.slice(0, 2).map((plan: PlanItem) => (
                    <div
                      key={plan.id}
                      className={`text-xs p-1 rounded truncate cursor-pointer group relative ${plan.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                        plan.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        } ${plan.completed ? 'opacity-60 line-through' : ''}`}
                      onClick={(e) => handleEditPlan(plan, e)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{plan.title}</span>
                        <div className="hidden group-hover:flex items-center gap-1 ml-1">
                          <Pencil size={10} />
                          <button
                            onClick={(e) => handleDeletePlan(plan.id, e)}
                            className="hover:text-red-600"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {dayPlans.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{dayPlans.length - 2} {t('common.more')}
                    </div>
                  )}
                </div>

                {dayPlans.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {completedTasks}/{dayPlans.length}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MonthlyView;