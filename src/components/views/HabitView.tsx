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
  TrendingUp,
  BarChart3,
  Zap,
  Clock,
  Brain,
  Trophy,
  Bell,
  Hash,
  Calendar,
  Layers,
  ChevronRight,
  Star,
  Activity,
  Target as TargetIcon,
  Calendar as CalendarIcon,
  TrendingDown,
  Eye,
  EyeOff,
  MoreVertical,
  Download,
  Upload,
  Filter,
  SortAsc,
  Settings,
  Moon,
  Sun,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/* =====================================================================================
  Habit Lab Pro (v3) - Premium Redesign
  - Modern glassmorphism design
  - Enhanced data visualization
  - Quick actions & batch operations
  - Advanced filtering & insights
  - Export/Import functionality
  - Dark/light mode improvements
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
  tags?: string[];
  priority?: number; // 1-5
};

type HabitComputed = Habit & {
  doneToday: boolean;
  streak: number;
  strength28: number; // consistency last 28 days %
  weekDone: number; // checkins last 7 days
  weekTarget: number; // targetPerWeek
  formationProgress: number; // 0..100
  successRate: number; // overall success percentage
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
    tags: Array.isArray(h?.tags) ? h.tags : [],
    priority: clamp(Number(h?.priority ?? 3), 1, 5),
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

const computeSuccessRate = (habit: Habit) => {
  if (!habit.checkinsISO.length) return 0;
  const created = parseISOToDate(habit.createdAtISO);
  const today = new Date();
  const totalDays = Math.max(1, Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
  const targetDays = habit.frequency === 'daily' ? totalDays : Math.ceil(totalDays / 7) * habit.targetPerWeek;
  return Math.round((habit.checkinsISO.length / Math.max(1, targetDays)) * 100);
};

const computeFormationProgress = (habit: Habit, strength28: number, todayISO: string) => {
  const ageDays = clamp(daysBetween(habit.createdAtISO, todayISO) + 1, 1, 3650);
  const timeProgress = clamp((ageDays / clamp(habit.formationDays, 7, 365)) * 100, 0, 100);
  const consistencyFactor = clamp(strength28 / 100, 0, 1);
  const blended = Math.round(timeProgress * (0.35 + 0.65 * consistencyFactor));
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
  Main View - Redesigned
===================================================================================== */

