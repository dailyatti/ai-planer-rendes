import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  BarChart3,
  Target,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Plus,
  Trash2,
  X,
  Flame,
  Sparkles,
  SlidersHorizontal,
  ClipboardList,
  BadgeCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

/* ----------------------------- Types (local) ----------------------------- */

type TimeRange = 'week' | 'month' | 'year' | 'all';

type HabitFrequency = 'daily' | 'weekly';

type Habit = {
  id: string;
  name: string;
  description?: string;
  frequency: HabitFrequency;          // daily / weekly
  targetPerWeek: number;              // 1..7 (even for daily, this is useful)
  mastery: number;                    // 0..100 (slider)
  createdAtISO: string;               // YYYY-MM-DD
  checkinsISO: string[];              // list of YYYY-MM-DD dates when done
};

type NewHabitDraft = {
  name: string;
  description: string;
  frequency: HabitFrequency;
  targetPerWeek: number;
  mastery: number;
};

/* ----------------------------- Utilities ----------------------------- */

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const pad2 = (n: number) => String(n).padStart(2, '0');

const toISODateLocal = (d: Date) => {
  // local date to YYYY-MM-DD (safe for sorting + local day boundaries)
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

const parseISOToDate = (iso: string) => {
  // iso: YYYY-MM-DD -> local Date at midnight
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const startOfPeriod = (range: TimeRange, now = new Date()) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);

  if (range === 'week') {
    // Monday-start week
    const day = d.getDay() || 7; // Mon=1..Sun=7
    d.setDate(d.getDate() - (day - 1));
    return d;
  }
  if (range === 'month') {
    d.setDate(1);
    return d;
  }
  // year
  d.setMonth(0, 1);
  return d;
};

const daysBetween = (a: Date, b: Date) => {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const lastNDaysISO = (n: number, now = new Date()) => {
  const res: string[] = [];
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    res.push(toISODateLocal(x));
  }
  return res;
};

