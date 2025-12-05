import React, { useState } from 'react';
import { Plus, Calendar, CheckCircle, Circle, Edit2, Trash2, Clock } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlanItem } from '../../types/planner';
import LinkifiedText from '../common/LinkifiedText';

const DailyView: React.FC = () => {
  const { plans, addPlan, updatePlan, deletePlan } = useData();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
  });

  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  const dayPlans = plans.filter(plan => 
    plan.date.toISOString().split('T')[0] === selectedDateStr
  ).sort((a, b) => {
    if (a.priority === b.priority) return 0;
    if (a.priority === 'high') return -1;
    if (b.priority === 'high') return 1;
    if (a.priority === 'medium') return -1;
    return 1;
  });

  const completedCount = dayPlans.filter(plan => plan.completed).length;
  const completionRate = dayPlans.length > 0 ? (completedCount / dayPlans.length) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      updatePlan(editingId, {
        title: newPlan.title,
        description: newPlan.description,
        priority: newPlan.priority,
      });
      setEditingId(null);
    } else {
      addPlan({
        title: newPlan.title,
        description: newPlan.description,
        date: selectedDate,
        completed: false,
        priority: newPlan.priority,
        linkedNotes: [],
      });
    }

    setNewPlan({ title: '', description: '', priority: 'medium' });
    setShowAddForm(false);
  };

  const handleEdit = (plan: PlanItem) => {
    setNewPlan({
      title: plan.title,
      description: plan.description,
      priority: plan.priority,
    });
    setEditingId(plan.id);
    setShowAddForm(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      case 'low': return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Calendar className="text-green-500" size={32} />
              {t('daily.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('daily.subtitle')}
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            {t('daily.newTask')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('daily.selectDate')}
            </label>
            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-4 text-white">
            <div className="text-sm opacity-90 mb-1">{t('daily.completion')}</div>
            <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
            <div className="text-sm opacity-90">{completedCount}/{dayPlans.length} {t('daily.tasks')}</div>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingId ? t('daily.editTask') : t('daily.addTask')}
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  required
                  placeholder={t('daily.taskPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('daily.taskDescription')}
                </label>
                <textarea
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder={t('daily.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('daily.priority')}
                </label>
                <select
                  value={newPlan.priority}
                  onChange={(e) => setNewPlan({ ...newPlan, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                >
                  <option value="low">{t('daily.lowPriority')}</option>
                  <option value="medium">{t('daily.mediumPriority')}</option>
                  <option value="high">{t('daily.highPriority')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {editingId ? t('common.update') : t('daily.addTask')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setNewPlan({ title: '', description: '', priority: 'medium' });
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {dayPlans.map((plan) => (
          <div
            key={plan.id}
            className={`p-6 rounded-xl border-l-4 ${getPriorityColor(plan.priority)} transition-all duration-200 hover:shadow-lg bg-white dark:bg-gray-800`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => updatePlan(plan.id, { completed: !plan.completed })}
                    className="text-green-500 hover:text-green-600 transition-colors duration-200"
                  >
                    {plan.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                  </button>
                  <h4 className={`text-xl font-bold ${plan.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                    {plan.title}
                  </h4>
                </div>
                
                {plan.description && (
                  <LinkifiedText 
                    text={plan.description}
                    className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed"
                  />
                )}
                
                <div className="flex items-center gap-4">
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                    plan.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                    plan.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  }`}>
                    {plan.priority === 'high' ? t('daily.highPriority') : 
                     plan.priority === 'medium' ? t('daily.mediumPriority') : 
                     t('daily.lowPriority')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleEdit(plan)}
                  className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyView;