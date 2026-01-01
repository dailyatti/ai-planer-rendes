import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  BarChart3, TrendingUp,
  Activity, Target,
  X, Wallet, Clock, CheckCircle2, AlertCircle,
  Calendar, Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend, ComposedChart, Bar
} from 'recharts';

/**
 * Custom hook for closing modals on Escape key
 */
const useEscapeKey = (onClose: () => void) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
};

// Safe date helper
const toISODate = (d: Date) => {
  try {
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return 'Invalid Date';
  }
};

const CustomTooltip = ({ active, payload, label, darkMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} p-4 rounded-xl shadow-2xl border`}>
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="opacity-80">{entry.name}:</span>
            <span className="font-bold font-mono">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const StatisticsView: React.FC = () => {
  const { t } = useLanguage();
  const { plans, goals, transactions, computeProjection, computeRunway, budgetSettings } = useData();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [projectionMonths, setProjectionMonths] = useState(12);

  // Detect Dark Mode for charts
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // --- MATHEMATICAL MODELING & DATA PROCESSING ---

  // 1. Task Metrics Engine (Memoized)
  const taskMetrics = useMemo(() => {
    const now = new Date();
    // Strict start of periods
    const startOfPeriod = new Date();
    startOfPeriod.setHours(0, 0, 0, 0);

    if (timeRange === 'week') {
      const day = startOfPeriod.getDay() || 7; // Get current day number, convert Sun(0) to 7
      if (day !== 1) startOfPeriod.setHours(-24 * (day - 1)); // Set to Monday
    } else if (timeRange === 'month') {
      startOfPeriod.setDate(1);
    } else {
      startOfPeriod.setMonth(0, 1);
    }

    const filteredPlans = plans.filter(p => {
      const pDate = new Date(p.date);
      if (Number.isNaN(pDate.getTime())) return false;
      return pDate >= startOfPeriod; // Show everything from start of period onwards (including future in this period)
    });

    const total = filteredPlans.length;
    const completed = filteredPlans.filter(p => p.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Velocity: Tasks / Day (simplified)
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - startOfPeriod.getTime()) / (1000 * 60 * 60 * 24)));
    const velocity = completed / daysElapsed;

    // Projected finish
    const daysToFinish = velocity > 0 ? pending / velocity : 999;

    // Priority Distribution
    const priorityCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    filteredPlans.forEach(p => {
      const prio = p.priority?.toLowerCase() || 'medium';
      if (priorityCounts[prio] !== undefined) {
        priorityCounts[prio]++;
      } else {
        priorityCounts['other'] = (priorityCounts['other'] || 0) + 1;
      }
    });

    return {
      total,
      completed,
      pending,
      score: Math.round(completionRate),
      priorityCounts,
      filteredPlans,
      velocity: velocity.toFixed(1),
      daysToFinish: Math.round(daysToFinish)
    };
  }, [plans, timeRange]);

  // 2. Goal Progress Engine
  const goalMetrics = useMemo(() => {
    const activeGoals = goals.filter(g => g.status === 'in-progress');
    const totalProgress = activeGoals.reduce((acc, g) => acc + g.progress, 0);
    const avgProgress = activeGoals.length > 0 ? Math.round(totalProgress / activeGoals.length) : 0;
    return { activeCount: activeGoals.length, avgProgress };
  }, [goals]);

  // 3. Financial Engine Integrations (Memoized)
  const financialMetrics = useMemo(() => {
    const runway = computeRunway();
    const projection = computeProjection(projectionMonths);

    // Calculate trend from projection (last vs first)
    const startBalance = projection[0] || 0;
    const endBalance = projection[projection.length - 1] || 0;
    const growth = startBalance !== 0 ? ((endBalance - startBalance) / Math.abs(startBalance)) * 100 : 0;

    return { runway, projection, growth };
  }, [computeRunway, computeProjection, projectionMonths, transactions]); // Re-run when transactions change

  // 4. Chart Data Construction (with ISO Fix)
  const chartData = useMemo(() => {
    const groupedByDate: Record<string, { iso: string; label: string; completed: number; planned: number }> = {};

    taskMetrics.filteredPlans.forEach(p => {
      const d = new Date(p.date);
      const iso = toISODate(d);
      if (iso === 'Invalid Date') return;

      if (!groupedByDate[iso]) {
        groupedByDate[iso] = {
          iso,
          label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
          completed: 0,
          planned: 0
        };
      }
      groupedByDate[iso].planned++;
      if (p.completed) groupedByDate[iso].completed++;
    });

    return Object.values(groupedByDate).sort((a, b) => a.iso.localeCompare(b.iso));
  }, [taskMetrics.filteredPlans]);

  const priorityChartData = useMemo(() => [
    { name: t('priority.high') || 'Magas', value: taskMetrics.priorityCounts.high, color: '#ef4444' },
    { name: t('priority.medium') || 'Közepes', value: taskMetrics.priorityCounts.medium, color: '#f59e0b' },
    { name: t('priority.low') || 'Alacsony', value: taskMetrics.priorityCounts.low, color: '#10b981' },
    ...(taskMetrics.priorityCounts.other ? [{ name: 'Egyéb', value: taskMetrics.priorityCounts.other, color: '#94a3b8' }] : [])
  ].filter(d => d.value > 0), [taskMetrics.priorityCounts]);

  // Handle time range change safely
  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'week' || val === 'month' || val === 'year') {
      setTimeRange(val);
    }
  };

  return (
    <div className="view-container animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="view-title flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/20">
              <BarChart3 size={28} className="text-white" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
              {t('statistics.title')}
            </span>
          </h1>
          <p className="view-subtitle mt-2 max-w-2xl">
            {t('statistics.subtitle')} •
            <span className="text-indigo-600 dark:text-indigo-400 font-medium ml-2">
              {taskMetrics.score >= 80 ? '🚀 Kiváló teljesítmény!' : taskMetrics.score >= 50 ? '⚡ Jó haladás' : '🔧 Van hova fejlődni'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <button
            className="btn-ghost px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium"
            onClick={() => setShowFinancialModal(true)}
          >
            <div className="flex items-center gap-2">
              <Wallet size={18} />
              <span>Pénzügyi Modell</span>
            </div>
          </button>
          <div className="w-[1px] h-6 bg-gray-200 dark:bg-gray-700" />
          <select
            value={timeRange}
            onChange={handleTimeRangeChange}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer text-gray-700 dark:text-gray-200"
          >
            <option value="week">{t('statistics.thisWeek')}</option>
            <option value="month">{t('statistics.thisMonth')}</option>
            <option value="year">{t('statistics.thisYear')}</option>
          </select>
        </div>
      </div>

      {/* KPI Grid - PhD Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Productivity Card */}
        <div className="relative group overflow-hidden bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={80} className="text-indigo-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium mb-2">
              <Activity size={18} />
              <span>{t('statistics.productivityScore')}</span>
            </div>
            <div className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {taskMetrics.score}<span className="text-2xl text-gray-400 ml-1">%</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex -space-x-1">
                {[...Array(Math.min(3, taskMetrics.completed))].map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <CheckCircle2 size={10} className="text-indigo-600" />
                  </div>
                ))}
              </div>
              <span>{taskMetrics.completed} / {taskMetrics.total} feladat kész</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </div>

        {/* Goal Velocity Card */}
        <div className="relative group overflow-hidden bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target size={80} className="text-emerald-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium mb-2">
              <Target size={18} />
              <span>Célok & Sebesség</span>
            </div>
            <div className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {goalMetrics.avgProgress}<span className="text-2xl text-gray-400 ml-1">%</span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Zap size={14} className="text-amber-500" />
                <span>{taskMetrics.velocity} feladat / nap</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </div>

        {/* Financial Health Card - Real Data */}
        <div className="relative group overflow-hidden bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={80} className="text-blue-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium mb-2">
              <Wallet size={18} />
              <span>Pénzügyi Egészség</span>
            </div>
            <div className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">
              {financialMetrics.growth >= 0 ? '+' : ''}{Math.round(financialMetrics.growth)}%
            </div>
            <div className="text-sm text-gray-500">
              Növekedési előrejelzés ({projectionMonths} hó)
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </div>

        {/* Runway Card - Real Data */}
        <div className="relative group overflow-hidden bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={80} className="text-rose-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium mb-2">
              <Clock size={18} />
              <span>{t('statistics.runway') || 'Runway'}</span>
            </div>
            <div className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {financialMetrics.runway !== null ? financialMetrics.runway : '∞'}
              <span className="text-xl text-gray-400 ml-1">hó</span>
            </div>
            <div className="text-sm text-gray-500">
              {financialMetrics.runway && financialMetrics.runway < 3 ? (
                <span className="flex items-center gap-1 text-rose-500 font-semibold">
                  <AlertCircle size={14} /> Kritikus zóna!
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <CheckCircle2 size={14} /> Biztonságos
                </span>
              )}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Productivity Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Teljesítmény Trend</h3>
              <p className="text-sm text-gray-500">Tervezett vs. Befejezett feladatok alakulása</p>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <BarChart3 size={20} className="text-gray-400" />
            </div>
          </div>

          <div className="h-[350px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#f3f4f6'} vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip darkMode={isDarkMode} />} cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar
                    dataKey="planned"
                    name={t('statistics.planned') || 'Tervezett'}
                    fill={isDarkMode ? '#374151' : '#e5e7eb'}
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name={t('statistics.completed') || 'Kész'}
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#colorCompleted)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <Calendar size={48} className="mb-4 opacity-50" />
                <p>Nincs adat erre az időszakra</p>
              </div>
            )}
          </div>
        </div>

        {/* Priority Distribution & Insight */}
        <div className="flex flex-col gap-6">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Fókusz Eloszlás</h3>
            <div className="h-[250px] w-full relative">
              {priorityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={priorityChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip darkMode={isDarkMode} />} />
                    <Legend verticalAlign="bottom" height={36} />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">Nincs adat</div>
              )}
              {/* Center Text */}
              {priorityChartData.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="block text-3xl font-bold tracking-tighter text-gray-900 dark:text-white">
                      {taskMetrics.completed}
                    </span>
                    <span className="text-xs uppercase font-bold text-gray-400 tracking-widest">Kész</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Smart Insight Mini-Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Zap size={24} className="text-yellow-300" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">AI Insight</h4>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  {taskMetrics.daysToFinish < 7
                    ? "Kiváló tempó! A jelenlegi sebességgel minden függő feladatot időben befejezhetsz."
                    : "A feladatok torlódnak. Javaslom a prioritások felülvizsgálatát a következő napokra."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Model Modal */}
      {showFinancialModal && (
        <FinancialModal
          onClose={() => setShowFinancialModal(false)}
          data={{
            projection: financialMetrics.projection,
            runway: financialMetrics.runway,
            projectionMonths,
            setProjectionMonths,
            currency: budgetSettings.currency
          }}
          t={t}
          darkMode={isDarkMode}
        />
      )}
    </div>
  );
};

// Extracted Modal Component for Cleaner Main File
const FinancialModal = ({ onClose, data, t, darkMode }: any) => {
  useEscapeKey(onClose);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const chartData = useMemo(() =>
    data.projection.map((val: number, idx: number) => ({ month: idx + 1, value: Math.round(val) }))
    , [data.projection]);

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-up border border-gray-200 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600 dark:text-blue-400">
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('statistics.financialModel')}</h2>
              <p className="text-gray-500 text-sm">Valós idejű cash-flow szimuláció és kifutópálya elemzés</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {/* Controls */}
          <div className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <label className="flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              <span>Előrejelzési időtartam</span>
              <span className="text-indigo-600 dark:text-indigo-400 text-lg">{data.projectionMonths} hónap</span>
            </label>
            <input
              type="range"
              min="3" max="36"
              value={data.projectionMonths}
              onChange={(e) => data.setProjectionMonths(parseInt(e.target.value))}
              className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium uppercase tracking-wider">
              <span>3 Hónap</span>
              <span>3 Év</span>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 mb-8 shadow-inner">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-500" /> Cash-flow Előrejelzés
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `+${v} hó`}
                    tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v.toLocaleString(undefined, { notation: 'compact' })}
                    tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Egyenleg"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fill="url(#colorProj)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;
