import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  BarChart3,
  Target,
  AlertCircle,
  CalendarDays,
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

/* ----------------------------- Utilities ----------------------------- */

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const pad2 = (n: number) => String(n).padStart(2, '0');

const toISODateLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

const parseISOToDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
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
  // year
  d.setMonth(0, 1);
  return d;
};

const daysBetween = (a: Date, b: Date) => {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

/* ----------------------------- UI Helpers ----------------------------- */

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
  const [isDark, setIsDark] = useState(false);

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

    const filtered = (plans ?? []).filter((p: any) => {
      const dt = new Date(p?.date);
      if (Number.isNaN(dt.getTime())) return false;
      return dt >= start && dt <= end;
    });

    const total = filtered.length;
    const completed = filtered.filter((p: any) => !!p?.completed).length;
    const pending = Math.max(0, total - completed);
    const score = total > 0 ? Math.round((completed / total) * 100) : 0;

    const pri = { high: 0, medium: 0, low: 0, other: 0 };
    for (const p of filtered) {
      const v = String(p?.priority ?? '').toLowerCase();
      if (v === 'high') pri.high++;
      else if (v === 'medium') pri.medium++;
      else if (v === 'low') pri.low++;
      else pri.other++;
    }

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

  /* ----------------------------- Goals Engine ----------------------------- */

  const goalEngine = useMemo(() => {
    const g = goals ?? [];
    const active = g.filter((x: any) => x?.status === 'in-progress' || x?.status === 'active');
    const done = g.filter((x: any) => x?.status === 'completed' || x?.status === 'done');

    const avgActiveProgress = active.length
      ? Math.round(active.reduce((acc: number, x: any) => acc + (Number(x?.progress) || 0), 0) / active.length)
      : 0;

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
            <BarChart3 size={14} className="opacity-70" />
            <span>Productivity Analytics</span>
          </div>

          <h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            <span className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-3 shadow-lg shadow-indigo-500/20">
              <BarChart3 size={24} className="text-white" />
            </span>
            {t('statistics.title') || 'Statisztika'}
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
            {t('statistics.subtitle') || 'Feladatok és célok teljesítményének elemzése.'}
          </p>
        </div>

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

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
          icon={taskEngine.etaDays !== null ? <CalendarDays size={18} /> : <AlertCircle size={18} />}
          title="Befejezési tempó"
          value={taskEngine.etaDays !== null ? `${taskEngine.etaDays} nap` : '—'}
          sub={taskEngine.etaDays !== null ? `ETA a függő feladatokra` : `Nincs még stabil tempó`}
          tone="amber"
        />
      </div>

      {/* Main layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Tasks */}
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

          <div className="mt-6 h-[300px]">
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
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Függő" value={String(taskEngine.pending)} tone="rose" />
            <MiniStat label="Magas" value={String(taskEngine.pri.high)} tone="rose" />
            <MiniStat label="Közepes" value={String(taskEngine.pri.medium)} tone="amber" />
            <MiniStat label="Alacsony" value={String(taskEngine.pri.low)} tone="emerald" />
          </div>
        </div>

        {/* Right: Goals */}
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

          <div className="mt-6 grid grid-cols-1 gap-6">
            <div>
              {goalEngine.active.length > 0 ? (
                <div className="space-y-4">
                  {goalEngine.active.slice(0, 5).map((g: any) => {
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
                  })}
                </div>
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
              <div className="h-[200px]">
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

export default StatisticsView;
