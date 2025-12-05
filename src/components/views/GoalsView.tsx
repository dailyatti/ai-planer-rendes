import React, { useState } from 'react';
import { Plus, Target, Edit2, Trash2, Calendar, TrendingUp, CheckCircle, Play, Pause, RotateCcw } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Goal } from '../../types/planner';
import LinkifiedText from '../common/LinkifiedText';

const GoalsView: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetDate: '',
    progress: 0,
    status: 'not-started' as const,
  });

  const filteredGoals = goals.filter(goal => {
    if (filterStatus === 'all') return true;
    return goal.status === filterStatus;
  }).sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

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

    if (editingId) {
      updateGoal(editingId, {
        title: newGoal.title,
        description: newGoal.description,
        targetDate: new Date(newGoal.targetDate),
        progress: newGoal.progress,
        status: newGoal.status,
      });
      setEditingId(null);
    } else {
      addGoal({
        title: newGoal.title,
        description: newGoal.description,
        targetDate: new Date(newGoal.targetDate),
        progress: newGoal.progress,
        status: newGoal.status,
      });
    }

    setNewGoal({ title: '', description: '', targetDate: '', progress: 0, status: 'not-started' });
    setShowAddForm(false);
  };

  const handleEdit = (goal: Goal) => {
    setNewGoal({
      title: goal.title,
      description: goal.description,
      targetDate: goal.targetDate.toISOString().split('T')[0],
      progress: goal.progress,
      status: goal.status,
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
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'paused': return 'Paused';
      default: return 'Not Started';
    }
  };

  const getDaysUntilTarget = (targetDate: Date) => {
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
              Goals & Milestones
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track and achieve your ambitious goals
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            New Goal
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{goalStats.total}</div>
                <div className="text-sm opacity-90">Total Goals</div>
              </div>
              <Target size={24} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
                <div className="text-sm opacity-90">Completion Rate</div>
              </div>
              <TrendingUp size={24} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{goalStats.inProgress}</div>
                <div className="text-sm opacity-90">Active</div>
              </div>
              <Play size={24} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{goalStats.completed}</div>
                <div className="text-sm opacity-90">Achieved</div>
              </div>
              <CheckCircle size={24} className="opacity-80" />
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Goals</option>
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingId ? 'Edit Goal' : 'Create New Goal'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  required
                  placeholder="e.g. Reach 100k YouTube subscribers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Detailed Description
                </label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  rows={3}
                  placeholder="Why is this goal important? What steps are needed?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Progress (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newGoal.progress}
                    onChange={(e) => setNewGoal({ ...newGoal, progress: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={newGoal.status}
                    onChange={(e) => setNewGoal({ ...newGoal, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {editingId ? 'Update' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setNewGoal({ title: '', description: '', targetDate: '', progress: 0, status: 'not-started' });
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

      {filteredGoals.length === 0 ? (
        <div className="text-center py-12">
          <Target className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {filterStatus === 'all' ? 'No goals defined yet' : 'No goals with this status'}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
          >
            Define First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGoals.map((goal) => {
            const daysUntilTarget = getDaysUntilTarget(goal.targetDate);
            const isOverdue = daysUntilTarget < 0 && goal.status !== 'completed';
            
            return (
              <div
                key={goal.id}
                className={`p-6 rounded-xl border-l-4 ${getStatusColor(goal.status)} transition-all duration-200 hover:shadow-lg bg-white dark:bg-gray-800`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(goal.status)}
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {goal.title}
                      </h3>
                    </div>

                    {goal.description && (
                      <LinkifiedText 
                        text={goal.description}
                        className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed"
                      />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar size={16} />
                        <span>
                          Target: {new Date(goal.targetDate).toLocaleDateString('en-US')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp size={16} />
                        <span className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}>
                          {daysUntilTarget > 0 ? `${daysUntilTarget} days left` : 
                           daysUntilTarget === 0 ? 'Due today!' : 
                           `${Math.abs(daysUntilTarget)} days overdue`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                          goal.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          goal.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          goal.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}>
                          {getStatusText(goal.status)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>Progress</span>
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
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => updateGoal(goal.id, { progress: Math.max(0, goal.progress - 10) })}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                        disabled={goal.progress <= 0}
                      >
                        -10%
                      </button>
                      <button
                        onClick={() => {
                          const newProgress = Math.min(100, goal.progress + 10);
                          const newStatus = newProgress === 100 ? 'completed' : 
                                          newProgress > 0 && goal.status === 'not-started' ? 'in-progress' : 
                                          goal.status;
                          updateGoal(goal.id, { progress: newProgress, status: newStatus });
                        }}
                        className="px-3 py-1 text-sm bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-900/30 transition-colors duration-200"
                        disabled={goal.progress >= 100}
                      >
                        +10%
                      </button>
                      <button
                        onClick={() => {
                          const newProgress = Math.max(0, goal.progress - 10);
                          const newStatus = newProgress === 0 ? 'not-started' : 
                                          newProgress < 100 && goal.status === 'completed' ? 'in-progress' : 
                                          goal.status;
                          updateGoal(goal.id, { progress: newProgress, status: newStatus });
                        }}
                        className="px-3 py-1 text-sm bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors duration-200"
                        disabled={goal.progress <= 0}
                      >
                        Back -10%
                      </button>
                      {goal.progress < 100 && goal.status !== 'completed' && (
                        <button
                          onClick={() => updateGoal(goal.id, { progress: 100, status: 'completed' })}
                          className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors duration-200"
                        >
                          Complete
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

const getDaysUntilTarget = (targetDate: Date) => {
  const today = new Date();
  const target = new Date(targetDate);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default GoalsView;