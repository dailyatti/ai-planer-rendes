import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Search,
  Archive,
  Flame,
  Activity,
  Award,
  CheckCircle2,
  Undo2,
  SlidersHorizontal,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

/* =====================================================================================
  HABIT STUDIO (Redesign v3)
  - NO "check-in / bejelentkezés" UX. Instead: "Gyakorlás" + Mastery slider.
  - Instant feedback: today stats, streaks, heatmap, weekly micro chart.
  - Fully localStorage-based with migration from old v2 (checkins).
===================================================================================== */

/* -------------------------------- Types -------------------------------- */

type HabitCadence = 'daily' | 'weekly';

type HabitPracticeDay = {
  count: number;         // how many times practiced that day (default 1)
  lastTs: number;        // last practice timestamp
  note?: string;         // optional quick note (last one)
};

type HabitV3 = {
  id: string;
  name: string;
  description?: string;
  cadence: HabitCadence;
  weeklyTarget: number;      // if cadence = weekly
  color: string;             // tailwind-ish token we map to classes
  createdAtISO: string;

  mastery: number;           // 0..100 (user-controlled)
  archived: boolean;
  mastered: boolean;         // optional flag (user can mark or auto when mastery=100)

  practices: Record<string, HabitPracticeDay>; // key: YYYY-MM-DD
};

type ViewTab = 'active' | 'archived' | 'mastered';

/* -------------------------------- Storage -------------------------------- */

const STORAGE_V3 = 'planner.habits.v3';
const STORAGE_V2 = 'planner.habits.v2'; // your current one
const STORAGE_V1 = 'planner.statistics.habits.v1'; // legacy

/* -------------------------------- Utils -------------------------------- */

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const pad2 = (n: number) => String(n).padStart(2, '0');
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const uid = () => {
  // stable-ish id without external deps
  const a = Math.random().toString(36).slice(2);
  const b = Date.now().toString(36);
  return `${b}-${a}`.slice(0, 18);
};

const safeJsonParse = <T,>(s: string | null): T | null => {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const diffDays = (a: Date, b: Date) => {
  const A = startOfDay(a).getTime();
  const B = startOfDay(b).getTime();
  return Math.round((A - B) / (1000 * 60 * 60 * 24));
};

// Streak based on "did practice at least once that day"
const computeStreaks = (practices: Record<string, HabitPracticeDay>, todayISO: string) => {
  const days = Object.keys(practices).filter(k => practices[k]?.count > 0).sort();
  if (days.length === 0) return { current: 0, best: 0, totalDays: 0 };

  // best streak
  let best = 1;
  let run = 1;

  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const cur = new Date(days[i]);
    const d = diffDays(cur, prev);
    if (d === 1) run++;
    else run = 1;
    best = Math.max(best, run);
  }

  // current streak: from today backwards (today counts if practiced today)
  const today = new Date(todayISO);
  let current = 0;

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = toISODate(d);
    if (practices[iso]?.count > 0) current++;
    else break;
  }

  const totalDays = days.length;
  return { current, best, totalDays };
};

const lastNDays = (n: number, todayISO: string) => {
  const today = new Date(todayISO);
  const out: { iso: string; date: Date; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = toISODate(d);
    const label = d.toLocaleDateString(undefined, { weekday: 'narrow' });
    out.push({ iso, date: d, label });
  }
  return out;
};

