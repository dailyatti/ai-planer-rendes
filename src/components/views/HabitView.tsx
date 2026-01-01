import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  X,
  Check,
  Flame,
  Search,
  SlidersHorizontal,
  CalendarDays,
  Sparkles,
  Target,
  Pencil,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/* =====================================================================================
  Habit Lab Pro (v2)
  - Formation timeline: Kickstart (27) + Autopilot (66) default, editable per-habit
  - Check-in + Effort + Note
  - Mastery slider
  - Search / Filter / Sort
  - 30-day chain calendar
  - Migration from old v1 storage
===================================================================================== */

/* ----------------------------- Types ----------------------------- */

type HabitFrequency = 'daily' | 'weekly';

type HabitCheckinMeta = {
  note?: string;
  effort?: number; // 1..5
};

type Habit = {
  id: string;
  name: string;
  description?: string;
  frequency: HabitFrequency;
  targetPerWeek: number; // 1..7
  mastery: number; // 0..100 (self-reported)
  createdAtISO: string; // yyyy-mm-dd
  checkinsISO: string[]; // list of yyyy-mm-dd
  checkinMeta?: Record<string, HabitCheckinMeta>; // keyed by ISO day
  formationDays: number; // e.g. 27/66/90/custom
  cue?: string; // optional habit loop
  reward?: string;
  ifThen?: string; // implementation intention
};

type HabitComputed = Habit & {
  doneToday: boolean;
  streak: number;
  strength28: number; // consistency last 28 days %
  weekDone: number; // checkins last 7 days
  weekTarget: number; // targetPerWeek
  formationProgress: number; // 0..100
};

/* ----------------------------- Constants / Storage ----------------------------- */

const STORAGE_V2 = 'planner.habits.v2';
const STORAGE_V1 = 'planner.statistics.habits.v1';

