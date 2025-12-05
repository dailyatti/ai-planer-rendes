import React, { useState } from 'react';
import { Plus, CalendarRange, ChevronLeft, ChevronRight, CheckCircle, Circle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { PlanItem } from '../../types/planner';

const MonthlyView: React.FC = () => {
  const { plans, addPlan, updatePlan } = useData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
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
    return plans.filter(plan => 
      plan.date.toISOString().split('T')[0] === dateStr
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;

    addPlan({
      title: newPlan.title,
      description: newPlan.description,
      date: selectedDay,
      completed: false,
      priority: newPlan.priority,
      linkedNotes: [],
    });

    setNewPlan({ title: '', description: '', priority: 'medium' });
    setShowAddForm(false);
    setSelectedDay(null);
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
              Monthly Planning
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive monthly overview and long-term planning
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

      {showAddForm && selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add Task - {selectedDay.toLocaleDateString('en-US')}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task Title
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
                  Description
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
                  Priority
                </label>
                <select
                  value={newPlan.priority}
                  onChange={(e) => setNewPlan({ ...newPlan, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Add Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedDay(null);
                    setNewPlan({ title: '', description: '', priority: 'medium' });
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) => (
            <div key={day} className="bg-gray-100 dark:bg-gray-700 p-3 text-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{day}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600">
          {days.map((day) => {
            const dayPlans = getPlansForDay(day);
            const completedTasks = dayPlans.filter(plan => plan.completed).length;
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-32 p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer ${
                  !isCurrentMonth(day) ? 'opacity-40' : ''
                } ${isToday(day) ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
                onClick={() => {
                  setSelectedDay(day);
                  setShowAddForm(true);
                }}
              >
                <div className={`text-sm font-medium mb-2 ${
                  isToday(day) ? 'text-purple-600 dark:text-purple-400' : 
                  isCurrentMonth(day) ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {day.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayPlans.slice(0, 2).map((plan) => (
                    <div
                      key={plan.id}
                      className={`text-xs p-1 rounded truncate ${
                        plan.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                        plan.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      } ${plan.completed ? 'opacity-60 line-through' : ''}`}
                    >
                      {plan.title}
                    </div>
                  ))}
                  
                  {dayPlans.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{dayPlans.length - 2} more
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