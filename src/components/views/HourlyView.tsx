import React, { useState } from 'react';
import { Plus, Clock, CheckCircle, Circle, Edit2, Trash2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { PlanItem } from '../../types/planner';
import LinkifiedText from '../common/LinkifiedText';
import { useLanguage } from '../../contexts/LanguageContext';

const HourlyView: React.FC = () => {
  const { plans, addPlan, updatePlan, deletePlan } = useData();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // const today = new Date().toISOString().split('T')[0]; // Removed unused variable
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  // ...
  <div className="flex gap-3 pt-4">
    <button
      type="submit"
      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
    >
      {editingId ? t('common.update') : t('hourly.addBlock')}
    </button>
    <button
      type="button"
      onClick={() => {
        setShowAddForm(false);
        setEditingId(null);
        setNewPlan({ title: '', description: '', startTime: '', endTime: '', priority: 'medium' });
      }}
      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
    >
      {t('common.cancel')}
    </button>
  </div>

  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const dayPlans = plans.filter(plan =>
    plan.date.toISOString().split('T')[0] === selectedDateStr
  ).sort((a, b) => {
    if (a.startTime && b.startTime) {
      return a.startTime.getTime() - b.startTime.getTime();
    }
    return 0;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startDateTime = newPlan.startTime ? new Date(`${selectedDateStr}T${newPlan.startTime}`) : undefined;
    const endDateTime = newPlan.endTime ? new Date(`${selectedDateStr}T${newPlan.endTime}`) : undefined;

    if (editingId) {
      updatePlan(editingId, {
        title: newPlan.title,
        description: newPlan.description,
        startTime: startDateTime,
        endTime: endDateTime,
        priority: newPlan.priority,
      });
      setEditingId(null);
    } else {
      addPlan({
        title: newPlan.title,
        description: newPlan.description,
        startTime: startDateTime,
        endTime: endDateTime,
        date: selectedDate,
        completed: false,
        priority: newPlan.priority,
        linkedNotes: [],
      });
    }

    setNewPlan({ title: '', description: '', startTime: '', endTime: '', priority: 'medium' });
    setShowAddForm(false);
  };

  const handleEdit = (plan: PlanItem) => {
    setNewPlan({
      title: plan.title,
      description: plan.description,
      startTime: plan.startTime ? plan.startTime.toTimeString().substr(0, 5) : '',
      endTime: plan.endTime ? plan.endTime.toTimeString().substr(0, 5) : '',
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Clock className="text-blue-500" size={32} />
              {t('hourly.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('hourly.subtitle')}
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            {t('hourly.newTimeBlock')}
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('hourly.selectDate')}
          </label>
          <input
            type="date"
            value={selectedDateStr}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingId ? t('hourly.editBlock') : t('hourly.addBlock')}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('hourly.titleLabel')}
                </label>
                <input
                  type="text"
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('hourly.descriptionLabel')}
                </label>
                <textarea
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('hourly.startTimeLabel')}
                  </label>
                  <input
                    type="time"
                    value={newPlan.startTime}
                    onChange={(e) => setNewPlan({ ...newPlan, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('hourly.endTimeLabel')}
                  </label>
                  <input
                    type="time"
                    value={newPlan.endTime}
                    onChange={(e) => setNewPlan({ ...newPlan, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('hourly.priorityLabel')}
                </label>
                <select
                  value={newPlan.priority}
                  onChange={(e) => setNewPlan({ ...newPlan, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">{t('hourly.lowPriority')}</option>
                  <option value="medium">{t('hourly.mediumPriority')}</option>
                  <option value="high">{t('hourly.highPriority')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {editingId ? t('common.update') : t('hourly.addBlock')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setNewPlan({ title: '', description: '', startTime: '', endTime: '', priority: 'medium' });
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('hourly.hourlySchedule')}
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {hours.map((hour) => {
                const hourPlans = dayPlans.filter(plan =>
                  plan.startTime && plan.startTime.toTimeString().substr(0, 5) === hour
                );

                return (
                  <button
                    key={hour}
                    onClick={() => {
                      setNewPlan({
                        ...newPlan,
                        startTime: hour,
                        endTime: hour.split(':')[0] + ':' + (parseInt(hour.split(':')[0]) + 1).toString().padStart(2, '0') + ':00'
                      });
                      setShowAddForm(true);
                    }}
                    className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 text-left"
                  >
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400 w-12">
                      {hour}
                    </span>
                    <div className="flex-1">
                      {hourPlans.length > 0 ? (
                        <div className="space-y-1">
                          {hourPlans.map(plan => (
                            <div key={plan.id} className="text-sm text-gray-900 dark:text-white font-medium">
                              {plan.title}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">{t('hourly.available')}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('hourly.dailyTimeBlocks')} - {selectedDate.toLocaleDateString('en-US')}
            </h3>

            {dayPlans.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {t('hourly.noBlocks')}
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  {t('hourly.addFirstBlock')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {dayPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-lg border-l-4 ${getPriorityColor(plan.priority)} transition-all duration-200 hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => updatePlan(plan.id, { completed: !plan.completed })}
                            className="text-blue-500 hover:text-blue-600 transition-colors duration-200"
                          >
                            {plan.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                          </button>
                          <h4 className={`text-lg font-semibold ${plan.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                            {plan.title}
                          </h4>
                        </div>

                        {(plan.startTime || plan.endTime) && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                            <Clock size={16} />
                            {plan.startTime?.toTimeString().substr(0, 5)}
                            {plan.startTime && plan.endTime && ' - '}
                            {plan.endTime?.toTimeString().substr(0, 5)}
                          </div>
                        )}

                        {plan.description && (
                          <LinkifiedText
                            text={plan.description}
                            className="text-gray-700 dark:text-gray-300 mb-2"
                          />
                        )}

                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${plan.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            plan.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            }`}>
                            {plan.priority === 'high' ? t('hourly.highPriority') : plan.priority === 'medium' ? t('hourly.mediumPriority') : t('hourly.lowPriority')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deletePlan(plan.id)}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HourlyView;