/* ----------------------------- Utilities ----------------------------- */

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const pad2 = (n: number) => String(n).padStart(2, '0');
const toISODateLocal = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseISOToDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const daysBetween = (aISO: string, bISO: string) => {
  const a = parseISOToDate(aISO).getTime();
  const b = parseISOToDate(bISO).getTime();
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return diff;
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

const uid = () => `h_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const uniqSortedISO = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort();

/* ----------------------------- Migration / Load / Save ----------------------------- */

const normalizeHabit = (h: any): Habit => {
  const today = toISODateLocal(new Date());
  const checkinsISO = Array.isArray(h?.checkinsISO) ? h.checkinsISO.filter((x: any) => typeof x === 'string') : [];
  const checkinMeta = (h?.checkinMeta && typeof h.checkinMeta === 'object') ? h.checkinMeta : undefined;

  const formationDaysRaw = Number(h?.formationDays ?? h?.formation ?? 66);
  const formationDays = clamp(Number.isFinite(formationDaysRaw) ? formationDaysRaw : 66, 7, 365);

  return {
    id: String(h?.id ?? uid()),
    name: String(h?.name ?? 'Új szokás'),
    description: typeof h?.description === 'string' ? h.description : '',
    frequency: h?.frequency === 'weekly' ? 'weekly' : 'daily',
    targetPerWeek: clamp(Number(h?.targetPerWeek ?? (h?.frequency === 'weekly' ? 3 : 7)), 1, 7),
    mastery: clamp(Number(h?.mastery ?? 0), 0, 100),
    createdAtISO: typeof h?.createdAtISO === 'string' ? h.createdAtISO : today,
    checkinsISO: uniqSortedISO(checkinsISO),
    checkinMeta,
    formationDays,
    cue: typeof h?.cue === 'string' ? h.cue : '',
    reward: typeof h?.reward === 'string' ? h.reward : '',
    ifThen: typeof h?.ifThen === 'string' ? h.ifThen : '',
  };
};

const loadHabitsV2 = (): Habit[] => {
  const parsed = safeJsonParse<any[]>(localStorage.getItem(STORAGE_V2), []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(Boolean).map(normalizeHabit);
};

const migrateV1ToV2IfNeeded = (): Habit[] => {
  const existingV2 = localStorage.getItem(STORAGE_V2);
  if (existingV2) return loadHabitsV2();

  const v1 = safeJsonParse<any[]>(localStorage.getItem(STORAGE_V1), []);
  if (!Array.isArray(v1) || v1.length === 0) return [];

  const migrated = v1.filter(Boolean).map((h: any) =>
    normalizeHabit({
      ...h,
      formationDays: 66, // sensible default
      checkinMeta: {},   // new in v2
    })
  );

  localStorage.setItem(STORAGE_V2, JSON.stringify(migrated));
  return migrated;
};

const saveHabitsV2 = (habits: Habit[]) => {
  localStorage.setItem(STORAGE_V2, JSON.stringify(habits));
};

/* ----------------------------- Computation ----------------------------- */

const computeStreak = (checkinsSet: Set<string>, todayISO: string) => {
  let streak = 0;
  let cursor = parseISOToDate(todayISO);

  // if today isn't done, start from yesterday
  if (!checkinsSet.has(todayISO)) cursor.setDate(cursor.getDate() - 1);

  while (streak < 365) {
    const iso = toISODateLocal(cursor);
    if (!checkinsSet.has(iso)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const computeStrength28 = (checkinsSet: Set<string>, now = new Date()) => {
  const last28 = lastNDaysISO(28, now);
  const doneCount = last28.reduce((acc, d) => acc + (checkinsSet.has(d) ? 1 : 0), 0);
  return Math.round((doneCount / 28) * 100);
};

const computeWeekDone = (checkinsSet: Set<string>, now = new Date()) => {
  const last7 = lastNDaysISO(7, now);
  return last7.reduce((acc, d) => acc + (checkinsSet.has(d) ? 1 : 0), 0);
};

/**
 * Formation progress:
 * - time-based progress to target days
 * - scaled by consistency factor (strength28)
 * This prevents "I created it 66 days ago" from instantly becoming 100% if I never do it.
 */
const computeFormationProgress = (habit: Habit, strength28: number, todayISO: string) => {
  const ageDays = clamp(daysBetween(habit.createdAtISO, todayISO) + 1, 1, 3650);
  const timeProgress = clamp((ageDays / clamp(habit.formationDays, 7, 365)) * 100, 0, 100);
  const consistencyFactor = clamp(strength28 / 100, 0, 1);
  const blended = Math.round(timeProgress * (0.35 + 0.65 * consistencyFactor)); // more weight on consistency
  return clamp(blended, 0, 100);
};

/* ----------------------------- Small hooks ----------------------------- */

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

/* =====================================================================================
  Main View
===================================================================================== */

const HabitView: React.FC = () => {
  const { t } = useLanguage();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'done' | 'todo'>('all');
  const [sort, setSort] = useState<'smart' | 'streak' | 'strength' | 'name' | 'newest'>('smart');

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => habits.find(h => h.id === selectedId) ?? null, [habits, selectedId]);

  useEffect(() => {
    const loaded = migrateV1ToV2IfNeeded();
    setHabits(loaded);
  }, []);

  useEffect(() => {
    saveHabitsV2(habits);
  }, [habits]);

  const todayISO = useMemo(() => toISODateLocal(new Date()), []);

  const computed: HabitComputed[] = useMemo(() => {
    const now = new Date();
    const items = habits.map((h) => {
      const set = new Set(h.checkinsISO);
      const doneToday = set.has(todayISO);
      const strength28 = computeStrength28(set, now);
      const streak = computeStreak(set, todayISO);
      const weekDone = computeWeekDone(set, now);
      const formationProgress = computeFormationProgress(h, strength28, todayISO);

      return {
        ...h,
        doneToday,
        strength28,
        streak,
        weekDone,
        weekTarget: clamp(h.targetPerWeek, 1, 7),
        formationProgress,
      };
    });

    // filter + search
    const q = query.trim().toLowerCase();
    let filtered = items.filter(h => {
      if (filter === 'done' && !h.doneToday) return false;
      if (filter === 'todo' && h.doneToday) return false;
      if (!q) return true;
      const hay = `${h.name} ${h.description ?? ''} ${h.cue ?? ''} ${h.ifThen ?? ''}`.toLowerCase();
      return hay.includes(q);
    });

    // sort
    filtered = filtered.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'newest') return b.createdAtISO.localeCompare(a.createdAtISO);
      if (sort === 'streak') return b.streak - a.streak;
      if (sort === 'strength') return b.strength28 - a.strength28;

      // smart: prioritize "todo", then higher formation progress, then strength, then streak
      if (a.doneToday !== b.doneToday) return Number(a.doneToday) - Number(b.doneToday);
      if (b.formationProgress !== a.formationProgress) return b.formationProgress - a.formationProgress;
      if (b.strength28 !== a.strength28) return b.strength28 - a.strength28;
      return b.streak - a.streak;
    });

    return filtered;
  }, [habits, todayISO, query, filter, sort]);

  const topStats = useMemo(() => {
    const total = habits.length;
    const doneToday = habits.reduce((acc, h) => acc + (h.checkinsISO.includes(todayISO) ? 1 : 0), 0);
    const totalCheckins = habits.reduce((acc, h) => acc + h.checkinsISO.length, 0);

    // avg formation progress over computed list (not filtered)
    const allComputed = habits.map(h => {
      const set = new Set(h.checkinsISO);
      const strength28 = computeStrength28(set, new Date());
      return computeFormationProgress(h, strength28, todayISO);
    });
    const avgFormation = allComputed.length ? Math.round(allComputed.reduce((a, b) => a + b, 0) / allComputed.length) : 0;

    return { total, doneToday, totalCheckins, avgFormation };
  }, [habits, todayISO]);

  const toggleToday = useCallback((habitId: string) => {
    const today = toISODateLocal(new Date());
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const set = new Set(h.checkinsISO);
      if (set.has(today)) set.delete(today);
      else set.add(today);

      const next = { ...h, checkinsISO: uniqSortedISO(Array.from(set)) };
      // keep meta if removing
      return next;
    }));
  }, []);

  const setMastery = useCallback((habitId: string, mastery: number) => {
    setHabits(prev => prev.map(h => (h.id === habitId ? { ...h, mastery: clamp(mastery, 0, 100) } : h)));
  }, []);

  const updateHabit = useCallback((habitId: string, patch: Partial<Habit>) => {
    setHabits(prev => prev.map(h => (h.id === habitId ? normalizeHabit({ ...h, ...patch }) : h)));
  }, []);

  const deleteHabit = useCallback((habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
    setSelectedId(prev => (prev === habitId ? null : prev));
  }, []);

  const resetAll = useCallback(() => {
    // safety: not auto-confirming, but still providing a quick “reset” (can be removed if you want)
    setHabits([]);
    setSelectedId(null);
    localStorage.removeItem(STORAGE_V2);
  }, []);

  return (
    <div className="view-container pb-32">
      {/* background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full blur-[110px] opacity-25 dark:opacity-10 bg-fuchsia-300" />
        <div className="absolute -bottom-24 -left-24 w-[460px] h-[460px] rounded-full blur-[110px] opacity-20 dark:opacity-10 bg-rose-300" />
        <div className="absolute top-[30%] left-[35%] w-[520px] h-[520px] rounded-full blur-[140px] opacity-10 dark:opacity-5 bg-indigo-300" />
      </div>

      {/* Header */}
      <div className="relative mb-8 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
              {t('habits.title') || 'Habit Lab Pro'} <span className="text-fuchsia-500">✦</span>
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300 max-w-2xl">
              Kickstart <span className="font-semibold">27 nap</span>, Autopilot <span className="font-semibold">66 nap</span> — és közben mérjük a valós konzisztenciát, nem csak a “napok számát”.
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition"
          >
            <Plus size={18} />
            <span className="font-bold">Új szokás</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={<Sparkles size={18} />} label="Aktív szokások" value={String(topStats.total)} />
          <StatCard icon={<BadgeCheck size={18} />} label="Mai check-in" value={`${topStats.doneToday}/${topStats.total || 0}`} />
          <StatCard icon={<CalendarDays size={18} />} label="Összes check-in" value={String(topStats.totalCheckins)} />
          <StatCard icon={<Target size={18} />} label="Átlag autopilot" value={`${topStats.avgFormation}%`} />
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Keresés (név, leírás, cue, if-then)…"
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/80 dark:bg-gray-900/70 border border-gray-200/70 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 shadow-sm backdrop-blur"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Segment
              icon={<SlidersHorizontal size={16} />}
              value={filter}
              onChange={(v) => setFilter(v as any)}
              options={[
                { id: 'all', label: 'Mind' },
                { id: 'todo', label: 'Ma még nem' },
                { id: 'done', label: 'Ma kész' },
              ]}
            />
            <Segment
              icon={<ChevronDown size={16} />}
              value={sort}
              onChange={(v) => setSort(v as any)}
              options={[
                { id: 'smart', label: 'Smart' },
                { id: 'strength', label: 'Konzisztencia' },
                { id: 'streak', label: 'Streak' },
                { id: 'newest', label: 'Új' },
                { id: 'name', label: 'Név' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {computed.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} onReset={habits.length ? resetAll : undefined} />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {computed.map(h => (
              <HabitCard
                key={h.id}
                habit={h}
                onToggleToday={() => toggleToday(h.id)}
                onOpen={() => setSelectedId(h.id)}
                onMastery={(m) => setMastery(h.id, m)}
                onDelete={() => deleteHabit(h.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <HabitDrawer
          habit={normalizeHabit(selected)}
          computed={computed.find(x => x.id === selected.id) ?? null}
          onClose={() => setSelectedId(null)}
          onToggleToday={() => toggleToday(selected.id)}
          onUpdate={(patch) => updateHabit(selected.id, patch)}
          onDelete={() => deleteHabit(selected.id)}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateHabitModal
          onClose={() => setShowCreate(false)}
          onCreate={(draft) => {
            const nowISO = toISODateLocal(new Date());
            const h: Habit = normalizeHabit({
              id: uid(),
              createdAtISO: nowISO,
              checkinsISO: [],
              checkinMeta: {},
              ...draft,
            });
            setHabits(prev => [h, ...prev]);
            setShowCreate(false);
            setSelectedId(h.id);
          }}
        />
      )}
    </div>
  );
};

/* =====================================================================================
  UI Components
===================================================================================== */

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-3xl p-5 border border-gray-200/60 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 backdrop-blur shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-2xl font-black text-gray-900 dark:text-white">{value}</div>
      </div>
    </div>
  </div>
);

const Segment: React.FC<{
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}> = ({ icon, value, onChange, options }) => (
  <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 backdrop-blur p-1 shadow-sm">
    {icon ? <div className="pl-2 text-gray-400">{icon}</div> : null}
    {options.map(opt => (
      <button
        key={opt.id}
        onClick={() => onChange(opt.id)}
        className={[
          'px-3 py-2 rounded-xl text-sm font-bold transition',
          value === opt.id
            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/60',
        ].join(' ')}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const HabitCard: React.FC<{
  habit: HabitComputed;
  onToggleToday: () => void;
  onOpen: () => void;
  onMastery: (m: number) => void;
  onDelete: () => void;
}> = ({ habit, onToggleToday, onOpen, onMastery, onDelete }) => {
  const last14 = useMemo(() => lastNDaysISO(14, new Date()), []);
  const checkSet = useMemo(() => new Set(habit.checkinsISO), [habit.checkinsISO]);

  return (
    <div
      className={[
        'group relative overflow-hidden rounded-3xl border shadow-sm backdrop-blur',
        'bg-white/75 dark:bg-gray-900/60 border-gray-200/60 dark:border-gray-800',
        habit.doneToday ? 'ring-2 ring-emerald-500/30' : '',
      ].join(' ')}
    >
      {/* subtle top gradient */}
      <div className="absolute inset-x-0 -top-24 h-40 bg-gradient-to-r from-fuchsia-300/25 via-rose-300/20 to-indigo-300/20 blur-2xl pointer-events-none" />

      <div className="relative p-5 md:p-6">
        <div className="flex items-start gap-4">
          {/* Toggle */}
          <button
            onClick={onToggleToday}
            className={[
              'shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition shadow-sm',
              habit.doneToday
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-300',
            ].join(' ')}
            title={habit.doneToday ? 'Ma kész (katt: visszavon)' : 'Check-in ma'}
          >
            {habit.doneToday ? <Check size={28} strokeWidth={3} /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <button onClick={onOpen} className="text-left w-full">
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-white truncate">
                  {habit.name}
                </h3>
                {habit.formationProgress >= 100 && (
                  <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <BadgeCheck size={14} /> Autopilot
                  </span>
                )}
              </div>
              {habit.description ? (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{habit.description}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-400">Adj hozzá egy rövid leírást (miért fontos).</p>
              )}
            </button>

            {/* micro meta */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge icon={<Flame size={14} />} text={`${habit.streak} nap streak`} tone={habit.streak > 0 ? 'warm' : 'neutral'} />
              <Badge icon={<Target size={14} />} text={`${habit.weekDone}/${habit.weekTarget} ezen a héten`} tone="cool" />
              <Badge icon={<Sparkles size={14} />} text={`${habit.strength28}% konzisztencia (28 nap)`} tone="neutral" />
            </div>
          </div>

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-rose-500 p-2"
            title="Törlés"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* 14-day chain */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Lánc (14 nap)</div>
            <div className="text-xs font-black text-gray-500 dark:text-gray-400">
              Formation: <span className="text-gray-900 dark:text-white">{habit.formationProgress}%</span>
            </div>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {last14.map(d => {
              const done = checkSet.has(d);
              const isToday = d === toISODateLocal(new Date());
              return (
                <div
                  key={d}
                  className={[
                    'w-5 h-5 rounded-md border transition',
                    done
                      ? 'bg-emerald-500/85 border-emerald-400/40'
                      : isToday
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-300/60 dark:border-gray-700'
                        : 'bg-transparent border-gray-200/60 dark:border-gray-800',
                  ].join(' ')}
                  title={`${d}${done ? ' ✓' : ''}`}
                />
              );
            })}
          </div>

          {/* progress bars */}
          <div className="mt-4 space-y-3">
            <ProgressRow label="Autopilot progress" value={habit.formationProgress} />
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Mastery</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {habit.mastery}% — {habit.mastery >= 80 ? 'nagyon stabil' : habit.mastery >= 50 ? 'alakul' : 'kezdeti'}
                  </div>
                </div>
                <div className="text-xs font-black text-gray-400">{habit.frequency === 'daily' ? 'Naponta' : 'Hetente'}</div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={habit.mastery}
                onChange={(e) => onMastery(Number(e.target.value))}
                className="w-full mt-3 accent-gray-900 dark:accent-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800">
        <div className="h-full bg-gray-900/80 dark:bg-white/80 transition-all" style={{ width: `${habit.strength28}%` }} />
      </div>
    </div>
  );
};

const Badge: React.FC<{ icon: React.ReactNode; text: string; tone: 'neutral' | 'warm' | 'cool' }> = ({ icon, text, tone }) => {
  const cls =
    tone === 'warm'
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : tone === 'cool'
        ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
        : 'bg-gray-500/10 text-gray-700 dark:text-gray-300';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${cls}`}>
      {icon}
      {text}
    </span>
  );
};

const ProgressRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-xs font-black text-gray-900 dark:text-white">{value}%</div>
    </div>
    <div className="h-2 rounded-full bg-gray-200/70 dark:bg-gray-800 overflow-hidden">
      <div className="h-full bg-gray-900 dark:bg-white transition-all" style={{ width: `${value}%` }} />
    </div>
  </div>
);

const EmptyState: React.FC<{ onCreate: () => void; onReset?: () => void }> = ({ onCreate, onReset }) => (
  <div className="rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 backdrop-blur p-10 text-center shadow-sm">
    <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center">
      <Sparkles size={22} />
    </div>
    <h3 className="mt-4 text-xl font-black text-gray-900 dark:text-white">Üres a labor</h3>
    <p className="mt-2 text-gray-600 dark:text-gray-300">
      Hozz létre 1 szokást, és tedd *nevetségesen könnyűvé* az első verzióját.
    </p>
    <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-black shadow hover:scale-[1.02] active:scale-[0.98] transition"
      >
        <Plus size={18} /> Új szokás
      </button>
      {onReset && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-black hover:bg-gray-50 dark:hover:bg-gray-800/60 transition"
          title="Törli a v2 tárolót (ha valami nagyon félrement)."
        >
          <RotateCcw size={18} /> Reset
        </button>
      )}
    </div>
  </div>
);

