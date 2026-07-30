import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BadgeCheck,
  Bot,
  CalendarRange,
  CheckCircle2,
  Flame,
  Goal,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';
import { AIService } from '../../services/AIService';
import {
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
} from '../../config/aiDefaults';
import LinkifiedText from '../common/LinkifiedText';

type TimeRange = 'week' | 'month' | 'year' | 'all';
type TooltipPoint = { color?: string; fill?: string; name?: string; value?: number | string };
type GoalPeriod = 'daily' | 'weekly' | 'monthly';
type GoalMode = 'binary' | 'count';

type HabitGoal = {
  period: GoalPeriod;
  target: number;
  mode: GoalMode;
};

type HabitDayLog = {
  date: string;
  count: number;
  completed: boolean;
};

type Habit = {
  id: string;
  name: string;
  color: string;
  goal: HabitGoal;
  history: Record<string, HabitDayLog>;
  createdAt: string;
  archived?: boolean;
  formed?: boolean;
};

type HabitMetric = {
  id: string;
  name: string;
  color: string;
  adherenceRate: number;
  completedPeriods: number;
  trackedPeriods: number;
  streak: number;
  formed: boolean;
};

type HeatmapCell = {
  date: string;
  label: string;
  completedHabits: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
};

type TimeBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

const HABIT_STORAGE_KEY = 'habit-studio-v3-data';

const pad2 = (n: number) => String(n).padStart(2, '0');
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const startOfWeekMonday = (date: Date) => {
  const day = date.getDay() || 7;
  const current = startOfDay(date);
  current.setDate(current.getDate() - (day - 1));
  return current;
};
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const maxDate = (a: Date, b: Date) => (a.getTime() >= b.getTime() ? a : b);
const minDate = (a: Date, b: Date) => (a.getTime() <= b.getTime() ? a : b);

const toISODateLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

const startOfPeriod = (range: TimeRange, now = new Date(), allStart = new Date(0)) => {
  if (range === 'week') return startOfWeekMonday(now);
  if (range === 'month') return startOfMonth(now);
  if (range === 'year') return startOfYear(now);
  return allStart;
};

const daysBetween = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const truncate = (value: string, max: number) => (value.length <= max ? value : `${value.slice(0, max - 1)}...`);

const normalizeHabit = (raw: unknown): Habit | null => {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Partial<Habit> & { goal?: Partial<HabitGoal>; history?: Record<string, Partial<HabitDayLog>>; text?: string };
  const history: Record<string, HabitDayLog> = {};

  Object.entries(input.history || {}).forEach(([date, log]) => {
    const count = clamp(Number(log?.count ?? (log?.completed ? 1 : 0)), 0, 9999);
    history[date] = { date, count, completed: Boolean(log?.completed) || count >= 1 };
  });

  return {
    id: String(input.id ?? Date.now()),
    name: String(input.name ?? input.text ?? '').trim() || 'Habit',
    color: input.color || '#3B82F6',
    goal: {
      period: input.goal?.period || 'daily',
      target: clamp(Number(input.goal?.target ?? 1), 1, 9999),
      mode: input.goal?.mode || 'binary',
    },
    history,
    createdAt: input.createdAt || new Date().toISOString(),
    archived: Boolean(input.archived),
    formed: Boolean(input.formed),
  };
};

