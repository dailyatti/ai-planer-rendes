import React, { useState } from 'react';
import { Plus, Target, Edit2, Trash2, Calendar, TrendingUp, CheckCircle, Play, Pause, RotateCcw, Star, AlertTriangle, ArrowUp, ArrowRight, ArrowDown, Gift } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Goal, PriorityLevel } from '../../types/planner';
import LinkifiedText from '../common/LinkifiedText';
import { useLanguage } from '../../contexts/LanguageContext';

const GoalsView: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useData();
  const { t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetDate: '',
    progress: 0,
    status: 'not-started' as 'not-started' | 'in-progress' | 'paused' | 'completed',
    priority: 'medium' as PriorityLevel,
    exchange: '',
    order: '' as number | '',
  });

  const getPriorityOrder = (p?: PriorityLevel) => {
    switch (p || 'medium') {
      case 'high': return 0;
      case 'medium': return 1;
      case 'low': return 2;
      default: return 1;
    }
  };

  const filteredGoals = goals.filter(goal => {
    if (filterStatus !== 'all' && goal.status !== filterStatus) return false;
    if (filterPriority !== 'all' && (goal.priority || 'medium') !== filterPriority) return false;
    return true;
  }).sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    const pa = getPriorityOrder(a.priority);
    const pb = getPriorityOrder(b.priority);
    if (pa !== pb) return pa - pb;
    const dateA = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
    const dateB = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
    return dateA - dateB;
  });

  const goalStats = {
    total: goals.length,
    completed: goals.filter(g => g.status === 'completed').length,
    inProgress: goals.filter(g => g.status === 'in-progress').length,
    notStarted: goals.filter(g => g.status === 'not-started').length,
    paused: goals.filter(g => g.status === 'paused').length,
  };

  const completionRate = goalStats.total > 0 ? (goalStats.completed / goalStats.total) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const goalData: any = {
      title: newGoal.title,
      description: newGoal.description,
      progress: newGoal.progress,
      status: newGoal.status,
      priority: newGoal.priority,
      exchange: newGoal.exchange || undefined,
      order: newGoal.order !== '' ? Number(newGoal.order) : undefined,
    };

    if (newGoal.targetDate) {
      goalData.targetDate = new Date(newGoal.targetDate);
    }

    if (editingId) {
      updateGoal(editingId, goalData);
      setEditingId(null);
    } else {
      addGoal(goalData);
    }

    setNewGoal({ title: '', description: '', targetDate: '', progress: 0, status: 'not-started', priority: 'medium', exchange: '', order: '' });
    setShowAddForm(false);
  };

  const handleEdit = (goal: Goal) => {
    setNewGoal({
      title: goal.title,
      description: goal.description,
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
      progress: goal.progress,
      status: goal.status,
      priority: goal.priority || 'medium',
      exchange: goal.exchange || '',
      order: goal.order !== undefined ? goal.order : '',
    });
    setEditingId(goal.id);
    setShowAddForm(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-green-500" size={20} />;
      case 'in-progress': return <Play className="text-blue-500" size={20} />;
      case 'paused': return <Pause className="text-yellow-500" size={20} />;
      default: return <RotateCcw className="text-gray-500" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
      case 'in-progress': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      case 'paused': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return t('goals.filterCompleted');
      case 'in-progress': return t('goals.filterInProgress');
      case 'paused': return t('goals.filterPaused');
      default: return t('goals.filterNotStarted');
    }
  };

  const getPriorityIcon = (priority?: PriorityLevel) => {
    switch (priority || 'medium') {
      case 'high': return <ArrowUp className="text-red-500" size={16} />;
      case 'medium': return <ArrowRight className="text-orange-500" size={16} />;
      case 'low': return <ArrowDown className="text-blue-400" size={16} />;
    }
  };

  const getPriorityLabel = (priority?: PriorityLevel) => {
    switch (priority || 'medium') {
      case 'high': return t('priority.high');
      case 'medium': return t('priority.medium');
      case 'low': return t('priority.low');
    }
  };

  const getPriorityBadgeClass = (priority?: PriorityLevel) => {
    switch (priority || 'medium') {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
    }
  };

  const getDaysUntilTarget = (targetDate?: Date) => {
    if (!targetDate) return null;
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Target className="text-teal-500" size={32} />
              {t('goals.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('goals.subtitle')}
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            {t('goals.newGoal')}
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{goalStats.total}</div>
                <div className="text-sm opacity-90">{t('goals.totalGoals')}</div>
              </div>
              <Target size={24} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
                <div className="text-sm opacity-90">{t('goals.completionRate')}</div>
              </div>
              <TrendingUp size={24} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{goalStats.inProgress}</div>
                <div className="text-sm opacity-90">{t('goals.active')}</div>
              </div>
              <Play size={24} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{goalStats.completed}</div>
                <div className="text-sm opacity-90">{t('goals.achieved')}</div>
              </div>
              <CheckCircle size={24} className="opacity-80" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">{t('goals.filterAll')}</option>
            <option value="not-started">{t('goals.filterNotStarted')}</option>
            <option value="in-progress">{t('goals.filterInProgress')}</option>
            <option value="paused">{t('goals.filterPaused')}</option>
            <option value="completed">{t('goals.filterCompleted')}</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">{t('priority.all')}</option>
            <option value="high">{t('priority.high')}</option>
            <option value="medium">{t('priority.medium')}</option>
            <option value="low">{t('priority.low')}</option>
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingId ? t('goals.editGoal') : t('goals.createGoal')}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('goals.goalTitle')}
                </label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  required
                  placeholder={t('goals.placeholderTitle')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('goals.goalDescription')}
                </label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  rows={3}
                  placeholder={t('goals.placeholderDesc')}
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('priority.label')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['high', 'medium', 'low'] as PriorityLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setNewGoal({ ...newGoal, priority: level })}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${newGoal.priority === level
                        ? level === 'high'
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          : level === 'medium'
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                            : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                        }`}
                    >
                      {level === 'high' && <ArrowUp size={16} />}
                      {level === 'medium' && <ArrowRight size={16} />}
                      {level === 'low' && <ArrowDown size={16} />}
                      {level === 'high' ? t('priority.high') : level === 'medium' ? t('priority.medium') : t('priority.low')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Date - Optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('goals.targetDate')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
                </label>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Progress with Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('goals.progress')}: <span className="text-teal-600 dark:text-teal-400 font-bold">{newGoal.progress}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={newGoal.progress}
                  onChange={(e) => setNewGoal({ ...newGoal, progress: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('goals.status')}
                </label>
                <select
                  value={newGoal.status}
                  onChange={(e) => setNewGoal({ ...newGoal, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="not-started">{t('goals.filterNotStarted')}</option>
                  <option value="in-progress">{t('goals.filterInProgress')}</option>
                  <option value="paused">{t('goals.filterPaused')}</option>
                  <option value="completed">{t('goals.filterCompleted')}</option>
                </select>
              </div>

              {/* Exchange - Optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('goals.exchange')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
                </label>
                <textarea
                  value={newGoal.exchange}
                  onChange={(e) => setNewGoal({ ...newGoal, exchange: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  rows={2}
                  placeholder={t('goals.exchangePlaceholder')}
                />
              </div>

              {/* Order / Numbering - Optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.order')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
                </label>
                <input
                  type="number"
                  value={newGoal.order}
                  onChange={(e) => setNewGoal({ ...newGoal, order: e.target.value ? parseInt(e.target.value) : '' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  placeholder="E.g., 1"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {editingId ? t('common.update') : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setNewGoal({ title: '', description: '', targetDate: '', progress: 0, status: 'not-started', priority: 'medium', exchange: '', order: '' });
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

      {filteredGoals.length === 0 ? (
        <div className="text-center py-12">
          <Target className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {filterStatus === 'all' && filterPriority === 'all' ? t('goals.noGoalsDefined') : t('goals.noGoalsStatus')}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
          >
            {t('goals.defineFirstGoal')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGoals.map((goal) => {
            const daysUntilTarget = getDaysUntilTarget(goal.targetDate);
            const isOverdue = daysUntilTarget !== null && daysUntilTarget < 0 && goal.status !== 'completed';

            return (
              <div
                key={goal.id}
                className={`p-6 rounded-xl border-l-4 ${getStatusColor(goal.status)} transition-all duration-200 hover:shadow-lg bg-white dark:bg-gray-800`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {getStatusIcon(goal.status)}
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {goal.order !== undefined && <span className="text-teal-500 mr-2">#{goal.order}</span>}
                        {goal.title}
                      </h3>
                      {/* Priority Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPriorityBadgeClass(goal.priority)}`}>
                        {getPriorityIcon(goal.priority)}
                        {getPriorityLabel(goal.priority)}
                      </span>
                    </div>

                    {goal.description && (
                      <LinkifiedText
                        text={goal.description}
                        className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed"
                      />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      {goal.targetDate ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar size={16} />
                          <span>
                            {t('goals.target')}: {new Date(goal.targetDate).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 italic">
                          <Calendar size={16} />
                          <span>{t('goals.noDeadline')}</span>
                        </div>
                      )}

                      {daysUntilTarget !== null ? (
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp size={16} />
                          <span className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}>
                            {daysUntilTarget > 0 ? `${daysUntilTarget} ${t('goals.daysLeft')}` :
                              daysUntilTarget === 0 ? t('goals.dueToday') :
                                `${Math.abs(daysUntilTarget)} ${t('goals.overdue')}`}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-2">
                        <span className={`text-sm px-3 py-1 rounded-full font-medium ${goal.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          goal.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            goal.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                          {getStatusText(goal.status)}
                        </span>
                      </div>
                    </div>

                    {/* Exchange Info */}
                    {goal.exchange && (
                      <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">
                          <Gift size={14} />
                          {t('goals.exchange')}
                        </div>
                        <p className="text-sm text-purple-600 dark:text-purple-300">{goal.exchange}</p>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>{t('goals.progress')}</span>
                        <span>{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-teal-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Progress Actions */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <button
                        onClick={() => updateGoal(goal.id, { progress: Math.max(0, goal.progress - 10) })}
                        className="group flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                        disabled={goal.progress <= 0}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        <span>-10%</span>
                      </button>
                      <button
                        onClick={() => {
                          const newProgress = Math.min(100, goal.progress + 10);
                          const newStatus = newProgress === 100 ? 'completed' :
                            newProgress > 0 && goal.status === 'not-started' ? 'in-progress' :
                              goal.status;
                          updateGoal(goal.id, { progress: newProgress, status: newStatus });
                        }}
                        className="group flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                        disabled={goal.progress >= 100}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>+10%</span>
                      </button>

                      {goal.progress < 100 && goal.status !== 'completed' && (
                        <button
                          onClick={() => updateGoal(goal.id, { progress: 100, status: 'completed' })}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                          <CheckCircle size={14} />
                          <span>{t('goals.complete')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(goal)}
                      className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalsView;