const uid = () => {
  // simple id good enough for local UI
  return `h_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
};

const STORAGE_KEY = 'planner.statistics.habits.v1';

const loadHabits = (): Habit[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // light validation
    return parsed
      .filter(Boolean)
      .map((h: any) => ({
        id: String(h.id ?? uid()),
        name: String(h.name ?? 'Új szokás'),
        description: typeof h.description === 'string' ? h.description : '',
        frequency: h.frequency === 'weekly' ? 'weekly' : 'daily',
        targetPerWeek: clamp(Number(h.targetPerWeek ?? 7), 1, 7),
        mastery: clamp(Number(h.mastery ?? 0), 0, 100),
        createdAtISO: typeof h.createdAtISO === 'string' ? h.createdAtISO : toISODateLocal(new Date()),
        checkinsISO: Array.isArray(h.checkinsISO) ? h.checkinsISO.filter((x: any) => typeof x === 'string') : [],
      }));
  } catch {
    return [];
  }
};

const saveHabits = (habits: Habit[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
};

/**
 * Habit strength model (simple but strong):
 * - We compute last 28 days completion series (0/1)
 * - EMA smoothing (alpha=0.22) -> momentum
 * - Combine with mastery slider + streak bonus
 */
const computeHabitStrength = (habit: Habit, now = new Date()) => {
  const last28 = lastNDaysISO(28, now);
  const checkins = new Set(habit.checkinsISO);

  const series = last28.map(d => (checkins.has(d) ? 1 : 0));

  // EMA
  const alpha = 0.22;
  let ema = 0;
  for (const x of series) ema = alpha * x + (1 - alpha) * ema;

  // streak (consecutive days ending today)
  const today = toISODateLocal(now);
  let streak = 0;
  let cursor = parseISOToDate(today);
  while (true) {
    const iso = toISODateLocal(cursor);
    if (!checkins.has(iso)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 365) break;
  }

  const last7 = lastNDaysISO(7, now);
  const last7Done = last7.reduce((acc, d) => acc + (checkins.has(d) ? 1 : 0), 0);
  const last7Rate = last7Done / 7;

  // Streak bonus saturates
  const streakBonus = 1 - Math.exp(-streak / 6); // 0..~1
  const mastery = habit.mastery / 100;

  // strength 0..100
  const strength =
    100 *
    clamp(
      0.45 * ema + 0.35 * mastery + 0.20 * (0.6 * last7Rate + 0.4 * streakBonus),
      0,
      1
    );

  return {
    strength: Math.round(strength),
    streak,
    last7Done,
    last7Rate: Math.round(last7Rate * 100),
  };
};

/* ----------------------------- UI Helpers ----------------------------- */

const useEscape = (enabled: boolean, onEsc: () => void) => {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEsc();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onEsc]);
};

const ScrollLock: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  useEffect(() => {
    if (!enabled) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [enabled]);
  return null;
};

const FancyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 shadow-2xl px-4 py-3 backdrop-blur">
      <div className="text-sm font-semibold text-gray-900 dark:text-white">{label}</div>
      <div className="mt-2 space-y-1">
        {payload.map((p: any, i: number) => {
          const dot = p?.color || p?.fill || p?.stroke || '#94a3b8';
          const val = typeof p?.value === 'number' ? p.value.toLocaleString() : String(p?.value ?? '');
          return (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dot }} />
              <span className="opacity-80">{p?.name ?? 'Érték'}:</span>
              <span className="font-mono font-bold">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ----------------------------- Main Component ----------------------------- */

const StatisticsView: React.FC = () => {
  const { t } = useLanguage();
  const { plans, goals } = useData();

  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Habits: local to this view
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showHabitModal, setShowHabitModal] = useState(false);

  // simple dark mode detection for charts
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    // load once
    setHabits(loadHabits());
  }, []);

  useEffect(() => {
    // persist
    saveHabits(habits);
  }, [habits]);



  /* ----------------------------- Tasks & Goals ----------------------------- */

  const taskEngine = useMemo(() => {
    const start = timeRange === 'all' ? new Date(0) : startOfPeriod(timeRange, new Date());
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const filtered = (plans ?? []).filter((p: any) => {
      const dt = new Date(p?.date);
      if (Number.isNaN(dt.getTime())) return false;
      // "this period so far" or all time
      return dt >= start && dt <= end;
    });

    const total = filtered.length;
    const completed = filtered.filter((p: any) => !!p?.completed).length;
    const pending = Math.max(0, total - completed);
    const score = total > 0 ? Math.round((completed / total) * 100) : 0;

    // priority counts
    const pri = { high: 0, medium: 0, low: 0, other: 0 };
    for (const p of filtered) {
      const v = String(p?.priority ?? '').toLowerCase();
      if (v === 'high') pri.high++;
      else if (v === 'medium') pri.medium++;
      else if (v === 'low') pri.low++;
      else pri.other++;
    }

    // timeline: group by ISO day
    const grouped: Record<string, { iso: string; label: string; planned: number; completed: number }> = {};
    for (const p of filtered) {
      const dt = new Date(p?.date);
      if (Number.isNaN(dt.getTime())) continue;
      const iso = toISODateLocal(dt);
      if (!grouped[iso]) {
        grouped[iso] = {
          iso,
          label: dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          planned: 0,
          completed: 0,
        };
      }
      grouped[iso].planned++;
      if (p?.completed) grouped[iso].completed++;
    }

    // ensure continuous axis (nice charts)
    const startISO = toISODateLocal(start);
    const endISO = toISODateLocal(new Date());
    const s = parseISOToDate(startISO);
    const e = parseISOToDate(endISO);
    const days = clamp(daysBetween(s, e) + 1, 1, 370);

    const series: { iso: string; label: string; planned: number; completed: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      const iso = toISODateLocal(d);
      const base = grouped[iso] ?? {
        iso,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        planned: 0,
        completed: 0,
      };
      series.push(base);
    }

    // velocity (completed/day) + “ETA” proxy
    const daysElapsed = Math.max(1, daysBetween(start, new Date()) + 1);
    const velocity = completed / daysElapsed;
    const etaDays = velocity > 0 ? Math.round(pending / velocity) : null;

    return {
      start,
      total,
      completed,
      pending,
      score,
      pri,
      series,
      velocity: Number.isFinite(velocity) ? velocity : 0,
      etaDays,
    };
  }, [plans, timeRange]);

  const goalEngine = useMemo(() => {
    const g = goals ?? [];
    const active = g.filter((x: any) => x?.status === 'in-progress' || x?.status === 'active');
    const done = g.filter((x: any) => x?.status === 'completed' || x?.status === 'done');

    const avgActiveProgress = active.length
      ? Math.round(active.reduce((acc: number, x: any) => acc + (Number(x?.progress) || 0), 0) / active.length)
      : 0;

    // distribution buckets
    const buckets = [
      { name: '0–24%', value: 0, color: '#94a3b8' },
      { name: '25–49%', value: 0, color: '#60a5fa' },
      { name: '50–74%', value: 0, color: '#34d399' },
      { name: '75–100%', value: 0, color: '#a78bfa' },
    ];

    for (const x of active) {
      const p = clamp(Number(x?.progress) || 0, 0, 100);
      if (p < 25) buckets[0].value++;
      else if (p < 50) buckets[1].value++;
      else if (p < 75) buckets[2].value++;
      else buckets[3].value++;
    }

    return {
      active,
      done,
      avgActiveProgress,
      buckets: buckets.filter(b => b.value > 0),
    };
  }, [goals]);

  /* ----------------------------- Habits Engine ----------------------------- */

  const habitEngine = useMemo(() => {
    const todayISO = toISODateLocal(new Date());
    const last7 = lastNDaysISO(7, new Date());

    const computed = habits.map(h => {
      const s = computeHabitStrength(h, new Date());
      const doneToday = new Set(h.checkinsISO).has(todayISO);
      const weekDone = last7.reduce((acc, d) => acc + (h.checkinsISO.includes(d) ? 1 : 0), 0);

      // a “compliance” score vs target
      const target = clamp(h.targetPerWeek, 1, 7);
      const compliance = Math.round((weekDone / target) * 100);

      return {
        ...h,
        ...s,
        doneToday,
        weekDone,
        compliance: clamp(compliance, 0, 200),
      };
    });

    // overall momentum index
    const overallStrength = computed.length
      ? Math.round(computed.reduce((acc, h) => acc + h.strength, 0) / computed.length)
      : 0;

    const masteredCount = computed.filter(h => h.mastery >= 80).length;

    return { computed, overallStrength, masteredCount };
  }, [habits]);

  /* ----------------------------- Actions ----------------------------- */

  const toggleHabitToday = useCallback((habitId: string) => {
    const today = toISODateLocal(new Date());
    setHabits(prev => {
      const next = prev.map(h => {
        if (h.id !== habitId) return h;
        const set = new Set(h.checkinsISO);
        if (set.has(today)) set.delete(today);
        else set.add(today);
        return { ...h, checkinsISO: Array.from(set).sort() };
      });
      return next;
    });
  }, []);

  const setHabitMastery = useCallback((habitId: string, mastery: number) => {
    setHabits(prev => prev.map(h => (h.id === habitId ? { ...h, mastery: clamp(mastery, 0, 100) } : h)));
  }, []);

  const removeHabit = useCallback((habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
  }, []);

  const handleTimeRange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as TimeRange;
    if (v === 'week' || v === 'month' || v === 'year' || v === 'all') setTimeRange(v);
  };

  /* ----------------------------- Render ----------------------------- */

  return (
    <div className="view-container pb-24">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 backdrop-blur">
            <Sparkles size={14} className="opacity-70" />
            <span>Habit Lab • Goals • Tasks</span>
          </div>

          <h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            <span className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-3 shadow-lg shadow-indigo-500/20">
              <BarChart3 size={24} className="text-white" />
            </span>
            {t('statistics.title') || 'Statisztika & Rendszerek'}
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
            {t('statistics.subtitle') || 'Napi működés: feladatok, célok és szokások — egy helyen.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm hover:shadow-md transition"
            onClick={() => setShowHabitModal(true)}
          >
            <Plus size={18} />
            Új szokás
          </button>

          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm">
            <SlidersHorizontal size={18} className="text-gray-500" />
            <select
              value={timeRange}
              onChange={handleTimeRange}
              className="bg-transparent text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none"
            >
              <option value="week">{t('statistics.thisWeek') || 'Ez a hét'}</option>
              <option value="month">{t('statistics.thisMonth') || 'Ez a hónap'}</option>
              <option value="year">{t('statistics.thisYear') || 'Ez az év'}</option>
              <option value="all">{t('statistics.allTime') || 'Összes'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<ClipboardList size={18} />}
          title="Feladat teljesítés"
          value={`${taskEngine.score}%`}
          sub={`${taskEngine.completed} kész / ${taskEngine.total} összes`}
          tone="indigo"
        />

        <KpiCard
          icon={<Target size={18} />}
          title="Aktív célok átlaga"
          value={`${goalEngine.avgActiveProgress}%`}
          sub={`${goalEngine.active.length} aktív • ${goalEngine.done.length} lezárt`}
          tone="emerald"
        />

        <KpiCard
          icon={<Flame size={18} />}
          title="Szokás momentum"
          value={`${habitEngine.overallStrength}`}
          sub={`${habitEngine.masteredCount} “megszilárdult” (80%+)`}
          tone="violet"
        />

        <KpiCard
          icon={taskEngine.etaDays !== null ? <CalendarDays size={18} /> : <AlertCircle size={18} />}
          title="Befejezési tempó"
          value={taskEngine.etaDays !== null ? `${taskEngine.etaDays} nap` : '—'}
          sub={taskEngine.etaDays !== null ? `ETA a függő feladatokra` : `Nincs még stabil tempó`}
          tone="amber"
        />
      </div>

      {/* Main layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Tasks + Goals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tasks Trend */}
          <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Feladat trend</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Tervezett vs. elkészült a kiválasztott időszakban.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                <BadgeCheck size={16} className="text-emerald-500" />
                <span>{taskEngine.velocity.toFixed(2)} kész/nap</span>
              </div>
            </div>

            <div className="mt-4 h-[200px]">
              {taskEngine.series.some(x => x.planned > 0 || x.completed > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskEngine.series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<FancyTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="planned" name="Tervezett" fill={isDark ? '#334155' : '#e2e8f0'} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="completed" name="Elkészült" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={<CalendarDays size={28} />}
                  title="Nincs adat erre az időszakra"
                  desc="Adj hozzá feladatokat, és itt látni fogod a trendet."
                />
              )}
            </div>

            {/* Priority mini */}
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <MiniStat label="Függő" value={String(taskEngine.pending)} tone="rose" />
              <MiniStat label="Magas" value={String(taskEngine.pri.high)} tone="rose" />
              <MiniStat label="Közepes" value={String(taskEngine.pri.medium)} tone="amber" />
              <MiniStat label="Alacsony" value={String(taskEngine.pri.low)} tone="emerald" />
            </div>
          </div>

          {/* Goals */}
          <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Célok fókusz</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Aktív célok állapota és a haladás eloszlása.
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-gray-900 dark:text-white">{goalEngine.avgActiveProgress}%</div>
                <div className="text-xs font-semibold text-gray-500">átlag aktív cél</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-3">
                {goalEngine.active.length > 0 ? (
                  goalEngine.active.slice(0, 6).map((g: any) => {
                    const prog = clamp(Number(g?.progress) || 0, 0, 100);
                    const title = String(g?.title ?? g?.name ?? 'Cél');
                    return (
                      <div
                        key={String(g?.id ?? title)}
                        className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-gray-900 dark:text-white">{title}</div>
                            <div className="mt-0.5 text-xs text-gray-500">Aktív</div>
                          </div>
                          <div className="text-sm font-black text-gray-900 dark:text-white">{prog}%</div>
                        </div>
                        <div className="mt-3 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                            style={{ width: `${prog}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState
                    icon={<Target size={28} />}
                    title="Nincsenek aktív célok"
                    desc="Adj hozzá célokat, és itt átláthatod a haladást."
                  />
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                <div className="text-sm font-bold text-gray-900 dark:text-white mb-2">Progress megoszlás</div>
                <div className="h-[210px]">
                  {goalEngine.buckets.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={goalEngine.buckets} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={6}>
                          {goalEngine.buckets.map((b, i) => (
                            <Cell key={i} fill={b.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<FancyTooltip />} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-gray-500">
                      Nincs elég adat
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Habits */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Szokás rendszer</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Check-in + mastery + “strength” = stabil szokás.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:brightness-110 transition"
                onClick={() => setShowHabitModal(true)}
              >
                <Plus size={16} />
                Add
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="Össz szokás" value={String(habits.length)} tone="indigo" />
              <MiniStat label="Momentum" value={String(habitEngine.overallStrength)} tone="violet" />
            </div>

            <div className="mt-5 space-y-4">
              {habitEngine.computed.length > 0 ? (
                habitEngine.computed
                  .slice()
                  .sort((a, b) => b.strength - a.strength)
                  .map(h => (
                    <HabitCard
                      key={h.id}
                      habit={h}
                      onToggleToday={() => toggleHabitToday(h.id)}
                      onMastery={(v) => setHabitMastery(h.id, v)}
                      onRemove={() => removeHabit(h.id)}
                    />
                  ))
              ) : (
                <EmptyState
                  icon={<Sparkles size={28} />}
                  title="Nincs még szokásod itt"
                  desc="Kattints az “Új szokás” gombra, és építs rendszert."
                />
              )}
            </div>
          </div>

          {/* Coach insight */}
          <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-6 text-white shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <Sparkles size={22} className="text-yellow-300" />
              </div>
              <div>
                <div className="text-lg font-black">Coach Insight</div>
                <p className="mt-1 text-sm text-white/80 leading-relaxed">
                  {habitEngine.overallStrength >= 75
                    ? 'Nagyon jó! A rendszered már “önjáró”. Most az a nyerő, ha 1–2 szokást stabilan tartasz, és csak utána bővítesz.'
                    : habitEngine.overallStrength >= 45
                      ? 'Jó alap. A leggyorsabb javulás: napi 1 apró check-in + a mastery őszinte állítása (nem kell 100%).'
                      : 'Most a fókusz: kevesebb szokás, egyszerűbb cél. Válassz 1 szokást, állíts 60%-os mastery-t, és nyomj 7 nap streaket.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Habit Modal */}
      {showHabitModal && (
        <HabitModal
          onClose={() => setShowHabitModal(false)}
          onCreate={(draft) => {
            const createdAtISO = toISODateLocal(new Date());
            const newHabit: Habit = {
              id: uid(),
              name: draft.name.trim() || 'Új szokás',
              description: draft.description.trim(),
              frequency: draft.frequency,
              targetPerWeek: clamp(draft.targetPerWeek, 1, 7),
              mastery: clamp(draft.mastery, 0, 100),
              createdAtISO,
              checkinsISO: [],
            };
            setHabits(prev => [newHabit, ...prev]);
            setShowHabitModal(false);
          }}
        />
      )}
    </div>
  );
};

/* ----------------------------- Components ----------------------------- */

const KpiCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
  tone: 'indigo' | 'emerald' | 'violet' | 'amber';
}> = ({ icon, title, value, sub, tone }) => {
  const tones: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-700',
    emerald: 'from-emerald-500 to-emerald-700',
    violet: 'from-violet-500 to-violet-700',
    amber: 'from-amber-500 to-amber-700',
  };

  return (
    <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</div>
          <div className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{value}</div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{sub}</div>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-3 text-white shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: string; tone: 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' }> = ({ label, value, tone }) => {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
    violet: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900',
    amber: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    rose: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
  };

  return (
    <div className={`rounded-2xl border ${bg[tone]} px-4 py-3`}>
      <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-black text-gray-900 dark:text-white">{value}</div>
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4 text-center">
    <div className="inline-flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 p-2 text-gray-500 dark:text-gray-400 shadow-sm">
      {icon}
    </div>
    <div className="mt-2 text-sm font-bold text-gray-700 dark:text-gray-300">{title}</div>
    <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{desc}</div>
  </div>
);

const HabitCard: React.FC<{
  habit: any;
  onToggleToday: () => void;
  onMastery: (v: number) => void;
  onRemove: () => void;
}> = ({ habit, onToggleToday, onMastery, onRemove }) => {
  const strengthTone =
    habit.strength >= 75 ? 'from-emerald-500 to-emerald-700'
      : habit.strength >= 45 ? 'from-amber-500 to-amber-700'
        : 'from-rose-500 to-rose-700';

  return (
    <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={`rounded-2xl bg-gradient-to-br ${strengthTone} p-2 text-white shadow-sm`}>
              <Flame size={16} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-gray-900 dark:text-white">{habit.name}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{habit.frequency === 'daily' ? 'Napi' : 'Heti'}</span>
                <span className="opacity-50">•</span>
                <span>Cél: {habit.targetPerWeek}/7</span>
                <span className="opacity-50">•</span>
                <span>Streak: <span className="font-bold text-gray-700 dark:text-gray-200">{habit.streak}</span></span>
              </div>
            </div>
          </div>

          {habit.description ? (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{habit.description}</div>
          ) : null}
        </div>

        <button
          onClick={onRemove}
          className="rounded-xl p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
          title="Szokás törlése"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Mastery */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-200">
          <span>Elsajátítás (mastery)</span>
          <span className="font-black text-gray-900 dark:text-white">{habit.mastery}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={habit.mastery}
          onChange={(e) => onMastery(parseInt(e.target.value, 10))}
          className="mt-2 w-full accent-indigo-600"
        />
        <div className="mt-1 flex justify-between text-[11px] text-gray-400 dark:text-gray-500">
          <span>kezdet</span>
          <span>stabil</span>
          <span>automatizált</span>
        </div>
      </div>

      {/* Check-in + metrics */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={onToggleToday}
          className={`rounded-2xl px-4 py-3 text-sm font-black transition border ${habit.doneToday
            ? 'bg-emerald-600 text-white border-emerald-600 hover:brightness-110'
            : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 size={16} />
            {habit.doneToday ? 'Ma kész ✅' : 'Ma megcsináltam'}
          </span>
        </button>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Strength</div>
          <div className="mt-1 flex items-end justify-between">
            <div className="text-2xl font-black text-gray-900 dark:text-white">{habit.strength}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{habit.last7Done}/7 • {habit.last7Rate}%</div>
          </div>
        </div>
      </div>

      {/* tiny insight */}
      <div className="mt-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-4 py-3 text-xs text-gray-700 dark:text-gray-200">
        {habit.strength >= 75
          ? 'Stabil szokás. Most a “minőség” javítása a legjobb (kicsit nehezíts rajta).'
          : habit.strength >= 45
            ? 'Jó úton vagy. A legnagyobb boost: 3 egymást követő nap check-in.'
            : 'Kezd kicsiben: 2 perc is számít. A lényeg a rendszer, nem a tökéletesség.'}
      </div>
    </div>
  );
};

const HabitModal: React.FC<{
  onClose: () => void;
  onCreate: (draft: NewHabitDraft) => void;
}> = ({ onClose, onCreate }) => {
  const [draft, setDraft] = useState<NewHabitDraft>({
    name: '',
    description: '',
    frequency: 'daily',
    targetPerWeek: 7,
    mastery: 40,
  });

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEscape(true, onClose);
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  return (
    <>
      <ScrollLock enabled={true} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* header */}
          <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-3 text-white shadow-lg shadow-indigo-500/20">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-lg font-black text-gray-900 dark:text-white">Új szokás létrehozása</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Kicsi, mérhető, ismételhető.</div>
              </div>
            </div>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="rounded-2xl p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              title="Bezárás"
            >
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Szokás neve</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft(s => ({ ...s, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="pl. 10 perc nyújtás"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Gyakoriság</label>
                <select
                  value={draft.frequency}
                  onChange={(e) => {
                    const freq = e.target.value === 'weekly' ? 'weekly' : 'daily';
                    setDraft(s => ({
                      ...s,
                      frequency: freq,
                      targetPerWeek: freq === 'daily' ? 7 : clamp(s.targetPerWeek, 1, 7),
                    }));
                  }}
                  className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="daily">Napi</option>
                  <option value="weekly">Heti</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Leírás (opcionális)</label>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft(s => ({ ...s, description: e.target.value }))}
                className="mt-2 w-full min-h-[96px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="Miért fontos? Mi számít sikernek?"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Cél / hét</div>
                  <div className="text-sm font-black text-gray-900 dark:text-white">{draft.targetPerWeek}/7</div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={draft.targetPerWeek}
                  onChange={(e) => setDraft(s => ({ ...s, targetPerWeek: parseInt(e.target.value, 10) }))}
                  className="mt-3 w-full accent-indigo-600"
                />
                <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                  <span>1</span><span>4</span><span>7</span>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Kezdő mastery</div>
                  <div className="text-sm font-black text-gray-900 dark:text-white">{draft.mastery}%</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draft.mastery}
                  onChange={(e) => setDraft(s => ({ ...s, mastery: parseInt(e.target.value, 10) }))}
                  className="mt-3 w-full accent-indigo-600"
                />
                <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                  <span>0</span><span>50</span><span>100</span>
                </div>
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 px-6 py-5 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Mégse
            </button>
            <button
              onClick={() => onCreate(draft)}
              className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20 hover:brightness-110 transition"
            >
              Létrehozás
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StatisticsView;