const HabitView: React.FC = () => {
  const { t } = useLanguage();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'done' | 'todo' | 'priority' | 'needs-attention'>('all');
  const [sort, setSort] = useState<'smart' | 'streak' | 'strength' | 'name' | 'newest' | 'priority'>('smart');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => habits.find(h => h.id === selectedId) ?? null, [habits, selectedId]);

  const [quickActions, setQuickActions] = useState({
    markAllToday: false,
    showCompletedOnly: false,
  });

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
      const successRate = computeSuccessRate(h);

      return {
        ...h,
        doneToday,
        strength28,
        streak,
        weekDone,
        weekTarget: clamp(h.targetPerWeek, 1, 7),
        formationProgress,
        successRate,
      };
    });

    // filter + search
    const q = query.trim().toLowerCase();
    let filtered = items.filter(h => {
      if (filter === 'done' && !h.doneToday) return false;
      if (filter === 'todo' && h.doneToday) return false;
      if (filter === 'priority' && h.priority! < 4) return false;
      if (filter === 'needs-attention' && h.strength28 >= 70) return false;
      
      if (selectedTags.length > 0) {
        const habitTags = h.tags || [];
        if (!selectedTags.some(tag => habitTags.includes(tag))) return false;
      }
      
      if (!q) return true;
      const hay = `${h.name} ${h.description ?? ''} ${h.cue ?? ''} ${h.ifThen ?? ''} ${(h.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });

    // sort
    filtered = filtered.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'newest') return b.createdAtISO.localeCompare(a.createdAtISO);
      if (sort === 'streak') return b.streak - a.streak;
      if (sort === 'strength') return b.strength28 - a.strength28;
      if (sort === 'priority') return (b.priority || 3) - (a.priority || 3);

      // smart: prioritize "todo", then higher formation progress, then strength, then streak
      if (a.doneToday !== b.doneToday) return Number(a.doneToday) - Number(b.doneToday);
      if (b.formationProgress !== a.formationProgress) return b.formationProgress - a.formationProgress;
      if (b.strength28 !== a.strength28) return b.strength28 - a.strength28;
      return b.streak - a.streak;
    });

    return filtered;
  }, [habits, todayISO, query, filter, sort, selectedTags]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    habits.forEach(h => (h.tags || []).forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [habits]);

  const topStats = useMemo(() => {
    const total = habits.length;
    const doneToday = habits.reduce((acc, h) => acc + (h.checkinsISO.includes(todayISO) ? 1 : 0), 0);
    const totalCheckins = habits.reduce((acc, h) => acc + h.checkinsISO.length, 0);
    const totalStreak = habits.reduce((acc, h) => {
      const set = new Set(h.checkinsISO);
      return acc + computeStreak(set, todayISO);
    }, 0);

    const allComputed = habits.map(h => {
      const set = new Set(h.checkinsISO);
      const strength28 = computeStrength28(set, new Date());
      return computeFormationProgress(h, strength28, todayISO);
    });
    const avgFormation = allComputed.length ? Math.round(allComputed.reduce((a, b) => a + b, 0) / allComputed.length) : 0;

    return { total, doneToday, totalCheckins, avgFormation, totalStreak };
  }, [habits, todayISO]);

  const toggleToday = useCallback((habitId: string) => {
    const today = toISODateLocal(new Date());
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const set = new Set(h.checkinsISO);
      if (set.has(today)) set.delete(today);
      else set.add(today);

      const next = { ...h, checkinsISO: uniqSortedISO(Array.from(set)) };
      return next;
    }));
  }, []);

  const toggleAllToday = useCallback(() => {
    const today = toISODateLocal(new Date());
    setHabits(prev => prev.map(h => {
      const set = new Set(h.checkinsISO);
      if (!set.has(today)) set.add(today);
      return { ...h, checkinsISO: uniqSortedISO(Array.from(set)) };
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
    if (window.confirm('Biztosan törlöd az összes szokást? Ez a művelet nem visszavonható.')) {
      setHabits([]);
      setSelectedId(null);
      localStorage.removeItem(STORAGE_V2);
    }
  }, []);

  const exportHabits = useCallback(() => {
    const data = {
      habits,
      exportedAt: new Date().toISOString(),
      version: 'v3',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-lab-pro-backup-${todayISO}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [habits, todayISO]);

  const importHabits = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.habits && Array.isArray(data.habits)) {
          if (window.confirm(`${data.habits.length} szokás betöltése? A meglévők felülíródnak.`)) {
            const normalized = data.habits.map(normalizeHabit);
            setHabits(normalized);
            saveHabitsV2(normalized);
          }
        }
      } catch (error) {
        alert('Hibás fájl formátum');
      }
    };
    reader.readAsText(file);
  }, []);

  return (
    <div className="view-container pb-32 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Enhanced background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/5 via-transparent to-purple-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-500/5 via-transparent to-amber-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-emerald-500/3 via-transparent to-cyan-500/3 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative mb-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <Brain size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
                    Habit Lab <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Pro</span>
                  </h1>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    27 nap Kickstart • 66 nap Autopilot • Tudományos habit formálás
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={exportHabits}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                title="Exportálás"
              >
                <Download size={16} />
              </button>
              <label className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer">
                <Upload size={16} />
                <input type="file" accept=".json" onChange={importHabits} className="hidden" />
              </label>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition"
              >
                <Plus size={18} />
                <span className="font-bold">Új szokás</span>
              </button>
            </div>
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="col-span-2 lg:col-span-1">
              <div className="rounded-2xl p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">Aktív szokások</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">{topStats.total}</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 flex items-center justify-center">
                    <Layers size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-2 lg:col-span-1">
              <div className="rounded-2xl p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">Mai teljesítés</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                      {topStats.doneToday}<span className="text-gray-400">/</span>{topStats.total}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 flex items-center justify-center">
                    <Target size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-2 lg:col-span-1">
              <div className="rounded-2xl p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">Összes check-in</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">{topStats.totalCheckins}</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/10 flex items-center justify-center">
                    <Calendar size={20} className="text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-2 lg:col-span-1">
              <div className="rounded-2xl p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">Átlag autopilot</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">{topStats.avgFormation}%</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 flex items-center justify-center">
                    <TrendingUp size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-white/50 to-white/30 dark:from-gray-900/50 dark:to-gray-900/30 backdrop-blur border border-gray-200/50 dark:border-gray-800/50">
            <button
              onClick={toggleAllToday}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg transition"
            >
              <Check size={16} />
              <span className="font-semibold">Mindet ma</span>
            </button>
            
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
            
            <button
              onClick={() => setViewMode(mode => mode === 'grid' ? 'list' : 'grid')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
            >
              {viewMode === 'grid' ? <Layers size={16} /> : <Hash size={16} />}
              <span className="font-semibold">{viewMode === 'grid' ? 'Rács' : 'Lista'}</span>
            </button>

            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
            >
              <Filter size={16} />
              <span className="font-semibold">Szűrők</span>
              {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="rounded-2xl p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Státusz</div>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'todo', 'done', 'priority', 'needs-attention'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFilter(opt as any)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          filter === opt
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {opt === 'all' && 'Mind'}
                        {opt === 'todo' && 'Ma nem'}
                        {opt === 'done' && 'Ma kész'}
                        {opt === 'priority' && 'Fontos'}
                        {opt === 'needs-attention' && 'Figyelmet igényel'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Rendezés</div>
                  <div className="flex flex-wrap gap-2">
                    {['smart', 'streak', 'strength', 'newest', 'name', 'priority'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setSort(opt as any)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          sort === opt
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {opt === 'smart' && 'Smart'}
                        {opt === 'streak' && 'Streak'}
                        {opt === 'strength' && 'Konzisztencia'}
                        {opt === 'newest' && 'Legújabb'}
                        {opt === 'name' && 'Név'}
                        {opt === 'priority' && 'Prioritás'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Címkék</div>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTags(prev => 
                          prev.includes(tag) 
                            ? prev.filter(t => t !== tag)
                            : [...prev, tag]
                        )}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          selectedTags.includes(tag)
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                    {allTags.length === 0 && (
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Nincsenek címkék</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Keresés a szokások között..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-gray-200/50 dark:border-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {computed.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} onReset={habits.length ? resetAll : undefined} />
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-4"}>
            {computed.map(h => (
              <HabitCard
                key={h.id}
                habit={h}
                viewMode={viewMode}
                onToggleToday={() => toggleToday(h.id)}
                onOpen={() => setSelectedId(h.id)}
                onMastery={(m) => setMastery(h.id, m)}
                onDelete={() => deleteHabit(h.id)}
                onUpdate={(patch) => updateHabit(h.id, patch)}
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
  UI Components - Redesigned
===================================================================================== */

const HabitCard: React.FC<{
  habit: HabitComputed;
  viewMode: 'grid' | 'list';
  onToggleToday: () => void;
  onOpen: () => void;
  onMastery: (m: number) => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<Habit>) => void;
}> = ({ habit, viewMode, onToggleToday, onOpen, onMastery, onDelete, onUpdate }) => {
  const last14 = useMemo(() => lastNDaysISO(14, new Date()), []);
  const checkSet = useMemo(() => new Set(habit.checkinsISO), [habit.checkinsISO]);

  const priorityColors = [
    'from-gray-400 to-gray-500',
    'from-amber-400 to-amber-500',
    'from-blue-400 to-blue-500',
    'from-purple-400 to-purple-500',
    'from-rose-400 to-rose-500',
  ];

  if (viewMode === 'list') {
    return (
      <div className="group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-gray-200/50 dark:border-gray-800/50 hover:border-gray-300/50 dark:hover:border-gray-700/50 transition-all hover:shadow-lg">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={onToggleToday}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition ${
              habit.doneToday
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg'
                : 'border-2 border-gray-300 dark:border-gray-700 text-gray-400 hover:border-emerald-400 dark:hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            {habit.doneToday ? <Check size={20} /> : <Plus size={20} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <button onClick={onOpen} className="text-left">
                <h3 className="font-bold text-gray-900 dark:text-white truncate">{habit.name}</h3>
              </button>
              <div className={`px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${priorityColors[habit.priority! - 1] || 'from-gray-400 to-gray-500'} text-white`}>
                {habit.priority}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Flame size={14} /> {habit.streak} nap
              </span>
              <span className="flex items-center gap-1">
                <Target size={14} /> {habit.strength28}%
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp size={14} /> {habit.formationProgress}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {last14.slice(-7).map(d => (
                <div
                  key={d}
                  className={`w-2 h-2 rounded-full ${checkSet.has(d) ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                  title={d}
                />
              ))}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 text-gray-400 hover:text-rose-500 transition"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-gray-200/50 dark:border-gray-800/50 hover:border-gray-300/50 dark:hover:border-gray-700/50 transition-all hover:shadow-lg">
      {/* Priority indicator */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${priorityColors[habit.priority! - 1] || 'from-gray-400 to-gray-500'}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <button onClick={onOpen} className="text-left w-full">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{habit.name}</h3>
              {habit.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{habit.description}</p>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleToday}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                habit.doneToday
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg'
                  : 'border-2 border-gray-300 dark:border-gray-700 text-gray-400 hover:border-emerald-400 dark:hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              {habit.doneToday ? <Check size={24} /> : <Plus size={24} />}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-600/5">
            <div className="text-lg font-black text-gray-900 dark:text-white">{habit.streak}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Streak</div>
          </div>
          <div className="text-center p-2 rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-600/5">
            <div className="text-lg font-black text-gray-900 dark:text-white">{habit.strength28}%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Konzisztencia</div>
          </div>
          <div className="text-center p-2 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-600/5">
            <div className="text-lg font-black text-gray-900 dark:text-white">{habit.formationProgress}%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Autopilot</div>
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              <span>Autopilot</span>
              <span>{habit.formationProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" 
                style={{ width: `${habit.formationProgress}%` }} 
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              <span>Mastery</span>
              <span>{habit.mastery}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={habit.mastery}
              onChange={(e) => onMastery(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-500"
            />
          </div>
        </div>

        {/* 14-day chain */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">14 nap lánc</div>
          <div className="flex gap-1">
            {last14.map(d => {
              const done = checkSet.has(d);
              const isToday = d === toISODateLocal(new Date());
              return (
                <div
                  key={d}
                  className={`flex-1 h-8 rounded-lg border transition-all ${
                    done
                      ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-400'
                      : isToday
                        ? 'bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 border-gray-300 dark:border-gray-700'
                        : 'bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-800'
                  }`}
                  title={`${d}${done ? ' ✓' : ''}`}
                />
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-800/50">
          <div className="flex items-center gap-2">
            {habit.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {tag}
              </span>
            ))}
            {habit.tags && habit.tags.length > 2 && (
              <span className="text-xs text-gray-500">+{habit.tags.length - 2}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              habit.doneToday 
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' 
                : 'bg-gray-500/10 text-gray-700 dark:text-gray-300'
            }`}>
              {habit.frequency === 'daily' ? 'Naponta' : 'Hetente'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 text-gray-400 hover:text-rose-500 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ onCreate: () => void; onReset?: () => void }> = ({ onCreate, onReset }) => (
  <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-800 bg-gradient-to-br from-white/60 to-white/40 dark:from-gray-900/60 dark:to-gray-900/40 backdrop-blur p-12 text-center">
    <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
      <Sparkles size={32} className="text-blue-600 dark:text-blue-400" />
    </div>
    <h3 className="mt-4 text-2xl font-black text-gray-900 dark:text-white">Üres a labor</h3>
    <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
      Hozz létre az első szokásod, és kezdd el nyomon követni a fejlődésedet.
    </p>
    <div className="mt-8 flex items-center justify-center gap-3">
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition"
      >
        <Plus size={20} /> Új szokás létrehozása
      </button>
      {onReset && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
        >
          <RotateCcw size={18} /> Adatok törlése
        </button>
      )}
    </div>
  </div>
);

/* =====================================================================================
  Drawer (details) - Redesigned
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
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'settings'>('overview');

  useEffect(() => {
    setNote(habit.checkinMeta?.[todayISO]?.note ?? '');
    setEffort(habit.checkinMeta?.[todayISO]?.effort ?? 3);
  }, [habit.id, todayISO, habit.checkinMeta]);

  const saveTodayMeta = useCallback(() => {
    const meta = { ...(habit.checkinMeta ?? {}) };
    meta[todayISO] = { note: note.trim(), effort: clamp(effort, 1, 5) };
    onUpdate({ checkinMeta: meta });
  }, [effort, habit.checkinMeta, note, onUpdate, todayISO]);

  const last30 = useMemo(() => lastNDaysISO(30, new Date()), []);
  const daysHU = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];

  const getEffortColor = (value: number) => {
    if (value <= 2) return 'from-rose-500 to-rose-600';
    if (value === 3) return 'from-amber-500 to-amber-600';
    return 'from-emerald-500 to-emerald-600';
  };

  return (
    <>
      <ScrollLock enabled={true} />
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[640px] bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className={`px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${computed?.formationProgress === 100 ? 'from-emerald-500 to-emerald-600' : 'from-blue-500 to-purple-500'} text-white`}>
                  {computed?.formationProgress === 100 ? 'Autopilot' : 'Kickstart'}
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {habit.frequency === 'daily' ? 'Naponta' : 'Hetente'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">{habit.name}</h2>
              {habit.description && (
                <p className="mt-2 text-gray-600 dark:text-gray-400">{habit.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleToday}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition ${
                  doneToday
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg'
                    : 'border-2 border-gray-300 dark:border-gray-700 text-gray-400 hover:border-emerald-400 dark:hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                {doneToday ? <Check size={28} /> : <Plus size={28} />}
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            {(['overview', 'stats', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'overview' && 'Áttekintés'}
                {tab === 'stats' && 'Statisztikák'}
                {tab === 'settings' && 'Beállítások'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-200px)] p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Today's Check-in */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-900/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Ma</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{todayISO}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${getEffortColor(effort)} text-white`}>
                    Effort: {effort}/5
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Effort szint (1-5)</div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={effort}
                      onChange={(e) => setEffort(Number(e.target.value))}
                      onMouseUp={saveTodayMeta}
                      onTouchEnd={saveTodayMeta}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Könnyű</span>
                      <span>Közepes</span>
                      <span>Nehéz</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Jegyzet</div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      onBlur={saveTodayMeta}
                      placeholder="Mi ment jól ma? Mi volt nehéz? Mire figyeltél fel?"
                      className="w-full min-h-[100px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Progress Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Streak</div>
                  <div className="text-2xl font-black text-gray-900 dark:text-white">{computed?.streak || 0} nap</div>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Konzisztencia</div>
                  <div className="text-2xl font-black text-gray-900 dark:text-white">{computed?.strength28 || 0}%</div>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Autopilot</div>
                  <div className="text-2xl font-black text-gray-900 dark:text-white">{computed?.formationProgress || 0}%</div>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Sikerarány</div>
                  <div className="text-2xl font-black text-gray-900 dark:text-white">{computed?.successRate || 0}%</div>
                </div>
              </div>

              {/* 30-day Calendar */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">30 nap lánc</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {habit.checkinsISO.filter(d => daysBetween(d, todayISO) <= 30).length}/30 nap
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {last30.map(d => {
                    const done = checkSet.has(d);
                    const isToday = d === todayISO;
                    return (
                      <div
                        key={d}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition ${
                          done
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                            : isToday
                              ? 'border-2 border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'border border-gray-200 dark:border-gray-800 text-gray-400'
                        }`}
                        title={`${d}${done ? ' ✓' : ''}`}
                      >
                        {new Date(d).getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Habit Loop */}
              {(habit.cue || habit.reward || habit.ifThen) && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Habit Loop</div>
                  <div className="space-y-3">
                    {habit.cue && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 flex items-center justify-center">
                          <Bell size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">Cue</div>
                          <div className="text-sm text-gray-900 dark:text-white">{habit.cue}</div>
                        </div>
                      </div>
                    )}
                    {habit.ifThen && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/10 flex items-center justify-center">
                          <Brain size={16} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">If-Then</div>
                          <div className="text-sm text-gray-900 dark:text-white">{habit.ifThen}</div>
                        </div>
                      </div>
                    )}
                    {habit.reward && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/10 flex items-center justify-center">
                          <Trophy size={16} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">Reward</div>
                          <div className="text-sm text-gray-900 dark:text-white">{habit.reward}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Mastery */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Mastery</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Hogy érződik a szokás?</div>
                  </div>
                  <div className="text-lg font-black text-gray-900 dark:text-white">{habit.mastery}%</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={habit.mastery}
                  onChange={(e) => onUpdate({ mastery: Number(e.target.value) })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <span>Kezdeti</span>
                  <span>Stabil</span>
                  <span>Automatikus</span>
                </div>
              </div>

              {/* Formation Progress */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Formation Progress</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {habit.formationDays} nap cél ({computed?.formationProgress || 0}%)
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[27, 66, 90].map(n => (
                      <button
                        key={n}
                        onClick={() => onUpdate({ formationDays: n })}
                        className={`px-3 py-1.5 text-sm rounded-lg transition ${
                          habit.formationDays === n
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${computed?.formationProgress || 0}%` }}
                  />
                </div>
              </div>

              {/* Weekly Target */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Heti cél</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {computed?.weekDone || 0}/{habit.targetPerWeek} nap ezen a héten
                    </div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={habit.targetPerWeek}
                    onChange={(e) => onUpdate({ targetPerWeek: clamp(Number(e.target.value || 7), 1, 7) })}
                    className="w-20 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-center"
                  />
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-8 rounded-lg transition ${
                        i < (computed?.weekDone || 0)
                          ? 'bg-gradient-to-b from-emerald-500 to-emerald-600'
                          : i < habit.targetPerWeek
                            ? 'bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900'
                            : 'bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-950 opacity-50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Edit Form */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Szokás szerkesztése</div>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Név</div>
                    <input
                      value={habit.name}
                      onChange={(e) => onUpdate({ name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Leírás</div>
                    <textarea
                      value={habit.description || ''}
                      onChange={(e) => onUpdate({ description: e.target.value })}
                      className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Gyakoriság</div>
                      <select
                        value={habit.frequency}
                        onChange={(e) => onUpdate({ frequency: e.target.value as HabitFrequency })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                      >
                        <option value="daily">Naponta</option>
                        <option value="weekly">Hetente</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Prioritás</div>
                      <select
                        value={habit.priority}
                        onChange={(e) => onUpdate({ priority: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                      >
                        {[1, 2, 3, 4, 5].map(p => (
                          <option key={p} value={p}>{p} - {p === 1 ? 'Alacsony' : p === 3 ? 'Közepes' : 'Magas'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Címkék</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {habit.tags?.map(tag => (
                    <div key={tag} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                      <span className="text-sm text-gray-900 dark:text-white">{tag}</span>
                      <button
                        onClick={() => {
                          const newTags = habit.tags?.filter(t => t !== tag) || [];
                          onUpdate({ tags: newTags });
                        }}
                        className="text-gray-400 hover:text-rose-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Címke hozzáadása..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const newTag = e.currentTarget.value.trim();
                      const currentTags = habit.tags || [];
                      if (!currentTags.includes(newTag)) {
                        onUpdate({ tags: [...currentTags, newTag] });
                      }
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                />
              </div>

              {/* Danger Zone */}
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/50 to-rose-100/30 dark:from-rose-950/20 dark:to-rose-900/10 p-5">
                <div className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-2">Veszélyes műveletek</div>
                <div className="text-xs text-rose-600 dark:text-rose-400 mb-4">
                  Ezek a műveletek nem visszavonhatóak
                </div>
                <button
                  onClick={onDelete}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-white font-semibold hover:shadow-lg transition"
                >
                  <Trash2 size={18} /> Szokás törlése
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* =====================================================================================
  Create Modal (Wizard-lite) - Redesigned
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
    tags: [],
    priority: 3,
  });

  const canNext = draft.name.trim().length > 0;

  return (
    <>
      <ScrollLock enabled={true} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div
          className="w-full max-w-2xl rounded-3xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Plus size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">Új szokás</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {step === 1 ? 'Alap információk' : step === 2 ? 'Célok és mérések' : 'Hogyan működik?'}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex-1 flex items-center">
                {[1, 2, 3].map((num) => (
                  <React.Fragment key={num}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition ${
                      num === step
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : num < step
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                    }`}>
                      {num}
                    </div>
                    {num < 3 && (
                      <div className={`flex-1 h-1 mx-2 transition ${
                        num < step ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gray-200 dark:bg-gray-800'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {step === 1 && (
                <>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Mi a szokásod neve?</div>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
                      placeholder="pl. Reggeli 10 perc meditáció"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Miért fontos ez a szokás?</div>
                    <textarea
                      value={draft.description ?? ''}
                      onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
                      placeholder="Írj egy rövid leírást arról, miért fontos ez a szokás és mit jelent számodra..."
                      className="w-full min-h-[120px] px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 resize-none"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Prioritás (1-5)</div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, priority: p }))}
                          className={`flex-1 py-3 rounded-xl border transition ${
                            draft.priority === p
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent'
                              : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Gyakoriság</div>
                      <select
                        value={draft.frequency}
                        onChange={(e) => setDraft(d => ({ ...d, frequency: e.target.value as HabitFrequency }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                      >
                        <option value="daily">Naponta</option>
                        <option value="weekly">Hetente</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Heti cél</div>
                      <input
                        type="number"
                        min={1}
                        max={7}
                        value={draft.targetPerWeek}
                        onChange={(e) => setDraft(d => ({ ...d, targetPerWeek: clamp(Number(e.target.value || 7), 1, 7) }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Formation cél (napok)</div>
                    <div className="flex gap-2 mb-4">
                      {[27, 66, 90].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, formationDays: n }))}
                          className={`flex-1 py-3 rounded-xl border transition ${
                            draft.formationDays === n
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent'
                              : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {n} nap
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={7}
                      max={365}
                      value={draft.formationDays}
                      onChange={(e) => setDraft(d => ({ ...d, formationDays: clamp(Number(e.target.value || 66), 7, 365) }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                      placeholder="Egyedi érték (7-365)"
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Cue (Kiváltó jel)</div>
                    <input
                      value={draft.cue ?? ''}
                      onChange={(e) => setDraft(d => ({ ...d, cue: e.target.value }))}
                      placeholder="pl. Reggeli kávé után..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">If-Then terv</div>
                    <input
                      value={draft.ifThen ?? ''}
                      onChange={(e) => setDraft(d => ({ ...d, ifThen: e.target.value }))}
                      placeholder="pl. Ha 21:00 van, akkor 5 perc olvasok..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Reward (Jutalom)</div>
                    <input
                      value={draft.reward ?? ''}
                      onChange={(e) => setDraft(d => ({ ...d, reward: e.target.value }))}
                      placeholder="pl. Pihenés, pozitív jegyzet, apró jutalom..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                    />
                  </div>
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800/30 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 p-4">
                    <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">🎯 Pro tippek</div>
                    <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        Tedd "nevetségesen könnyűvé" az első verziót
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        Egy kihagyott nap nem nullázza a streak-et
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        Fontosabb a konzisztencia, mint a tökéletesség
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(s => (s === 1 ? 1 : (s - 1) as any))}
                className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Vissza
              </button>

              <div className="flex items-center gap-3">
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => canNext && setStep(s => (s === 3 ? 3 : (s + 1) as any))}
                    disabled={!canNext}
                    className={`px-6 py-3 rounded-xl font-semibold transition ${
                      canNext
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Következő
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCreate({ ...draft, name: draft.name.trim() })}
                    disabled={!canNext}
                    className={`px-6 py-3 rounded-xl font-semibold transition ${
                      canNext
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Check size={18} /> Létrehozás
                    </div>
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