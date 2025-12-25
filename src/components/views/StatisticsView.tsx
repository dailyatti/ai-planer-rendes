import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  BarChart3, TrendingUp,
  Activity, Target,
  X, Wallet, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';

const StatisticsView: React.FC = () => {
  const { t } = useLanguage();
  const { plans, goals, computeProjection, computeRunway } = useData();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [projectionMonths, setProjectionMonths] = useState(6);

  // 1. Calculate Productivity Score & Task Metrics
  const taskMetrics = useMemo(() => {
    const now = new Date();
    // Filter plans based on timeRange
    const filteredPlans = plans.filter(p => {
      const pDate = new Date(p.date);
      if (timeRange === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return pDate >= oneWeekAgo && pDate <= now;
      } else if (timeRange === 'month') {
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      } else {
        return pDate.getFullYear() === now.getFullYear();
      }
    });

    const total = filteredPlans.length;
    const completed = filteredPlans.filter(p => p.completed).length;
    const score = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Priority Distribution
    const priorityCounts = { high: 0, medium: 0, low: 0 };
    filteredPlans.forEach(p => {
      if (p.priority && priorityCounts[p.priority] !== undefined) {
        priorityCounts[p.priority]++;
      }
    });

    return { total, completed, score, priorityCounts, filteredPlans };
  }, [plans, timeRange]);

  // 2. Goal Progress
  const goalMetrics = useMemo(() => {
    const activeGoals = goals.filter(g => g.status === 'in-progress');
    const totalProgress = activeGoals.reduce((acc, g) => acc + g.progress, 0);
    const avgProgress = activeGoals.length > 0 ? Math.round(totalProgress / activeGoals.length) : 0;
    return { activeCount: activeGoals.length, avgProgress };
  }, [goals]);

  // 3. Chart Data Preparation
  const chartData = useMemo(() => {
    // Group by Date for Area/Bar Charts
    const groupedByDate: Record<string, { date: string; completed: number; planned: number }> = {};

    taskMetrics.filteredPlans.forEach(p => {
      const dateKey = new Date(p.date).toLocaleDateString();
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = { date: dateKey, completed: 0, planned: 0 };
      }
      groupedByDate[dateKey].planned++;
      if (p.completed) groupedByDate[dateKey].completed++;
    });

    // Sort by date
    return Object.values(groupedByDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [taskMetrics.filteredPlans]);

  const priorityChartData = [
    { name: t('priority.high') || 'Magas', value: taskMetrics.priorityCounts.high, color: '#ef4444' }, // Red
    { name: t('priority.medium') || 'Közepes', value: taskMetrics.priorityCounts.medium, color: '#f59e0b' }, // Amber
    { name: t('priority.low') || 'Alacsony', value: taskMetrics.priorityCounts.low, color: '#10b981' }, // Green
  ].filter(d => d.value > 0);

  return (
    <div className="view-container">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="view-title flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30">
              <BarChart3 size={24} className="text-white" />
            </div>
            {t('statistics.title')}
          </h1>
          <p className="view-subtitle">
            {t('statistics.subtitle')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            className="btn-primary px-4 py-2 flex items-center gap-2"
            onClick={() => setShowFinancialModal(true)}
          >
            <Wallet size={18} />
            {t('statistics.financialModelButton') || 'Pénzügyi Modell'}
          </button>

          <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1" />

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="input-field max-w-[140px] py-2"
          >
            <option value="week">{t('statistics.thisWeek')}</option>
            <option value="month">{t('statistics.thisMonth')}</option>
            <option value="year">{t('statistics.thisYear')}</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Productivity Score */}
        <div className="stat-card stat-card-primary">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium opacity-90">{t('statistics.productivityScore')}</span>
              <Activity size={20} className="opacity-80" />
            </div>
            <div className="text-3xl font-bold">{taskMetrics.score}%</div>
            <div className="text-sm opacity-80 mt-1 flex items-center gap-1">
              <CheckCircle2 size={14} /> {taskMetrics.completed} / {taskMetrics.total} {t('statistics.tasksCompleted')}
            </div>
          </div>
        </div>

        {/* Goal Progress - Replaces "Tasks Completed" mock */}
        <div className="stat-card stat-card-success">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium opacity-90">{t('goals.title') || 'Célok Haladása'}</span>
              <Target size={20} className="opacity-80" />
            </div>
            <div className="text-3xl font-bold">{goalMetrics.avgProgress}%</div>
            <div className="text-sm opacity-80 mt-1 flex items-center gap-1">
              <TrendingUp size={14} /> {goalMetrics.activeCount} {t('goals.active') || 'aktív cél'}
            </div>
          </div>
        </div>

        {/* Financial Runway - Replaces "Focus Time" mock */}
        <div className="stat-card stat-card-accent">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium opacity-90">{t('statistics.runway') || 'Pénzügyi Kifutópálya'}</span>
              <Clock size={20} className="opacity-80" />
            </div>
            <div className="text-3xl font-bold">
              {computeRunway() !== null ? `${computeRunway()} ${t('statistics.months') || 'hó'}` : '∞'}
            </div>
            <div className="text-sm opacity-80 mt-1">
              {t('statistics.runwayDesc') || 'Jelenlegi költségekkel'}
            </div>
          </div>
        </div>

        {/* Pending Tasks - Replaces "Interruptions" mock */}
        <div className="stat-card stat-card-warning">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium opacity-90">{t('statistics.pendingTasks') || 'Hátralévő'}</span>
              <AlertCircle size={20} className="opacity-80" />
            </div>
            <div className="text-3xl font-bold">{taskMetrics.total - taskMetrics.completed}</div>
            <div className="text-sm opacity-80 mt-1 flex items-center gap-1">
              {t('statistics.tasksRemaining') || 'feladat van még hátra'}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Planned vs Completed Chart */}
        <div className="card">
          <h3 className="section-title mb-6">{t('statistics.plannedVsCompleted')}</h3>
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="planned" name={t('statistics.planned') || 'Tervezett'} fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name={t('statistics.completed') || 'Befejezett'} fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p>{t('common.noData') || 'Nincs megjeleníthető adat erre az időszakra'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Priority Distribution Pie Chart */}
        <div className="card">
          <h3 className="section-title mb-6">{t('statistics.priorityDistribution') || 'Prioritás Eloszlás'}</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {priorityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={priorityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="middle" align="right" layout="vertical" />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p>{t('common.noData') || 'Nincs megjeleníthető adat'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Model Modal (Kept functionality but integrated with button) */}
      {showFinancialModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowFinancialModal(false)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Wallet size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {t('statistics.financialModel') || 'Pénzügyi Modell'}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {t('statistics.financialModelDesc') || 'Cash-flow előrejelzés és kifutópálya'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFinancialModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
              {/* Projection Controls */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('statistics.projectionMonths') || 'Előrejelzés időtartama (hónap)'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={projectionMonths}
                    onChange={e => setProjectionMonths(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="w-12 text-center font-bold text-indigo-600 text-lg">
                    {projectionMonths}
                  </span>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Runway Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <Clock size={18} className="text-white" />
                    </div>
                    <span className="font-medium text-emerald-800 dark:text-emerald-200">
                      {t('statistics.runway') || 'Kifutópálya'}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {computeRunway() !== null ? `${computeRunway()} ${t('statistics.months') || 'hónap'}` : 'N/A'}
                  </div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                    {t('statistics.runwayDesc') || 'Jelenlegi égetési rátával'}
                  </p>
                </div>

                {/* Trend Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <TrendingUp size={18} className="text-white" />
                    </div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      {t('statistics.cashFlowTrend') || 'Cash-flow Trend'}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {(() => {
                      const proj = computeProjection(projectionMonths);
                      const lastVal = proj[proj.length - 1] || 0;
                      return lastVal >= 0 ? `+${Math.round(lastVal).toLocaleString()}` : Math.round(lastVal).toLocaleString();
                    })()}
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    {t('statistics.projectedBalance') || `Előrejelzett egyenleg ${projectionMonths} hónap múlva`}
                  </p>
                </div>
              </div>

              {/* Projection Chart */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  {t('statistics.cashFlowProjection') || 'Cash-flow Előrejelzés'}
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={computeProjection(projectionMonths).map((val, idx) => ({ month: idx + 1, value: Math.round(val) }))}>
                      <defs>
                        <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(val) => `${val}. hó`}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(val) => val.toLocaleString()}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                        }}
                        formatter={(value: number) => [value.toLocaleString(), 'Előrejelzés']}
                        labelFormatter={(label) => `${label}. hónap`}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorProjection)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Info Text */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                {t('statistics.projectionDisclaimer') || 'Az előrejelzés a múltbeli tranzakciók lineáris regresszióján alapul.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsView;