const loadHabits = () => {
  if (typeof window === 'undefined') return [] as Habit[];
  try {
    const raw = window.localStorage.getItem(HABIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const source = Array.isArray(parsed) ? parsed : parsed?.habits;
    if (!Array.isArray(source)) return [];
    return source.map(normalizeHabit).filter((habit): habit is Habit => Boolean(habit));
  } catch (error) {
    console.error(error);
    return [];
  }
};

const getHabitLogValue = (log?: HabitDayLog) => {
  if (!log) return 0;
  return Math.max(log.count || 0, log.completed ? 1 : 0);
};

const getHabitStreak = (habit: Habit, today = new Date()) => {
  let streak = 0;
  for (let i = 0; i < 366; i += 1) {
    const iso = toISODateLocal(addDays(startOfDay(today), -i));
    if (getHabitLogValue(habit.history[iso]) > 0) {
      streak += 1;
      continue;
    }
    if (i > 0) break;
  }
  return streak;
};

const getHabitPeriodStart = (date: Date, period: GoalPeriod) => {
  if (period === 'daily') return startOfDay(date);
  if (period === 'weekly') return startOfWeekMonday(date);
  return startOfMonth(date);
};

const getNextHabitPeriodStart = (date: Date, period: GoalPeriod) => {
  if (period === 'daily') return addDays(date, 1);
  if (period === 'weekly') return addDays(date, 7);
  return addMonths(date, 1);
};

const computeHabitMetric = (habit: Habit, rangeStart: Date, rangeEnd: Date, today: Date): HabitMetric => {
  const createdAt = startOfDay(new Date(habit.createdAt));
  const effectiveStart = maxDate(createdAt, rangeStart);
  if (effectiveStart > rangeEnd) {
    return {
      id: habit.id,
      name: habit.name,
      color: habit.color,
      adherenceRate: 0,
      completedPeriods: 0,
      trackedPeriods: 0,
      streak: getHabitStreak(habit, today),
      formed: Boolean(habit.formed),
    };
  }

  const entries = Object.values(habit.history)
    .map((entry) => ({ ...entry, parsedDate: startOfDay(new Date(entry.date)) }))
    .filter((entry) => !Number.isNaN(entry.parsedDate.getTime()));

  let cursor = getHabitPeriodStart(effectiveStart, habit.goal.period);
  let trackedPeriods = 0;
  let completedPeriods = 0;

  while (cursor <= rangeEnd) {
    const next = getNextHabitPeriodStart(cursor, habit.goal.period);
    const periodStart = maxDate(cursor, effectiveStart);
    const periodEnd = minDate(addDays(next, -1), rangeEnd);
    const actual = entries.reduce((sum, entry) => {
      if (entry.parsedDate < periodStart || entry.parsedDate > periodEnd) return sum;
      return sum + getHabitLogValue(entry);
    }, 0);
    const openingPartial = cursor < effectiveStart;
    const currentOpen = addDays(next, -1) > today;
    if (!(actual < habit.goal.target && (openingPartial || currentOpen))) {
      trackedPeriods += 1;
      if (actual >= habit.goal.target) completedPeriods += 1;
    }
    cursor = next;
  }

  return {
    id: habit.id,
    name: habit.name,
    color: habit.color,
    adherenceRate: trackedPeriods > 0 ? Math.round((completedPeriods / trackedPeriods) * 100) : 0,
    completedPeriods,
    trackedPeriods,
    streak: getHabitStreak(habit, today),
    formed: Boolean(habit.formed),
  };
};

const buildHeatmap = (habits: Habit[], today: Date): HeatmapCell[][] => {
  const start = addDays(startOfWeekMonday(today), -77);
  const activeHabits = habits.filter((habit) => !habit.archived);
  const todayIso = toISODateLocal(today);

  return Array.from({ length: 12 }, (_, weekIndex) => {
    const weekStart = addDays(start, weekIndex * 7);
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const current = addDays(weekStart, dayIndex);
      const iso = toISODateLocal(current);
      const completedHabits = activeHabits.reduce((sum, habit) => sum + (getHabitLogValue(habit.history[iso]) > 0 ? 1 : 0), 0);
      const density = activeHabits.length > 0 ? completedHabits / activeHabits.length : 0;
      let level: HeatmapCell['level'] = 0;
      if (density >= 0.75) level = 4;
      else if (density >= 0.5) level = 3;
      else if (density >= 0.25) level = 2;
      else if (density > 0) level = 1;
      return {
        date: iso,
        label: current.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        completedHabits,
        level,
        isToday: iso === todayIso,
      };
    });
  });
};

const formatBucketLabel = (date: Date, range: TimeRange, locale?: string) => (
  range === 'week' || range === 'month'
    ? date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    : date.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
);

