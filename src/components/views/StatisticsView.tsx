import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  BarChart3,
  SlidersHorizontal,
  BadgeCheck,
  TrendingUp,
  CheckCircle2,
  Bot,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import LinkifiedText from '../common/LinkifiedText';
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

/* ----------------------------- Types ----------------------------- */

type TimeRange = 'week' | 'month' | 'year' | 'all';
type TooltipPoint = { color?: string; fill?: string; name?: string; value?: number | string };

/* ----------------------------- Utilities ----------------------------- */

const pad2 = (n: number) => String(n).padStart(2, '0');

const toISODateLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

const startOfPeriod = (range: TimeRange, now = new Date()) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (range === 'week') {
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    return d;
  }
  if (range === 'month') {
    d.setDate(1);
    return d;
  }
  d.setMonth(0, 1);
  return d;
};

const daysBetween = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

/* ----------------------------- Tooltip ----------------------------- */

const FancyTooltip: React.FC<{ active?: boolean; payload?: TooltipPoint[]; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-pink-200 dark:border-pink-800 bg-white/95 dark:bg-gray-900/95 shadow-xl px-4 py-3 backdrop-blur">
      <div className="text-sm font-semibold text-gray-900 dark:text-white">{label}</div>
      <div className="mt-2 space-y-1">
        {payload.map((p, i: number) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p?.color || p?.fill }} />
            <span className="opacity-80">{p?.name}:</span>
            <span className="font-mono font-bold">{p?.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ----------------------------- Main ----------------------------- */

const StatisticsView: React.FC = () => {
  const { t, language } = useLanguage();
  const { plans } = useData();

  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [isDark, setIsDark] = useState(false);
  const { settings } = useSettings();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const apiKey = settings.aiConfig?.provider === 'gemini' ? settings.aiConfig.apiKey : (import.meta.env.VITE_GEMINI_API_KEY || '');

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  /* ----------------------------- Tasks Engine ----------------------------- */

  const taskEngine = useMemo(() => {
    const start = timeRange === 'all' ? new Date(0) : startOfPeriod(timeRange, new Date());
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const filtered = (plans ?? []).filter((p) => {
      if (!p?.date) return false;
      const dt = new Date(p.date);
      if (Number.isNaN(dt.getTime())) return false;
      return dt >= start && dt <= end;
    });

    const total = filtered.length;
    const completed = filtered.filter((p) => !!p?.completed).length;
    const pending = Math.max(0, total - completed);
    const score = total > 0 ? Math.round((completed / total) * 100) : 0;

    const pri = { high: 0, medium: 0, low: 0 };
    for (const p of filtered) {
      const v = String(p?.priority ?? '').toLowerCase();
      if (v === 'high') pri.high++;
      else if (v === 'medium') pri.medium++;
      else if (v === 'low') pri.low++;
    }

    const grouped: Record<string, { iso: string; label: string; planned: number; completed: number }> = {};
    for (const p of filtered) {
      if (!p?.date) continue;
      const dt = new Date(p.date);
      if (Number.isNaN(dt.getTime())) continue;
      const iso = toISODateLocal(dt);
      if (!grouped[iso]) {
        grouped[iso] = { iso, label: dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), planned: 0, completed: 0 };
      }
      grouped[iso].planned++;
      if (p?.completed) grouped[iso].completed++;
    }

    const sortedKeys = Object.keys(grouped).sort();
    const series = sortedKeys.slice(-30).map(k => grouped[k]);

    const daysElapsed = Math.max(1, daysBetween(start, new Date()) + 1);
    const velocity = completed / daysElapsed;

    return { start, total, completed, pending, score, pri, series, velocity: Number.isFinite(velocity) ? velocity : 0 };
  }, [plans, timeRange]);

  const handleTimeRange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as TimeRange;
    if (['week', 'month', 'year', 'all'].includes(v)) setTimeRange(v);
  };

  /* ----------------------------- AI Analysis ----------------------------- */

  const handleAiAnalysis = async () => {
    if (!apiKey || plans.length === 0) return;
    setIsAnalyzing(true);
    setAiSummary(null);
    try {
      const currentLanguageName = ({ en: 'English', hu: 'Hungarian', de: 'German', es: 'Spanish', ro: 'Romanian' } as Record<string, string>)[language] || 'English';

      const plansSummary = taskEngine.series.map(s => `${s.label}: ${s.planned} planned, ${s.completed} completed.`).join('\n') +
        `\n\nTotal: ${taskEngine.total} tasks, ${taskEngine.completed} completed, ${taskEngine.pending} pending.`;

      const prompt = `You are a productivity assistant. Analyze the user's tasks and statistics based on the following data, and give advice for better progress. Be friendly, focus on strengths and how to improve on days when fewer tasks are completed. VERY IMPORTANT: You must respond entirely in ${currentLanguageName}.\n\nStatistics:\n${plansSummary}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        setAiSummary(data.candidates[0].content.parts[0].text);
      } else {
        setAiSummary(t('statistics.aiErrorFetch'));
      }
    } catch (error) {
      console.error(error);
      setAiSummary(t('statistics.aiErrorNetwork'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ----------------------------- Render ----------------------------- */

  return (
    <div className="view-container pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/30 px-4 py-1.5 text-xs font-bold text-pink-600 dark:text-pink-400 mb-4">
          <BarChart3 size={14} />
          <span>{t('statistics.title')}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              <span className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 p-3 shadow-lg shadow-pink-500/20">
                <BarChart3 size={24} className="text-white" />
              </span>
              {t('statistics.title')}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('statistics.subtitle')}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-gray-900 px-4 py-2.5 shadow-sm">
            <SlidersHorizontal size={18} className="text-pink-500" />
            <select
              value={timeRange}
              onChange={handleTimeRange}
              className="bg-transparent text-sm font-semibold text-gray-800 dark:text-white focus:outline-none"
            >
              <option value="all">{t('statistics.allTime') || 'Összes'}</option>
              <option value="week">{t('statistics.thisWeek') || 'Ez a hét'}</option>
              <option value="month">{t('statistics.thisMonth') || 'Ez a hónap'}</option>
              <option value="year">{t('statistics.thisYear') || 'Ez az év'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards - Full Width */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard icon="🎯" title={t('statistics.kpiScore')} value={`${taskEngine.score}%`} sub={`${taskEngine.completed}/${taskEngine.total}`} color="pink" />
        <KpiCard icon="✅" title={t('statistics.kpiCompleted')} value={String(taskEngine.completed)} sub={t('statistics.kpiTasks')} color="emerald" />
        <KpiCard icon="⏳" title={t('statistics.kpiPending')} value={String(taskEngine.pending)} sub={t('statistics.kpiWaiting')} color="amber" />
        <KpiCard icon="📈" title={t('statistics.kpiVelocity')} value={taskEngine.velocity.toFixed(1)} sub={t('statistics.donePerDay')} color="violet" />
      </div>

      {/* Main Chart */}
      <div className="rounded-3xl border border-pink-100 dark:border-pink-900/50 bg-white dark:bg-gray-900 p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-pink-500" />
              {t('statistics.taskTrend')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('statistics.taskTrendDesc')}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <BadgeCheck size={16} />
            <span>{taskEngine.velocity.toFixed(2)} {t('statistics.donePerDay')}</span>
          </div>
        </div>

        <div className="h-[320px]">
          {taskEngine.series.length > 0 && taskEngine.series.some(x => x.planned > 0 || x.completed > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskEngine.series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#fce7f3'} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: isDark ? '#e5e7eb' : '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: isDark ? '#e5e7eb' : '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<FancyTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(236,72,153,0.05)' }} />
                <Legend iconType="circle" wrapperStyle={{ color: isDark ? '#e5e7eb' : '#374151' }} />
                <Bar dataKey="planned" name={t('statistics.planned')} fill={isDark ? '#4b5563' : '#fce7f3'} radius={[8, 8, 0, 0]} />
                <Bar dataKey="completed" name={t('statistics.completed')} fill="#ec4899" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📅" title={t('statistics.noData')} desc={t('statistics.noDataDesc')} />
          )}
        </div>
      </div>

      {/* Priority Stats */}
      <div className="rounded-3xl border border-pink-100 dark:border-pink-900/50 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-pink-500" />
          {t('statistics.prioritySummary')}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <PriorityCard label={t('statistics.priorityHigh')} value={taskEngine.pri.high} emoji="🔥" color="rose" />
          <PriorityCard label={t('statistics.priorityMedium')} value={taskEngine.pri.medium} emoji="⚡" color="amber" />
          <PriorityCard label={t('statistics.priorityLow')} value={taskEngine.pri.low} emoji="🌿" color="emerald" />
        </div>
      </div>

      {/* AI Assistant Section */}
      <div className="rounded-3xl border border-blue-100 dark:border-blue-900/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6 shadow-sm mt-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Bot size={120} className="text-blue-500" />
        </div>

        <div className="relative z-10">
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-blue-500" />
            {t('statistics.aiAnalysisTitle')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-2xl">
            {t('statistics.aiAnalysisDesc')}
          </p>

          {!apiKey ? (
            <div className="inline-flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              <Bot size={18} className="text-gray-400" />
              {t('statistics.aiKeyNeeded')}
            </div>
          ) : (
            <button
              onClick={handleAiAnalysis}
              disabled={isAnalyzing || plans.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('statistics.analyzing')}
                </>
              ) : (
                <>
                  <Bot size={18} />
                  {t('statistics.analyzeStats')}
                </>
              )}
            </button>
          )}

          {aiSummary && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-blue-100 dark:border-gray-700 shadow-inner">
              <LinkifiedText text={aiSummary} className="text-gray-800 dark:text-gray-200 prose dark:prose-invert max-w-none text-sm md:text-base whitespace-pre-wrap" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ----------------------------- Components ----------------------------- */

const KpiCard: React.FC<{ icon: string; title: string; value: string; sub: string; color: string }> = ({ icon, title, value, sub, color }) => {
  const colors: Record<string, string> = {
    pink: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    violet: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800',
  };

  return (
    <div className={`rounded-2xl border p-5 ${colors[color]} transition-all hover:shadow-md`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</div>
      <div className="text-3xl font-black text-gray-900 dark:text-white mt-1">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{sub}</div>
    </div>
  );
};

const PriorityCard: React.FC<{ label: string; value: number; emoji: string; color: string }> = ({ label, value, emoji, color }) => {
  const bg: Record<string, string> = {
    rose: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
  };

  return (
    <div className={`rounded-2xl border p-4 text-center ${bg[color]}`}>
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="text-2xl font-black text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
};

const EmptyState: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/20 p-8 text-center">
    <div className="text-4xl mb-4">{icon}</div>
    <div className="text-lg font-bold text-gray-900 dark:text-white">{title}</div>
    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</div>
  </div>
);

export default StatisticsView;