const COLORS = [
  { key: 'blue',   ring: 'from-blue-500 to-cyan-400',   badge: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300' },
  { key: 'green',  ring: 'from-emerald-500 to-lime-400',badge: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
  { key: 'purple', ring: 'from-purple-500 to-pink-400', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' },
  { key: 'orange', ring: 'from-orange-500 to-amber-300',badge: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' },
  { key: 'teal',   ring: 'from-teal-500 to-cyan-300',   badge: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300' },
  { key: 'rose',   ring: 'from-rose-500 to-pink-300',   badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
] as const;

const colorMeta = (key: string) => COLORS.find(c => c.key === key) ?? COLORS[0];

/* -------------------------------- Migration (v2 -> v3) --------------------------------
   v2 Habit had: checkins: Record<YYYY-MM-DD, { completed, note?, timestamp, effort? }>
   We'll migrate completed days into practices[iso] = {count: 1, lastTs, note}
   Also approximate mastery from total completed / targetDays (default 66), but user can edit later.
------------------------------------------------------------------------------------------ */

type HabitV2 = {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  timeOfDay?: any;
  exactTime?: string;
  createdAtISO: string;
  checkins: Record<string, { dateISO: string; completed: boolean; note?: string; timestamp: number }>;
  color?: string;
  archived?: boolean;
  isMastered?: boolean;
  targetDays?: number;
};

const migrateV2ToV3 = (v2: HabitV2[]): HabitV3[] => {
  const out: HabitV3[] = v2.map((h) => {
    const practices: Record<string, HabitPracticeDay> = {};
    const dates = Object.keys(h.checkins ?? {});
    let completedCount = 0;

    for (const iso of dates) {
      const c = h.checkins[iso];
      if (c?.completed) {
        completedCount++;
        practices[iso] = {
          count: 1,
          lastTs: typeof c.timestamp === 'number' ? c.timestamp : Date.now(),
          note: c.note || undefined,
        };
      }
    }

    const target = clamp(h.targetDays ?? 66, 7, 365);
    const masteryApprox = clamp((completedCount / target) * 100, 0, 100);

    return {
      id: h.id || uid(),
      name: h.name || 'Untitled',
      description: h.description || '',
      cadence: (h.frequency === 'weekly' ? 'weekly' : 'daily'),
      weeklyTarget: 5,
      color: (h.color && COLORS.some(c => c.key === h.color)) ? h.color : 'blue',
      createdAtISO: h.createdAtISO || toISODate(new Date()),
      mastery: Math.round(masteryApprox),
      archived: !!h.archived,
      mastered: !!h.isMastered,
      practices,
    };
  });

  // de-dupe ids
  const seen = new Set<string>();
  return out.map(h => {
    if (!h.id || seen.has(h.id)) h.id = uid();
    seen.add(h.id);
    return h;
  });
};

/* -------------------------------- UI Bits -------------------------------- */

const GlassCard: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`rounded-3xl border border-gray-200/70 dark:border-gray-700/70 bg-white/90 dark:bg-gray-900/50 backdrop-blur-xl shadow-sm ${className}`}>
    {children}
  </div>
);

const MetricCard: React.FC<{ icon: React.ReactNode; title: string; value: React.ReactNode; hint?: string }> = ({ icon, title, value, hint }) => (
  <GlassCard className="p-4">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</div>
        <div className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{value}</div>
        {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
      </div>
    </div>
  </GlassCard>
);

const Ring: React.FC<{ value: number; colorKey: string; size?: number }> = ({ value, colorKey, size = 44 }) => {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = clamp(value, 0, 100);
  const offset = c - (pct / 100) * c;
  const meta = colorMeta(colorKey);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle r={r} cx={size / 2} cy={size / 2} strokeWidth={stroke} fill="transparent" className="text-gray-200 dark:text-gray-700" stroke="currentColor" />
        <circle
          r={r}
          cx={size / 2}
          cy={size / 2}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          stroke="currentColor"
          style={{
            // using currentColor but we set via wrapper gradient text trick
            // We'll fake it with a simple class switch:
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`text-[11px] font-black text-transparent bg-clip-text bg-gradient-to-br ${meta.ring}`}>
          {Math.round(pct)}%
        </div>
      </div>
    </div>
  );
};

const Heatmap: React.FC<{ habits: HabitV3[]; todayISO: string; weeks?: number; title: string; subtitle?: string }> = ({
  habits,
  todayISO,
  weeks = 18,
  title,
  subtitle
}) => {
  const grid = useMemo(() => {
    const end = new Date(todayISO);
    const cols: { iso: string; intensity: number; tip: string }[][] = [];

    for (let w = 0; w < weeks; w++) {
      const col: { iso: string; intensity: number; tip: string }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(end);
        date.setDate(end.getDate() - ((weeks - 1 - w) * 7 + (6 - d)));
        const iso = toISODate(date);

        const active = habits.filter(h => !h.archived && !h.mastered && new Date(h.createdAtISO) <= date);
        const activeCount = active.length;
        const doneCount = active.reduce((acc, h) => acc + ((h.practices[iso]?.count ?? 0) > 0 ? 1 : 0), 0);

        let intensity = 0;
        if (activeCount > 0 && doneCount > 0) {
          const ratio = doneCount / activeCount;
          if (ratio >= 0.8) intensity = 3;
          else if (ratio >= 0.5) intensity = 2;
          else intensity = 1;
        }

        const tip = `${iso} • ${doneCount}/${activeCount} szokás megvolt`;
        col.push({ iso, intensity, tip });
      }
      cols.push(col);
    }
    return cols;
  }, [habits, todayISO, weeks]);

  const cellClass = (i: number) => {
    if (i === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (i === 1) return 'bg-emerald-200 dark:bg-emerald-900/35';
    if (i === 2) return 'bg-emerald-400 dark:bg-emerald-600/80';
    return 'bg-emerald-600 dark:bg-emerald-400 shadow-sm shadow-emerald-500/20';
  };

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            {title}
          </div>
          {subtitle && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400 shrink-0">
          <span>kevesebb</span>
          <span className="w-3 h-3 rounded-[3px] bg-gray-100 dark:bg-gray-800 inline-block" />
          <span className="w-3 h-3 rounded-[3px] bg-emerald-200 dark:bg-emerald-900/35 inline-block" />
          <span className="w-3 h-3 rounded-[3px] bg-emerald-400 dark:bg-emerald-600/80 inline-block" />
          <span className="w-3 h-3 rounded-[3px] bg-emerald-600 dark:bg-emerald-400 inline-block" />
          <span>több</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1 min-w-max">
          {grid.map((col, i) => (
            <div key={i} className="flex flex-col gap-1">
              {col.map(cell => (
                <div
                  key={cell.iso}
                  title={cell.tip}
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-[4px] transition-colors ${cellClass(cell.intensity)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};

const WeeklyMicroBars: React.FC<{ habit: HabitV3; todayISO: string }> = ({ habit, todayISO }) => {
  const days = useMemo(() => lastNDays(7, todayISO), [todayISO]);
  const max = Math.max(1, ...days.map(d => habit.practices[d.iso]?.count ?? 0));

  return (
    <div className="flex items-end justify-between gap-1 h-10">
      {days.map((d) => {
        const v = habit.practices[d.iso]?.count ?? 0;
        const h = Math.max(2, Math.round((v / max) * 36));
        const isToday = d.iso === todayISO;

        return (
          <div key={d.iso} className="flex flex-col items-center gap-1 flex-1">
            <div
              title={`${d.iso}: ${v} gyakorlás`}
              className={`w-full rounded-md transition-all ${v > 0 ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'} ${isToday ? 'ring-2 ring-blue-500/30' : ''}`}
              style={{ height: v > 0 ? h : 6 }}
            />
            <div className={`text-[9px] font-bold uppercase ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* -------------------------------- Main Component -------------------------------- */

const HabitView: React.FC = () => {
  const { t } = useLanguage();
  const todayISO = toISODate(new Date());

  const [habits, setHabits] = useState<HabitV3[]>([]);
  const [tab, setTab] = useState<ViewTab>('active');

  const [query, setQuery] = useState('');
  const [onlyDueToday, setOnlyDueToday] = useState(false);

  // Create/Edit sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<HabitV3 | null>(null);

  const [draft, setDraft] = useState<Partial<HabitV3>>({
    name: '',
    description: '',
    cadence: 'daily',
    weeklyTarget: 5,
    color: 'blue',
    mastery: 10,
  });

  // Quick note input per habit card (lightweight)
  const noteRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /* ----------------------------- Load + Migration ----------------------------- */

  useEffect(() => {
    const v3 = safeJsonParse<HabitV3[]>(localStorage.getItem(STORAGE_V3));
    if (v3 && Array.isArray(v3)) {
      setHabits(v3);
      return;
    }

    // migrate from v2 if exists
    const v2 = safeJsonParse<HabitV2[]>(localStorage.getItem(STORAGE_V2));
    if (v2 && Array.isArray(v2)) {
      const migrated = migrateV2ToV3(v2);
      localStorage.setItem(STORAGE_V3, JSON.stringify(migrated));
      setHabits(migrated);
      return;
    }

    // legacy v1 ignored (structure unknown) — keep empty
    const v1 = localStorage.getItem(STORAGE_V1);
    if (v1) {
      // If you want: implement extra migration later.
      // For now: do nothing safely.
    }

    setHabits([]);
  }, []);

  const persist = (next: HabitV3[]) => {
    setHabits(next);
    localStorage.setItem(STORAGE_V3, JSON.stringify(next));
  };

  /* ----------------------------- Derived + Dashboard ----------------------------- */

  const activeHabits = useMemo(() => habits.filter(h => !h.archived && !h.mastered), [habits]);
  const archivedHabits = useMemo(() => habits.filter(h => h.archived), [habits]);
  const masteredHabits = useMemo(() => habits.filter(h => h.mastered), [habits]);

  const practicedToday = useMemo(() => {
    return activeHabits.reduce((acc, h) => acc + ((h.practices[todayISO]?.count ?? 0) > 0 ? 1 : 0), 0);
  }, [activeHabits, todayISO]);

  const avgMastery = useMemo(() => {
    if (activeHabits.length === 0) return 0;
    const s = activeHabits.reduce((acc, h) => acc + clamp(h.mastery ?? 0, 0, 100), 0);
    return s / activeHabits.length;
  }, [activeHabits]);

  const bestStreakAll = useMemo(() => {
    const s = activeHabits.map(h => computeStreaks(h.practices, todayISO).current);
    return s.length ? Math.max(...s) : 0;
  }, [activeHabits, todayISO]);

  /* ----------------------------- Filters ----------------------------- */

  const visibleBase = useMemo(() => {
    const list =
      tab === 'active' ? activeHabits :
      tab === 'archived' ? archivedHabits :
      masteredHabits;

    const q = query.trim().toLowerCase();

    let out = list.filter(h => {
      if (!q) return true;
      return (h.name ?? '').toLowerCase().includes(q) || (h.description ?? '').toLowerCase().includes(q);
    });

    if (onlyDueToday && tab === 'active') {
      out = out.filter(h => (h.practices[todayISO]?.count ?? 0) === 0);
    }

    // sort: not practiced today first, then higher priority (lower mastery)
    if (tab === 'active') {
      out = out.sort((a, b) => {
        const aDone = (a.practices[todayISO]?.count ?? 0) > 0;
        const bDone = (b.practices[todayISO]?.count ?? 0) > 0;
        if (aDone !== bDone) return aDone ? 1 : -1;
        return (a.mastery ?? 0) - (b.mastery ?? 0);
      });
    } else {
      out = out.sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0));
    }

    return out;
  }, [tab, activeHabits, archivedHabits, masteredHabits, query, onlyDueToday, todayISO]);

  /* ----------------------------- Actions ----------------------------- */

  const openCreate = () => {
    setEditing(null);
    setDraft({
      name: '',
      description: '',
      cadence: 'daily',
      weeklyTarget: 5,
      color: 'blue',
      mastery: 10,
    });
    setSheetOpen(true);
  };

  const openEdit = (h: HabitV3) => {
    setEditing(h);
    setDraft({ ...h });
    setSheetOpen(true);
  };

  const saveDraft = () => {
    const name = (draft.name ?? '').trim();
    if (!name) return;

    const nextBase: HabitV3 = {
      id: editing?.id ?? uid(),
      name,
      description: (draft.description ?? '').trim(),
      cadence: (draft.cadence ?? 'daily') as HabitCadence,
      weeklyTarget: clamp(Number(draft.weeklyTarget ?? 5), 1, 14),
      color: (draft.color && COLORS.some(c => c.key === draft.color)) ? (draft.color as string) : 'blue',
      createdAtISO: editing?.createdAtISO ?? toISODate(new Date()),
      mastery: clamp(Number(draft.mastery ?? 10), 0, 100),
      archived: editing?.archived ?? false,
      mastered: editing?.mastered ?? false,
      practices: editing?.practices ?? {},
    };

    const next = editing
      ? habits.map(h => h.id === editing.id ? { ...h, ...nextBase } : h)
      : [nextBase, ...habits];

    persist(next);
    setSheetOpen(false);
    setEditing(null);
  };

  const removeHabit = (id: string) => {
    // keep it simple but safe
    const next = habits.filter(h => h.id !== id);
    persist(next);
  };

  const toggleArchive = (id: string) => {
    const next = habits.map(h => h.id === id ? { ...h, archived: !h.archived, mastered: h.mastered && !h.archived ? h.mastered : h.mastered } : h);
    persist(next);
  };

  const toggleMastered = (id: string) => {
    const next = habits.map(h => h.id === id ? { ...h, mastered: !h.mastered, archived: false } : h);
    persist(next);
  };

  const setMastery = (id: string, mastery: number) => {
    const m = clamp(mastery, 0, 100);
    const next = habits.map(h => h.id === id ? { ...h, mastery: m, mastered: h.mastered || m === 100 } : h);
    persist(next);
  };

  const practiceOnce = (id: string, note?: string) => {
    const next = habits.map(h => {
      if (h.id !== id) return h;
      const existing = h.practices[todayISO];
      const count = (existing?.count ?? 0) + 1;
      const cleanNote = note?.trim();
      return {
        ...h,
        practices: {
          ...h.practices,
          [todayISO]: {
            count,
            lastTs: Date.now(),
            note: cleanNote ? cleanNote : existing?.note,
          }
        }
      };
    });
    persist(next);
  };

  const undoPractice = (id: string) => {
    const next = habits.map(h => {
      if (h.id !== id) return h;
      const existing = h.practices[todayISO];
      if (!existing) return h;

      const newCount = (existing.count ?? 0) - 1;
      const practices = { ...h.practices };
      if (newCount <= 0) delete practices[todayISO];
      else practices[todayISO] = { ...existing, count: newCount, lastTs: Date.now() };

      return { ...h, practices };
    });
    persist(next);
  };

  /* ----------------------------- Copy for i18n fallback ----------------------------- */

  const TT = (k: string, fb: string) => (t?.(k) as string) || fb;

  /* ----------------------------- Render ----------------------------- */

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#070A12] p-4 lg:p-8">
      {/* Top header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 text-white dark:text-gray-900 flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900 dark:text-white">
              {TT('habits.title', 'Habit Studio')}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {TT('habits.subtitle', 'Szokások építése • Gyakorlás • Elsajátítás (Mastery)')}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black shadow-sm hover:shadow-md active:scale-[0.99] transition"
          >
            <Plus className="w-5 h-5" />
            {TT('habits.create', 'Új szokás')}
          </button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard
          icon={<Calendar className="w-5 h-5" />}
          title={TT('habits.metrics.active', 'Aktív')}
          value={activeHabits.length}
          hint={TT('habits.metrics.activeHint', 'nincs archív / mester')}
        />
        <MetricCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          title={TT('habits.metrics.today', 'Ma megvolt')}
          value={`${practicedToday}/${activeHabits.length}`}
          hint={TT('habits.metrics.todayHint', 'legalább 1 gyakorlás / szokás')}
        />
        <MetricCard
          icon={<SlidersHorizontal className="w-5 h-5" />}
          title={TT('habits.metrics.masteryAvg', 'Átlag Mastery')}
          value={`${Math.round(avgMastery)}%`}
          hint={TT('habits.metrics.masteryAvgHint', 'csúszkával állítható')}
        />
        <MetricCard
          icon={<Flame className="w-5 h-5" />}
          title={TT('habits.metrics.bestStreak', 'Legjobb streak')}
          value={bestStreakAll}
          hint={TT('habits.metrics.bestStreakHint', 'aktív szokások közt')}
        />
      </div>

      {/* Heatmap */}
      <div className="mb-6">
        <Heatmap
          habits={habits}
          todayISO={todayISO}
          weeks={18}
          title={TT('habits.heatmap.title', 'Rutin hőtérkép')}
          subtitle={TT('habits.heatmap.subtitle', 'Mennyire volt “megcsinálva” az aktív szokások arányában')}
        />
      </div>

      {/* Tabs + Search + Filters */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            {([
              { k: 'active', label: TT('habits.tabs.active', 'Aktív') },
              { k: 'archived', label: TT('habits.tabs.archived', 'Archív') },
              { k: 'mastered', label: TT('habits.tabs.mastered', 'Mester') },
            ] as const).map(b => (
              <button
                key={b.k}
                onClick={() => setTab(b.k)}
                className={`px-4 py-2 rounded-2xl font-black text-sm transition ${
                  tab === b.k
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            {tab === 'active' && (
              <button
                onClick={() => setOnlyDueToday(v => !v)}
                className={`px-4 py-2 rounded-2xl font-black text-sm transition inline-flex items-center gap-2 ${
                  onlyDueToday
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title={TT('habits.filters.onlyDueTodayTip', 'Csak azok, amik ma még nem voltak meg')}
              >
                <Flame className="w-4 h-4" />
                {TT('habits.filters.onlyDueToday', 'Ma még nincs kész')}
              </button>
            )}

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={TT('habits.search', 'Keresés szokások között...')}
                className="w-full md:w-[340px] pl-9 pr-3 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {visibleBase.map((h) => {
            const meta = colorMeta(h.color);
            const doneToday = (h.practices[todayISO]?.count ?? 0) > 0;
            const todayCount = h.practices[todayISO]?.count ?? 0;
            const streaks = computeStreaks(h.practices, todayISO);

            return (
              <motion.div
                key={h.id}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
              >
                <GlassCard className={`p-5 overflow-hidden ${doneToday && tab === 'active' ? 'ring-2 ring-emerald-400/20' : ''}`}>
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${meta.badge}`}>
                          {h.cadence === 'daily'
                            ? TT('habits.cadence.daily', 'Napi')
                            : TT('habits.cadence.weekly', 'Heti')}
                        </span>

                        {tab === 'active' && doneToday && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                            {TT('habits.doneToday', 'Ma megvolt')}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-lg font-black text-gray-900 dark:text-white truncate">
                        {h.name}
                      </div>

                      {h.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {h.description}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Ring value={h.mastery ?? 0} colorKey={h.color} />
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openEdit(h)}
                          className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition"
                          title={TT('common.edit', 'Szerkesztés')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeHabit(h.id)}
                          className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 flex items-center justify-center transition"
                          title={TT('common.delete', 'Törlés')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Weekly micro bars */}
                  <div className="mt-4">
                    <WeeklyMicroBars habit={h} todayISO={todayISO} />
                  </div>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 p-3 text-center">
                      <div className="text-xl font-black text-gray-900 dark:text-white">{streaks.current}</div>
                      <div className="text-[10px] font-black uppercase tracking-wide text-gray-500">{TT('habits.stats.streak', 'Streak')}</div>
                    </div>
                    <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 p-3 text-center">
                      <div className="text-xl font-black text-gray-900 dark:text-white">{streaks.best}</div>
                      <div className="text-[10px] font-black uppercase tracking-wide text-gray-500">{TT('habits.stats.best', 'Best')}</div>
                    </div>
                    <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 p-3 text-center">
                      <div className="text-xl font-black text-gray-900 dark:text-white">{streaks.totalDays}</div>
                      <div className="text-[10px] font-black uppercase tracking-wide text-gray-500">{TT('habits.stats.total', 'Össznap')}</div>
                    </div>
                  </div>

                  {/* Mastery slider */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-black uppercase tracking-wide text-gray-500">
                        {TT('habits.mastery', 'Mastery (elsajátítás)')}
                      </div>
                      <div className={`text-xs font-black text-transparent bg-clip-text bg-gradient-to-br ${meta.ring}`}>
                        {Math.round(h.mastery ?? 0)}%
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={clamp(h.mastery ?? 0, 0, 100)}
                      onChange={(e) => setMastery(h.id, Number(e.target.value))}
                      className="w-full accent-gray-900 dark:accent-white"
                    />
                    <div className="text-[11px] text-gray-400 mt-2">
                      {TT('habits.masteryHint', 'A csúszka azt jelenti: mennyire “beégett” a szokás. Nem adminisztráció.')}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="mt-4 flex flex-col gap-2">
                    {tab === 'active' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const note = noteRefs.current[h.id]?.value?.trim();
                            practiceOnce(h.id, note || undefined);
                            if (noteRefs.current[h.id]) noteRefs.current[h.id]!.value = '';
                          }}
                          className={`flex-1 py-3 rounded-2xl font-black shadow-sm transition active:scale-[0.99] ${
                            doneToday ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:shadow-md'
                          }`}
                          title={TT('habits.practice', 'Megvolt (gyakorlás)')}
                        >
                          <span className="inline-flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            {TT('habits.practice', 'Megvolt')}
                            {todayCount > 0 ? <span className="text-xs opacity-80">×{todayCount}</span> : null}
                          </span>
                        </button>

                        <button
                          onClick={() => undoPractice(h.id)}
                          className="px-4 py-3 rounded-2xl font-black bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                          title={TT('habits.undoPractice', 'Mai gyakorlás visszavonása')}
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {tab === 'active' && (
                      <div className="flex gap-2">
                        <input
                          ref={(el) => { noteRefs.current[h.id] = el; }}
                          placeholder={TT('habits.quickNote', 'Gyors megjegyzés (opcionális)')}
                          className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white"
                        />
                        <button
                          onClick={() => toggleArchive(h.id)}
                          className="px-4 py-3 rounded-2xl font-black bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition inline-flex items-center gap-2"
                          title={TT('habits.archive', 'Archíválás')}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleMastered(h.id)}
                          className="px-4 py-3 rounded-2xl font-black bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition inline-flex items-center gap-2"
                          title={TT('habits.toggleMastered', 'Mester státusz kapcsoló')}
                        >
                          <Award className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {tab !== 'active' && (
                      <div className="flex gap-2">
                        {tab === 'archived' && (
                          <button
                            onClick={() => toggleArchive(h.id)}
                            className="flex-1 py-3 rounded-2xl font-black bg-gray-900 dark:bg-white text-white dark:text-gray-900 transition hover:shadow-md"
                          >
                            {TT('habits.unarchive', 'Vissza aktívba')}
                          </button>
                        )}
                        {tab === 'mastered' && (
                          <button
                            onClick={() => toggleMastered(h.id)}
                            className="flex-1 py-3 rounded-2xl font-black bg-gray-900 dark:bg-white text-white dark:text-gray-900 transition hover:shadow-md"
                          >
                            {TT('habits.unmaster', 'Vissza aktívba')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer small */}
                  <div className="mt-4 text-[10px] text-gray-400 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {TT('habits.footer', 'Gyakorlás + Mastery = valódi haladás')}
                    </span>
                    <span>
                      {TT('habits.created', 'Létrehozva')}: {h.createdAtISO}
                    </span>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {visibleBase.length === 0 && (
        <div className="py-20 text-center opacity-70">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <div className="text-xl font-black text-gray-700 dark:text-gray-200">
            {TT('habits.empty', 'Itt most üres.')}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {TT('habits.emptyHint', 'Adj hozzá 1 szokást, és kezdd el építeni a Mastery-t.')}
          </div>
          <div className="mt-5">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black shadow-sm hover:shadow-md transition"
            >
              <Plus className="w-5 h-5" />
              {TT('habits.create', 'Új szokás')}
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="w-full max-w-xl"
            >
              <GlassCard className="p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                      {editing ? TT('habits.edit', 'Szokás szerkesztése') : TT('habits.create', 'Új szokás')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {TT('habits.sheetHint', 'Minimal admin, max haladás.')}
                    </div>
                  </div>

                  <button
                    onClick={() => { setSheetOpen(false); setEditing(null); }}
                    className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center"
                    title={TT('common.close', 'Bezárás')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                      {TT('habits.fields.name', 'Név')}
                    </label>
                    <input
                      value={draft.name ?? ''}
                      onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
                      className="mt-2 w-full px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white"
                      placeholder={TT('habits.fields.namePh', 'pl. 30 perc olvasás')}
                      autoFocus
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                      {TT('habits.fields.description', 'Leírás (opcionális)')}
                    </label>
                    <textarea
                      value={draft.description ?? ''}
                      onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
                      className="mt-2 w-full px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white resize-none"
                      rows={3}
                      placeholder={TT('habits.fields.descriptionPh', 'miért fontos, mi számít “megvolt”-nak')}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                      {TT('habits.fields.cadence', 'Ritmus')}
                    </label>
                    <select
                      value={(draft.cadence ?? 'daily') as any}
                      onChange={(e) => setDraft(d => ({ ...d, cadence: e.target.value as HabitCadence }))}
                      className="mt-2 w-full px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white"
                    >
                      <option value="daily">{TT('habits.cadence.daily', 'Napi')}</option>
                      <option value="weekly">{TT('habits.cadence.weekly', 'Heti')}</option>
                    </select>
                    <div className="text-[11px] text-gray-400 mt-2">
                      {TT('habits.fields.cadenceHint', 'A gyakorlás naponta logolódik, ez csak “cél ritmus”.')}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                      {TT('habits.fields.weeklyTarget', 'Heti cél (ha heti)')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={Number(draft.weeklyTarget ?? 5)}
                      onChange={(e) => setDraft(d => ({ ...d, weeklyTarget: Number(e.target.value) }))}
                      className="mt-2 w-full px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white"
                    />
                    <div className="text-[11px] text-gray-400 mt-2">
                      {TT('habits.fields.weeklyTargetHint', 'Napi ritmusnál is maradhat, később jól jön az analitikához.')}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                      {TT('habits.fields.masteryStart', 'Kezdő Mastery')}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={clamp(Number(draft.mastery ?? 10), 0, 100)}
                      onChange={(e) => setDraft(d => ({ ...d, mastery: Number(e.target.value) }))}
                      className="mt-4 w-full accent-gray-900 dark:accent-white"
                    />
                    <div className="mt-2 text-sm font-black text-gray-900 dark:text-white">
                      {Math.round(clamp(Number(draft.mastery ?? 10), 0, 100))}%
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                      {TT('habits.fields.color', 'Szín')}
                    </label>
                    <div className="mt-2 grid grid-cols-6 gap-2">
                      {COLORS.map(c => (
                        <button
                          key={c.key}
                          onClick={() => setDraft(d => ({ ...d, color: c.key }))}
                          className={`h-10 rounded-2xl border transition ${
                            (draft.color ?? 'blue') === c.key
                              ? 'border-gray-900 dark:border-white ring-2 ring-blue-500/20'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                          title={c.key}
                        >
                          <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${c.ring}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => { setSheetOpen(false); setEditing(null); }}
                    className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-black hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {TT('common.cancel', 'Mégse')}
                  </button>
                  <button
                    onClick={saveDraft}
                    disabled={!String(draft.name ?? '').trim()}
                    className="flex-1 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black shadow-sm hover:shadow-md disabled:opacity-50 transition"
                  >
                    {editing ? TT('common.save', 'Mentés') : TT('common.create', 'Létrehozás')}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HabitView;