const buildTimeBuckets = (range: TimeRange, start: Date, end: Date, locale?: string): TimeBucket[] => {
  const buckets: TimeBucket[] = [];
  const useDaily = range === 'week' || range === 'month';
  let cursor = useDaily ? startOfDay(start) : startOfMonth(start);

  while (cursor <= end) {
    const bucketStart = useDaily ? startOfDay(cursor) : startOfMonth(cursor);
    const bucketEnd = useDaily ? endOfDay(cursor) : endOfMonth(cursor);
    buckets.push({
      key: useDaily ? toISODateLocal(bucketStart) : `${bucketStart.getFullYear()}-${pad2(bucketStart.getMonth() + 1)}`,
      label: formatBucketLabel(bucketStart, range, locale),
      start: bucketStart,
      end: minDate(bucketEnd, end),
    });
    cursor = useDaily ? addDays(cursor, 1) : addMonths(cursor, 1);
  }

  return buckets;
};

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

const StatisticsView: React.FC = () => {
  const { t, language } = useLanguage();
  const { plans, goals } = useData();
  const { settings } = useSettings();

  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [isDark, setIsDark] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const apiKey = settings.aiConfig?.provider === 'deepseek'
    ? settings.aiConfig.apiKey
    : (import.meta.env.VITE_DEEPSEEK_API_KEY || '');

  const locale = useMemo(() => {
    const locales: Record<string, string> = {
      hu: 'hu-HU',
      en: 'en-US',
      de: 'de-DE',
      es: 'es-ES',
      ro: 'ro-RO',
    };
    return locales[language];
  }, [language]);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const syncHabits = () => setHabits(loadHabits());
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncHabits();
    };

    syncHabits();
    window.addEventListener('focus', syncHabits);
    window.addEventListener('storage', syncHabits);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', syncHabits);
      window.removeEventListener('storage', syncHabits);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = startOfDay(now);
  const rangeEnd = endOfDay(now);

  const allStart = useMemo(() => {
    const dates: Date[] = [];

    (plans ?? []).forEach((plan) => {
      if (!plan?.date) return;
      const dt = startOfDay(new Date(plan.date));
      if (!Number.isNaN(dt.getTime())) dates.push(dt);
    });

    (goals ?? []).forEach((goal) => {
      const created = startOfDay(new Date(goal.createdAt));
      if (!Number.isNaN(created.getTime())) dates.push(created);
      if (goal.targetDate) {
        const target = startOfDay(new Date(goal.targetDate));
        if (!Number.isNaN(target.getTime())) dates.push(target);
      }
    });

    habits.forEach((habit) => {
      const created = startOfDay(new Date(habit.createdAt));
      if (!Number.isNaN(created.getTime())) dates.push(created);
      Object.keys(habit.history).forEach((iso) => {
        const logged = startOfDay(new Date(iso));
        if (!Number.isNaN(logged.getTime())) dates.push(logged);
      });
    });

    if (!dates.length) return startOfMonth(now);
    return dates.reduce((earliest, current) => (current < earliest ? current : earliest), dates[0]);
  }, [goals, habits, now, plans]);

  const rangeStart = useMemo(() => startOfPeriod(timeRange, now, allStart), [allStart, now, timeRange]);
  const timeBuckets = useMemo(() => buildTimeBuckets(timeRange, rangeStart, rangeEnd, locale), [locale, rangeEnd, rangeStart, timeRange]);

  const taskEngine = useMemo(() => {
    const filtered = (plans ?? []).filter((plan) => {
      if (!plan?.date) return false;
      const dt = new Date(plan.date);
      if (Number.isNaN(dt.getTime())) return false;
      return dt >= rangeStart && dt <= rangeEnd;
    });

    const total = filtered.length;
    const completed = filtered.filter((plan) => Boolean(plan.completed)).length;
    const pending = Math.max(0, total - completed);
    const score = total > 0 ? Math.round((completed / total) * 100) : 0;

    const priorities = { high: 0, medium: 0, low: 0 };
    filtered.forEach((plan) => {
      const priority = String(plan.priority ?? 'medium').toLowerCase();
      if (priority === 'high') priorities.high += 1;
      else if (priority === 'low') priorities.low += 1;
      else priorities.medium += 1;
    });

    const series = timeBuckets.map((bucket) => {
      const matching = filtered.filter((plan) => {
        const dt = new Date(plan.date as Date);
        return dt >= bucket.start && dt <= bucket.end;
      });
      return {
        key: bucket.key,
        label: bucket.label,
        planned: matching.length,
        completed: matching.filter((plan) => Boolean(plan.completed)).length,
      };
    });

    const overdue = filtered.filter((plan) => !plan.completed && plan.date && startOfDay(new Date(plan.date)) < today).length;
    const daysElapsed = Math.max(1, daysBetween(rangeStart, today) + 1);
    const velocity = completed / daysElapsed;

    return {
      total,
      completed,
      pending,
      score,
      priorities,
      series,
      overdue,
      velocity: Number.isFinite(velocity) ? velocity : 0,
    };
  }, [plans, rangeEnd, rangeStart, timeBuckets, today]);

  const goalEngine = useMemo(() => {
    const relevant = (goals ?? []).filter((goal) => {
      const createdAt = startOfDay(new Date(goal.createdAt));
      const targetDate = goal.targetDate ? startOfDay(new Date(goal.targetDate)) : null;
      return createdAt <= rangeEnd && (!targetDate || targetDate >= rangeStart);
    });

    const normalized = relevant.map((goal) => {
      const progress = clamp(Number(goal.progress ?? 0), 0, 100);
      const completedGoal = goal.status === 'completed' || progress >= 100;
      const targetDate = goal.targetDate ? startOfDay(new Date(goal.targetDate)) : null;
      return { ...goal, progress, completedGoal, targetDate };
    });

    const total = normalized.length;
    const completed = normalized.filter((goal) => goal.completedGoal).length;
    const avgProgress = Math.round(average(normalized.map((goal) => goal.progress)));
    const overdue = normalized.filter((goal) => !goal.completedGoal && goal.targetDate && goal.targetDate < today).length;
    const dueSoon = normalized.filter((goal) => {
      if (goal.completedGoal || !goal.targetDate) return false;
      const distance = daysBetween(today, goal.targetDate);
      return distance >= 0 && distance <= 14;
    }).length;

    const statusLabels: Record<string, string> = {
      'not-started': t('statistics.goalStatusNotStarted'),
      'in-progress': t('goals.filterInProgress'),
      completed: t('statistics.completed'),
      paused: t('statistics.goalStatusPaused'),
    };

    const statusColors: Record<string, string> = {
      completed: '#22c55e',
      'in-progress': '#38bdf8',
      paused: '#f59e0b',
      'not-started': '#94a3b8',
    };

    const statusMap = normalized.reduce<Record<string, number>>((acc, goal) => {
      const status = goal.completedGoal ? 'completed' : goal.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const statusData = Object.entries(statusMap)
      .map(([status, value]) => ({
        status,
        value,
        label: statusLabels[status] || status,
        color: statusColors[status] || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value);

    const progressBoard = normalized
      .slice()
      .sort((a, b) => {
        if (a.completedGoal !== b.completedGoal) return Number(a.completedGoal) - Number(b.completedGoal);
        if (a.targetDate && b.targetDate) return a.targetDate.getTime() - b.targetDate.getTime();
        if (a.targetDate) return -1;
        if (b.targetDate) return 1;
        return b.progress - a.progress;
      })
      .slice(0, 6)
      .map((goal) => ({
        id: goal.id,
        title: truncate(goal.title, 30),
        progress: goal.progress,
        color: goal.completedGoal ? '#22c55e' : goal.status === 'paused' ? '#f59e0b' : '#fb7185',
        dueLabel: goal.targetDate ? goal.targetDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) : t('statistics.noDeadline'),
      }));

    return { total, completed, avgProgress, overdue, dueSoon, statusData, progressBoard };
  }, [goals, locale, rangeEnd, rangeStart, t, today]);

  const habitEngine = useMemo(() => {
    const activeHabits = habits.filter((habit) => !habit.archived);
    const metrics = activeHabits.map((habit) => computeHabitMetric(habit, rangeStart, rangeEnd, today));
    const consistency = Math.round(average(metrics.map((metric) => metric.adherenceRate)));
    const formed = metrics.filter((metric) => metric.formed).length;
    const bestStreak = metrics.reduce((best, metric) => Math.max(best, metric.streak), 0);

    const actionsByBucket = timeBuckets.reduce<Record<string, number>>((acc, bucket) => {
      acc[bucket.key] = activeHabits.reduce((sum, habit) => {
        const logged = Object.values(habit.history).reduce((historySum, entry) => {
          const parsed = startOfDay(new Date(entry.date));
          if (Number.isNaN(parsed.getTime()) || parsed < bucket.start || parsed > bucket.end) return historySum;
          return historySum + getHabitLogValue(entry);
        }, 0);
        return sum + logged;
      }, 0);
      return acc;
    }, {});

    const adherenceBoard = metrics
      .slice()
      .sort((a, b) => {
        if (b.adherenceRate !== a.adherenceRate) return b.adherenceRate - a.adherenceRate;
        return b.streak - a.streak;
      })
      .slice(0, 6)
      .map((metric) => ({
        ...metric,
        name: truncate(metric.name, 24),
      }));

    const heatmap = buildHeatmap(activeHabits, today);

    return {
      total: activeHabits.length,
      consistency,
      formed,
      bestStreak,
      actionsByBucket,
      adherenceBoard,
      heatmap,
    };
  }, [habits, rangeEnd, rangeStart, timeBuckets, today]);

  const performanceSeries = useMemo(() => (
    timeBuckets.map((bucket, index) => ({
      id: `${bucket.key}-${index}`,
      label: bucket.label,
      planned: taskEngine.series[index]?.planned || 0,
      completed: taskEngine.series[index]?.completed || 0,
      habitActions: habitEngine.actionsByBucket[bucket.key] || 0,
    }))
  ), [habitEngine.actionsByBucket, taskEngine.series, timeBuckets]);

  const systemScore = Math.round(average([taskEngine.score, goalEngine.avgProgress, habitEngine.consistency]));
  const hasAnyData = taskEngine.total > 0 || goalEngine.total > 0 || habitEngine.total > 0;

  const handleTimeRange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as TimeRange;
    if (['week', 'month', 'year', 'all'].includes(value)) setTimeRange(value);
  };

  const handleAiAnalysis = async () => {
    if (!apiKey || !hasAnyData) return;

    setIsAnalyzing(true);
    setAiSummary(null);

    try {
      const currentLanguageName = ({ en: 'English', hu: 'Hungarian', de: 'German', es: 'Spanish', ro: 'Romanian' } as Record<string, string>)[language] || 'English';

      const taskSummary = performanceSeries
        .map((row) => `${row.label}: ${row.planned} planned tasks, ${row.completed} completed tasks, ${row.habitActions} habit actions.`)
        .join('\n');

      const goalSummary = goalEngine.progressBoard
        .map((goal) => `${goal.title}: ${goal.progress}% progress, due ${goal.dueLabel}.`)
        .join('\n');

      const habitSummary = habitEngine.adherenceBoard
        .map((habit) => `${habit.name}: ${habit.adherenceRate}% adherence, ${habit.streak} day streak.`)
        .join('\n');

      const prompt = `You are a productivity systems analyst. Analyze the user's real productivity dashboard data and provide a concise but insightful summary with specific observations, strengths, risks, and improvement advice. VERY IMPORTANT: respond entirely in ${currentLanguageName}.

Task system:
${taskSummary}
Totals: ${taskEngine.total} tasks, ${taskEngine.completed} completed, ${taskEngine.pending} pending, ${taskEngine.overdue} overdue, velocity ${taskEngine.velocity.toFixed(2)} tasks/day.

Goals:
Total goals: ${goalEngine.total}, completed: ${goalEngine.completed}, average progress: ${goalEngine.avgProgress}%, overdue goals: ${goalEngine.overdue}, due soon: ${goalEngine.dueSoon}.
${goalSummary || 'No active goal rows.'}

Habits:
Total habits: ${habitEngine.total}, consistency: ${habitEngine.consistency}%, formed habits: ${habitEngine.formed}, best streak: ${habitEngine.bestStreak}.
${habitSummary || 'No active habit rows.'}

Give the answer in 4 short sections: overview, what is working, what is at risk, and next actions.`;

      AIService.setProvider({
        provider: 'deepseek',
        apiKey,
        model: settings.aiConfig?.model || DEFAULT_DEEPSEEK_MODEL,
        baseUrl: settings.aiConfig?.baseUrl || DEFAULT_DEEPSEEK_BASE_URL,
      });

      const result = await AIService.generateText({
        prompt,
        maxTokens: 1200,
        temperature: 0.2,
      });

      setAiSummary(result.text || t('statistics.aiErrorFetch'));
    } catch (error) {
      console.error(error);
      setAiSummary(t('statistics.aiErrorNetwork'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="view-container pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-rose-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)]">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-10 top-0 h-48 w-48 rounded-full bg-rose-400/15 blur-3xl" />
          <div className="absolute right-0 top-12 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200/70 dark:border-rose-900/70 bg-white/80 dark:bg-slate-900/70 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-rose-500 backdrop-blur">
                <BarChart3 size={14} />
                <span>{t('statistics.commandCenter')}</span>
              </div>

              <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
                <span className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 p-3 text-white shadow-lg shadow-rose-500/30">
                  <Activity size={24} />
                </span>
                {t('statistics.title')}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t('statistics.upgradedSubtitle')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 px-4 py-3 shadow-sm backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {t('statistics.systemScore')}
                </div>
                <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{systemScore}%</div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 dark:border-rose-900 bg-white/85 dark:bg-slate-900/80 px-4 py-2.5 shadow-sm backdrop-blur">
                <SlidersHorizontal size={18} className="text-rose-500" />
                <select
                  value={timeRange}
                  onChange={handleTimeRange}
                  className="bg-transparent text-sm font-semibold text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="all">{t('statistics.allTime')}</option>
                  <option value="week">{t('statistics.thisWeek')}</option>
                  <option value="month">{t('statistics.thisMonth')}</option>
                  <option value="year">{t('statistics.thisYear')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<Trophy size={20} />}
              title={t('statistics.systemScore')}
              value={`${systemScore}%`}
              sub={t('statistics.systemScoreDesc')}
              color="rose"
            />
            <KpiCard
              icon={<CheckCircle2 size={20} />}
              title={t('statistics.taskExecution')}
              value={`${taskEngine.score}%`}
              sub={`${taskEngine.completed}/${taskEngine.total} ${t('statistics.kpiTasks')}`}
              color="emerald"
            />
            <KpiCard
              icon={<Target size={20} />}
              title={t('statistics.goalProgress')}
              value={`${goalEngine.avgProgress}%`}
              sub={`${goalEngine.completed}/${goalEngine.total} ${t('statistics.completed').toLowerCase()}`}
              color="cyan"
            />
            <KpiCard
              icon={<Flame size={20} />}
              title={t('statistics.habitConsistency')}
              value={`${habitEngine.consistency}%`}
              sub={`${habitEngine.bestStreak} ${t('statistics.dayStreak')}`}
              color="amber"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.9)]">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                <TrendingUp size={20} className="text-rose-500" />
                {t('statistics.performanceFlow')}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('statistics.performanceFlowDesc')}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">
              <BadgeCheck size={16} />
              <span>{taskEngine.velocity.toFixed(2)} {t('statistics.donePerDay')}</span>
            </div>
          </div>

          <div className="h-[360px]">
            {performanceSeries.some((row) => row.planned > 0 || row.completed > 0 || row.habitActions > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceSeries} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<FancyTooltip />} cursor={{ fill: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(244,114,182,0.08)' }} />
                  <Legend iconType="circle" wrapperStyle={{ color: isDark ? '#e2e8f0' : '#334155', paddingTop: 12 }} />
                  <Bar dataKey="planned" name={t('statistics.plannedTasks')} fill={isDark ? '#475569' : '#cbd5e1'} radius={[10, 10, 0, 0]} barSize={22} />
                  <Bar dataKey="completed" name={t('statistics.completedTasks')} fill="#fb7185" radius={[10, 10, 0, 0]} barSize={22} />
                  <Area type="monotone" dataKey="habitActions" name={t('statistics.habitActions')} stroke="#06b6d4" fill="url(#habitActionsFill)" strokeWidth={3} />
                  <defs>
                    <linearGradient id="habitActionsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={<BarChart3 size={34} />} title={t('statistics.noData')} desc={t('statistics.noDataDesc')} />
            )}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.9)]">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
              <CheckCircle2 size={18} className="text-rose-500" />
              {t('statistics.prioritySummary')}
            </h2>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <PriorityCard label={t('statistics.priorityHigh')} value={taskEngine.priorities.high} icon={<AlertTriangle size={18} />} color="rose" />
              <PriorityCard label={t('statistics.priorityMedium')} value={taskEngine.priorities.medium} icon={<CalendarRange size={18} />} color="amber" />
              <PriorityCard label={t('statistics.priorityLow')} value={taskEngine.priorities.low} icon={<Sparkles size={18} />} color="emerald" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.9)]">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{t('statistics.signalPanel')}</h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-rose-500">{t('statistics.overdueGoals')}</div>
                <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{goalEngine.overdue}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('statistics.overdueGoalsDesc')}</div>
              </div>

              <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-500">{t('statistics.dueSoon')}</div>
                <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{goalEngine.dueSoon}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('statistics.dueSoonDesc')}</div>
              </div>

              <div className="rounded-2xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50 dark:bg-cyan-950/40 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-500">{t('statistics.formedHabits')}</div>
                <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{habitEngine.formed}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('statistics.formedHabitsDesc')}</div>
              </div>

              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-500">{t('statistics.bestStreak')}</div>
                <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{habitEngine.bestStreak}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('statistics.bestStreakDesc')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.9)]">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
              <Goal size={20} className="text-rose-500" />
              {t('statistics.goalStatusMix')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('statistics.goalStatusMixDesc')}</p>
          </div>

          <div className="h-[320px]">
            {goalEngine.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={goalEngine.statusData} dataKey="value" nameKey="label" innerRadius={74} outerRadius={118} paddingAngle={4}>
                    {goalEngine.statusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<FancyTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ color: isDark ? '#e2e8f0' : '#334155' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={<Goal size={34} />} title={t('statistics.noGoals')} desc={t('statistics.noGoalsDesc')} />
            )}
          </div>
        </div>

        <div className="xl:col-span-7 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.9)]">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
              <Target size={20} className="text-cyan-500" />
              {t('statistics.goalProgressBoard')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('statistics.goalProgressBoardDesc')}</p>
          </div>

          <div className="h-[320px]">
            {goalEngine.progressBoard.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={goalEngine.progressBoard} layout="vertical" margin={{ top: 10, right: 16, left: 24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={isDark ? '#334155' : '#e2e8f0'} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="title" width={170} tick={{ fill: isDark ? '#cbd5e1' : '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<FancyTooltip />} />
                  <Bar dataKey="progress" name={t('goals.progress')} radius={[0, 12, 12, 0]}>
                    {goalEngine.progressBoard.map((goal) => (
                      <Cell key={goal.id} fill={goal.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={<Target size={34} />} title={t('statistics.noGoals')} desc={t('statistics.noGoalsDesc')} />
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.9)]">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
              <Flame size={20} className="text-amber-500" />
              {t('statistics.habitAdherenceBoard')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('statistics.habitAdherenceBoardDesc')}</p>
          </div>

          <div className="h-[320px]">
            {habitEngine.adherenceBoard.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={habitEngine.adherenceBoard} layout="vertical" margin={{ top: 10, right: 16, left: 24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={isDark ? '#334155' : '#e2e8f0'} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fill: isDark ? '#cbd5e1' : '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<FancyTooltip />} />
                  <Bar dataKey="adherenceRate" name={t('statistics.habitConsistency')} radius={[0, 12, 12, 0]}>
                    {habitEngine.adherenceBoard.map((habit) => (
                      <Cell key={habit.id} fill={habit.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={<Flame size={34} />} title={t('statistics.noHabits')} desc={t('statistics.noHabitsDesc')} />
            )}
          </div>
        </div>

        <div className="xl:col-span-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.9)]">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
              <CalendarRange size={20} className="text-cyan-500" />
              {t('statistics.habitHeatmap')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('statistics.habitHeatmapDesc')}</p>
          </div>

          {habitEngine.heatmap.length > 0 && habitEngine.total > 0 ? (
            <>
              <div className="grid grid-cols-12 gap-2">
                {habitEngine.heatmap.map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} className="space-y-2">
                    {week.map((cell) => (
                      <div
                        key={cell.date}
                        title={`${cell.label}: ${cell.completedHabits} ${t('statistics.completedHabits')}`}
                        className={`h-5 w-5 rounded-md border transition-transform hover:scale-110 ${cell.isToday ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''}`}
                        style={{
                          backgroundColor:
                            cell.level === 4 ? '#06b6d4' :
                            cell.level === 3 ? '#22c55e' :
                            cell.level === 2 ? '#f59e0b' :
                            cell.level === 1 ? '#fda4af' :
                            (isDark ? '#1e293b' : '#e2e8f0'),
                          borderColor: isDark ? '#334155' : '#cbd5e1',
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <span>{t('statistics.lowerDensity')}</span>
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className="h-3 w-3 rounded-sm"
                      style={{
                        backgroundColor:
                          level === 4 ? '#06b6d4' :
                          level === 3 ? '#22c55e' :
                          level === 2 ? '#f59e0b' :
                          level === 1 ? '#fda4af' :
                          (isDark ? '#1e293b' : '#e2e8f0'),
                      }}
                    />
                  ))}
                </div>
                <span>{t('statistics.higherDensity')}</span>
              </div>
            </>
          ) : (
            <EmptyState icon={<CalendarRange size={34} />} title={t('statistics.noHabits')} desc={t('statistics.noHabitsDesc')} />
          )}
        </div>
      </div>

      <div className="mt-8 relative overflow-hidden rounded-[2rem] border border-blue-100 dark:border-blue-900/50 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.9)]">
        <div className="absolute -right-8 top-0 p-8 opacity-10 pointer-events-none">
          <Bot size={132} className="text-blue-500" />
        </div>

        <div className="relative z-10">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
            <Bot size={20} className="text-blue-500" />
            {t('statistics.aiAnalysisTitle')}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t('statistics.aiAnalysisDesc')}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!apiKey ? (
              <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                <Bot size={18} className="text-slate-400" />
                {t('statistics.aiKeyNeeded')}
              </div>
            ) : (
              <button
                onClick={handleAiAnalysis}
                disabled={isAnalyzing || !hasAnyData}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('statistics.analyzing')}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    {t('statistics.analyzeStats')}
                  </>
                )}
              </button>
            )}
          </div>

          {aiSummary && (
            <div className="mt-6 rounded-[1.5rem] border border-blue-100 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 p-6 shadow-inner">
              <LinkifiedText text={aiSummary} className="prose max-w-none whitespace-pre-wrap text-sm text-slate-800 dark:prose-invert dark:text-slate-200 md:text-base" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ icon: React.ReactNode; title: string; value: string; sub: string; color: string }> = ({ icon, title, value, sub, color }) => {
  const colors: Record<string, string> = {
    rose: 'border-rose-200 dark:border-rose-900 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-900',
    emerald: 'border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900',
    amber: 'border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900',
    cyan: 'border-cyan-200 dark:border-cyan-900 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-slate-900',
  };

  return (
    <div className={`rounded-[1.75rem] border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${colors[color]}`}>
      <div className="mb-4 inline-flex rounded-2xl bg-slate-900/5 dark:bg-white/5 p-3 text-slate-700 dark:text-slate-100">{icon}</div>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</div>
    </div>
  );
};

const PriorityCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => {
  const bg: Record<string, string> = {
    rose: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
  };

  return (
    <div className={`rounded-2xl border p-4 text-center ${bg[color]}`}>
      <div className="mb-2 inline-flex rounded-xl bg-white/80 dark:bg-slate-900/80 p-2 text-slate-700 dark:text-slate-100">{icon}</div>
      <div className="text-2xl font-black text-slate-900 dark:text-white">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/40 p-8 text-center">
    <div className="mb-4 inline-flex rounded-2xl bg-white dark:bg-slate-900 p-4 text-slate-500 dark:text-slate-300 shadow-sm">{icon}</div>
    <div className="text-lg font-bold text-slate-900 dark:text-white">{title}</div>
    <div className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{desc}</div>
  </div>
);

export default StatisticsView;