/* =====================================================================================
  Drawer (details)
===================================================================================== */

const HabitDrawer: React.FC<{
  habit: Habit;
  computed: HabitComputed | null;
  onClose: () => void;
  onToggleToday: () => void;
  onUpdate: (patch: Partial<Habit>) => void;
  onDelete: () => void;
}> = ({ habit, computed, onClose, onToggleToday, onUpdate, onDelete }) => {
  useEscape(true, onClose);

  const todayISO = toISODateLocal(new Date());
  const checkSet = useMemo(() => new Set(habit.checkinsISO), [habit.checkinsISO]);
  const doneToday = checkSet.has(todayISO);

  const [note, setNote] = useState<string>(() => habit.checkinMeta?.[todayISO]?.note ?? '');
  const [effort, setEffort] = useState<number>(() => habit.checkinMeta?.[todayISO]?.effort ?? 3);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    // sync when switching habits
    setNote(habit.checkinMeta?.[todayISO]?.note ?? '');
    setEffort(habit.checkinMeta?.[todayISO]?.effort ?? 3);
  }, [habit.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTodayMeta = useCallback(() => {
    const meta = { ...(habit.checkinMeta ?? {}) };
    meta[todayISO] = { note: note.trim(), effort: clamp(effort, 1, 5) };
    onUpdate({ checkinMeta: meta });
  }, [effort, habit.checkinMeta, note, onUpdate, todayISO]);

  const last30 = useMemo(() => lastNDaysISO(30, new Date()), []);
  const daysHU = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];

  return (
    <>
      <ScrollLock enabled={true} />
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Szokás</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white truncate">{habit.name}</div>
              {habit.description ? (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{habit.description}</div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditOpen(v => !v)}
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                title="Szerkesztés"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                title="Bezárás"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Today actions */}
          <div className="mt-4 grid grid-cols-1 gap-3">
            <button
              onClick={onToggleToday}
              className={[
                'w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black transition',
                doneToday
                  ? 'bg-emerald-500 text-white hover:brightness-95'
                  : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:brightness-95',
              ].join(' ')}
            >
              {doneToday ? <BadgeCheck size={18} /> : <Check size={18} />}
              {doneToday ? 'Ma kész ✅ (katt: visszavon)' : 'Check-in ma'}
            </button>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Effort (1–5)</div>
                <div className="text-sm font-black text-gray-900 dark:text-white">{effort}/5</div>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={effort}
                onChange={(e) => setEffort(Number(e.target.value))}
                onMouseUp={saveTodayMeta}
                onTouchEnd={saveTodayMeta}
                className="w-full mt-3 accent-gray-900 dark:accent-white"
              />
              <div className="mt-3">
                <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-2">Jegyzet (opcionális)</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={saveTodayMeta}
                  placeholder="Mi segített ma? Mi akadályozott?"
                  className="w-full min-h-[84px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10"
                />
              </div>
            </div>

            {/* Mastery */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Mastery</div>
                <div className="text-sm font-black text-gray-900 dark:text-white">{habit.mastery}%</div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={habit.mastery}
                onChange={(e) => onUpdate({ mastery: Number(e.target.value) })}
                className="w-full mt-3 accent-gray-900 dark:accent-white"
              />
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Info size={14} /> Ez szubjektív “mennyire stabil” skála. A rendszer mellé méri a konzisztenciát is.
              </div>
            </div>

            {/* Formation days */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Formation cél</div>
                  <div className="text-sm font-black text-gray-900 dark:text-white">{habit.formationDays} nap</div>
                </div>
                <div className="flex items-center gap-2">
                  {[27, 66, 90].map(n => (
                    <button
                      key={n}
                      onClick={() => onUpdate({ formationDays: n })}
                      className={[
                        'px-3 py-2 rounded-xl text-sm font-black border transition',
                        habit.formationDays === n
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent'
                          : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900',
                      ].join(' ')}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-2">Egyedi (7–365)</div>
                <input
                  type="number"
                  min={7}
                  max={365}
                  value={habit.formationDays}
                  onChange={(e) => onUpdate({ formationDays: clamp(Number(e.target.value || 66), 7, 365) })}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-3 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none"
                />
              </div>

              {computed ? (
                <div className="mt-4">
                  <ProgressRow label="Autopilot progress" value={computed.formationProgress} />
                </div>
              ) : null}
            </div>

            {/* 30-day calendar */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Lánc (30 nap)</div>
                <div className="text-xs font-black text-gray-500 dark:text-gray-400">{computed ? `${computed.strength28}% (28 nap)` : ''}</div>
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {last30.map(d => {
                  const done = checkSet.has(d);
                  const isToday = d === todayISO;
                  const dayIdx = new Date(d).getDay();
                  return (
                    <div
                      key={d}
                      className={[
                        'h-8 rounded-xl border flex items-center justify-center text-[10px] font-black transition',
                        done
                          ? 'bg-emerald-500/90 border-emerald-400/30 text-white'
                          : isToday
                            ? 'bg-gray-100 dark:bg-gray-900 border-gray-300/50 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                            : 'bg-transparent border-gray-200/60 dark:border-gray-800 text-gray-300 dark:text-gray-700',
                      ].join(' ')}
                      title={`${d}${done ? ' ✓' : ''}`}
                    >
                      {daysHU[dayIdx]}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Habit loop */}
            {(habit.cue || habit.reward || habit.ifThen) ? (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
                <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-2">Habit loop</div>
                {habit.cue ? <Line label="Cue" value={habit.cue} /> : null}
                {habit.ifThen ? <Line label="If-Then" value={habit.ifThen} /> : null}
                {habit.reward ? <Line label="Reward" value={habit.reward} /> : null}
              </div>
            ) : null}

            {/* Danger zone */}
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black tracking-widest uppercase text-rose-700 dark:text-rose-300">Danger zone</div>
                  <div className="text-sm font-bold text-rose-700 dark:text-rose-200">Szokás törlése</div>
                </div>
                <button
                  onClick={onDelete}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 bg-rose-600 text-white font-black hover:brightness-95 transition"
                >
                  <Trash2 size={16} /> Törlés
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Edit panel */}
        <div className="p-5">
          <button
            onClick={() => setEditOpen(v => !v)}
            className="w-full inline-flex items-center justify-between gap-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 font-black text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition"
          >
            <span className="inline-flex items-center gap-2"><Pencil size={16} /> Szerkesztés</span>
            {editOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {editOpen && (
            <div className="mt-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 space-y-4">
              <Field
                label="Név"
                value={habit.name}
                onChange={(v) => onUpdate({ name: v })}
                placeholder="pl. Reggeli jóga"
              />
              <Field
                label="Leírás"
                value={habit.description ?? ''}
                onChange={(v) => onUpdate({ description: v })}
                placeholder="Miért fontos? Mi a minimum verzió?"
                textarea
              />

              <div className="grid grid-cols-2 gap-2">
                <SelectPill
                  label="Gyakoriság"
                  value={habit.frequency}
                  options={[
                    { id: 'daily', label: 'Naponta' },
                    { id: 'weekly', label: 'Hetente' },
                  ]}
                  onChange={(v) => onUpdate({ frequency: v as HabitFrequency })}
                />
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-3">
                  <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Heti cél (1–7)</div>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={habit.targetPerWeek}
                    onChange={(e) => onUpdate({ targetPerWeek: clamp(Number(e.target.value || 7), 1, 7) })}
                    className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-black text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <Field
                label="Cue (kiváltó jel)"
                value={habit.cue ?? ''}
                onChange={(v) => onUpdate({ cue: v })}
                placeholder='pl. "Kávé után" / "Amikor leülök a géphez"'
              />
              <Field
                label="If-Then (implementációs szándék)"
                value={habit.ifThen ?? ''}
                onChange={(v) => onUpdate({ ifThen: v })}
                placeholder='pl. "Ha 20:00 van, akkor 10 perc nyújtás"'
              />
              <Field
                label="Reward (jutalom/lezárás)"
                value={habit.reward ?? ''}
                onChange={(v) => onUpdate({ reward: v })}
                placeholder='pl. "pipálás + tea" / "2 perc zene"'
              />
            </div>
          )}
        </div>

        {/* Footer spacing */}
        <div className="h-6" />
      </div>
    </>
  );
};

const Line: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex gap-3 py-2">
    <div className="w-20 text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">{label}</div>
    <div className="flex-1 text-sm font-bold text-gray-900 dark:text-white">{value}</div>
  </div>
);

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}> = ({ label, value, onChange, placeholder, textarea }) => (
  <div>
    <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-2">{label}</div>
    {textarea ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[90px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10"
      />
    ) : (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-3 py-3 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10"
      />
    )}
  </div>
);

const SelectPill: React.FC<{
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-3">
    <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-2">{label}</div>
    <div className="flex gap-2">
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={[
            'flex-1 px-3 py-2 rounded-xl text-sm font-black transition border',
            value === o.id
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent'
              : 'bg-white/60 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

/* =====================================================================================
  Create Modal (Wizard-lite)
===================================================================================== */

type HabitDraft = Partial<Habit> & {
  name: string;
};

const CreateHabitModal: React.FC<{
  onClose: () => void;
  onCreate: (draft: HabitDraft) => void;
}> = ({ onClose, onCreate }) => {
  useEscape(true, onClose);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<HabitDraft>({
    name: '',
    description: '',
    frequency: 'daily',
    targetPerWeek: 7,
    mastery: 0,
    formationDays: 66,
    cue: '',
    ifThen: '',
    reward: '',
  });

  const canNext = draft.name.trim().length > 0;

  return (
    <>
      <ScrollLock enabled={true} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div
          className="w-full max-w-xl rounded-[2rem] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Új szokás</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">Szokás létrehozása</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {step === 1 ? 'Alapok' : step === 2 ? 'Ütemezés + formation' : 'Habit loop (opcionális)'}
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {step === 1 && (
                <>
                  <Field
                    label="Név"
                    value={draft.name}
                    onChange={(v) => setDraft(d => ({ ...d, name: v }))}
                    placeholder="pl. 10 perc nyújtás"
                  />
                  <Field
                    label="Leírás (miért + minimum verzió)"
                    value={draft.description ?? ''}
                    onChange={(v) => setDraft(d => ({ ...d, description: v }))}
                    placeholder='pl. "Minimum: 2 perc. Ha van kedv: 10 perc."'
                    textarea
                  />
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4">
                    <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Mastery kezdés</div>
                    <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{draft.mastery ?? 0}%</div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={draft.mastery ?? 0}
                      onChange={(e) => setDraft(d => ({ ...d, mastery: Number(e.target.value) }))}
                      className="w-full mt-3 accent-gray-900 dark:accent-white"
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <SelectPill
                    label="Gyakoriság"
                    value={draft.frequency ?? 'daily'}
                    options={[
                      { id: 'daily', label: 'Naponta' },
                      { id: 'weekly', label: 'Hetente' },
                    ]}
                    onChange={(v) => setDraft(d => ({ ...d, frequency: v as HabitFrequency }))}
                  />

                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4">
                    <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Heti cél (1–7)</div>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={draft.targetPerWeek ?? 7}
                      onChange={(e) => setDraft(d => ({ ...d, targetPerWeek: clamp(Number(e.target.value || 7), 1, 7) }))}
                      className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-3 text-sm font-black text-gray-900 dark:text-white outline-none"
                    />
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Tipp: ha “naponta” a cél, maradhat 7/7, de nyugodtan kezdd 3/7-tel.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4">
                    <div className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400">Formation cél (nap)</div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {[27, 66, 90].map(n => (
                        <button
                          key={n}
                          onClick={() => setDraft(d => ({ ...d, formationDays: n }))}
                          className={[
                            'px-3 py-2 rounded-xl text-sm font-black border transition',
                            (draft.formationDays ?? 66) === n
                              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent'
                              : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900',
                          ].join(' ')}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={7}
                      max={365}
                      value={draft.formationDays ?? 66}
                      onChange={(e) => setDraft(d => ({ ...d, formationDays: clamp(Number(e.target.value || 66), 7, 365) }))}
                      className="mt-3 w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-3 text-sm font-black text-gray-900 dark:text-white outline-none"
                    />
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      27 = kickstart kihívás. 66 = tipikus “autopilot” átlag (nagy szórással).
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <Field
                    label="Cue (kiváltó jel)"
                    value={draft.cue ?? ''}
                    onChange={(v) => setDraft(d => ({ ...d, cue: v }))}
                    placeholder='pl. "Fogmosás után"'
                  />
                  <Field
                    label="If-Then (implementáció)"
                    value={draft.ifThen ?? ''}
                    onChange={(v) => setDraft(d => ({ ...d, ifThen: v }))}
                    placeholder='pl. "Ha 21:00 van, akkor 5 perc olvasás"'
                  />
                  <Field
                    label="Reward (jutalom)"
                    value={draft.reward ?? ''}
                    onChange={(v) => setDraft(d => ({ ...d, reward: v }))}
                    placeholder='pl. "pipálás + 1 perc zene"'
                  />

                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4 text-sm text-gray-700 dark:text-gray-300">
                    <div className="font-black mb-1">Mini tipp</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Tedd “nevetségesen könnyűvé” az első verziót.</li>
                      <li>Ha kimaradt egy nap: folytasd. Egy kihagyás nem nulláz mindent.</li>
                      <li>Az automatizmushoz a konzisztencia fontosabb, mint a “motiváció”.</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={() => setStep(s => (s === 1 ? 1 : (s - 1) as any))}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-black hover:bg-gray-50 dark:hover:bg-gray-900 transition"
              >
                Vissza
              </button>

              <div className="flex items-center gap-2">
                {step < 3 ? (
                  <button
                    onClick={() => canNext && setStep(s => (s === 3 ? 3 : (s + 1) as any))}
                    disabled={!canNext}
                    className={[
                      'inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-black transition',
                      canNext
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:brightness-95'
                        : 'bg-gray-200 text-gray-400 dark:bg-gray-900/40 dark:text-gray-600 cursor-not-allowed',
                    ].join(' ')}
                  >
                    Következő
                  </button>
                ) : (
                  <button
                    onClick={() => onCreate({ ...draft, name: draft.name.trim() })}
                    disabled={!canNext}
                    className={[
                      'inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-black transition',
                      canNext
                        ? 'bg-emerald-500 text-white hover:brightness-95'
                        : 'bg-gray-200 text-gray-400 dark:bg-gray-900/40 dark:text-gray-600 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <Plus size={18} /> Létrehozás
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HabitView;
