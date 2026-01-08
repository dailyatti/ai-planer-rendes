import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Plus,
    Flame,
    TrendingUp,
    Check,
    X,
    Clock,
    ChevronLeft,
    ChevronRight,
    LayoutList,
    LayoutGrid,
    Search,
    SlidersHorizontal,
    Archive,
    RotateCcw,
    Pencil,
    Save,
    Trash2,
    Calendar as CalendarIcon,
    Hash,
    Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * =====================================================================================
 * HABIT STUDIO PRO (V4)
 * - Weekly + Monthly goals
 * - Binary vs Count tracking
 * - Strict i18n compliance
 * =====================================================================================
 */

/* ---------------------------------- Types ---------------------------------- */

type GoalPeriod = 'daily' | 'weekly' | 'monthly';
type GoalMode = 'binary' | 'count';

type HabitGoal = {
    period: GoalPeriod;
    target: number;
    mode: GoalMode;
};

type HabitDayLog = {
    date: string; // YYYY-MM-DD local
    count: number;
    completed: boolean;
    timestamps?: number[];
    times?: string[];
    note?: string;
};

type Habit = {
    id: string;
    name: string;
    description?: string;
    emoji: string;
    color: string;
    goal: HabitGoal;
    history: Record<string, HabitDayLog>;
    createdAt: string;
    archived?: boolean;
    mastery: number; // 0-100
    order?: number;
};

type PersistedV4 =
    | { version: 4; habits: Habit[]; updatedAt: number }
    | Habit[]; // legacy

/* ---------------------------------- Consts ---------------------------------- */

const STORAGE_KEY = 'habit-studio-v3-data';

const EMOJIS = ['💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🎯', '🧠', '🎨', '🎵', '🌱', '☀️', '💻', '💸'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/* ------------------------------ Date Utilities ------------------------------ */

function toLocalISODate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseISODateLocal(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function startOfWeekMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    return addDays(d, diff);
}

function endOfWeekMonday(date: Date) {
    return addDays(startOfWeekMonday(date), 6);
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function daysInMonthGrid(monthDate: Date) {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const gridStart = startOfWeekMonday(monthStart);
    const gridEnd = endOfWeekMonday(monthEnd);
    const days: Date[] = [];
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) {
        days.push(new Date(d));
    }
    return days;
}

function formatMonthYear(date: Date, locale: string) {
    return date.toLocaleString(locale, { month: 'long', year: 'numeric' });
}

function formatShort(date: Date, locale: string) {
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function formatWeekRange(weekAnchor: Date, locale: string) {
    const s = startOfWeekMonday(weekAnchor);
    const e = endOfWeekMonday(weekAnchor);
    const sFmt = formatShort(s, locale);
    const eFmt = formatShort(e, locale);
    const y = e.getFullYear() !== s.getFullYear() ? ` ${e.getFullYear()}` : '';
    return `${sFmt} – ${eFmt}${y}`;
}

/* ------------------------------ Logic ------------------------------ */

function logIsCompletedForGoal(goal: HabitGoal, log?: HabitDayLog) {
    if (!log) return false;
    return log.count >= 1; // Simplification: any activity counts as "done" for streak, but specific targets apply for progress
}

function countInRange(h: Habit, fromISO: string, toISO: string) {
    const from = parseISODateLocal(fromISO);
    const to = parseISODateLocal(toISO);
    let sum = 0;
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
        const log = h.history[toLocalISODate(d)];
        if (log) sum += clamp(log.count || 0, 0, 9999);
    }
    return sum;
}

function binaryDaysCompletedInRange(h: Habit, fromISO: string, toISO: string) {
    const from = parseISODateLocal(fromISO);
    const to = parseISODateLocal(toISO);
    let doneDays = 0;
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
        const log = h.history[toLocalISODate(d)];
        if (logIsCompletedForGoal(h.goal, log)) doneDays += 1;
    }
    return doneDays;
}

function progressForPeriod(h: Habit, anchorDate: Date) {
    const { goal } = h;
    const period = goal.period;
    const target = clamp(goal.target, 1, 9999);

    if (period === 'daily') {
        const iso = toLocalISODate(anchorDate);
        const count = h.history[iso]?.count || 0;
        const done = goal.mode === 'binary' ? (count >= 1 ? 1 : 0) : count;
        return { done, target };
    }

    let from: string, to: string;
    if (period === 'weekly') {
        from = toLocalISODate(startOfWeekMonday(anchorDate));
        to = toLocalISODate(endOfWeekMonday(anchorDate));
    } else {
        from = toLocalISODate(startOfMonth(anchorDate));
        to = toLocalISODate(endOfMonth(anchorDate));
    }

    const done = goal.mode === 'binary'
        ? binaryDaysCompletedInRange(h, from, to)
        : countInRange(h, from, to);

    return { done, target };
}

function getDailyStreak(h: Habit, todayISO: string) {
    let streak = 0;
    const today = parseISODateLocal(todayISO);
    for (let i = 0; i < 365; i++) {
        const d = addDays(today, -i);
        const log = h.history[toLocalISODate(d)];
        if (logIsCompletedForGoal(h.goal, log)) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    return streak;
}

function normalizeHabit(anyHabit: any): Habit {
    const goal: HabitGoal = {
        period: (anyHabit?.goal?.period as GoalPeriod) || 'daily',
        target: clamp(Number(anyHabit?.goal?.target ?? 1), 1, 9999),
        mode: (anyHabit?.goal?.mode as GoalMode) || 'binary',
    };

    const rawHistory = anyHabit?.history || {};
    const history: Record<string, HabitDayLog> = {};

    Object.keys(rawHistory).forEach((k) => {
        const v = rawHistory[k];
        const completed = !!v?.completed;
        const count = clamp(Number(v?.count ?? (completed ? 1 : 0)), 0, 9999);
        history[k] = {
            date: k,
            count,
            completed: completed || count >= 1,
            note: v?.note,
            timestamps: v?.timestamps,
            times: v?.times
        };
    });

    return {
        id: String(anyHabit?.id ?? Date.now()),
        name: String(anyHabit?.name ?? anyHabit?.text ?? 'Habit').trim(),
        description: anyHabit?.description,
        emoji: anyHabit?.emoji ?? EMOJIS[0],
        color: anyHabit?.color ?? COLORS[0],
        goal,
        history,
        createdAt: anyHabit?.createdAt ?? new Date().toISOString(),
        archived: !!anyHabit?.archived,
        mastery: clamp(Number(anyHabit?.mastery ?? 0), 0, 100),
        order: anyHabit?.order
    };
}

/* ------------------------------ Components ------------------------------ */

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

type ModalProps = { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; };

function Modal({ open, onClose, title, children, footer }: ModalProps) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                    >
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
                        {footer && <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">{footer}</div>}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------ Main ------------------------------ */

export default function HabitView() {
    const { t, language } = useLanguage();
    const locale = language === 'hu' ? 'hu-HU' : 'en-US';

    // State
    const [habits, setHabits] = useState<Habit[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [weekAnchor, setWeekAnchor] = useState(new Date());
    const [monthAnchor, setMonthAnchor] = useState(new Date());

    // Filters
    const [query, setQuery] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [sortBy, setSortBy] = useState<'order' | 'name' | 'streak'>('order');

    // Form
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newEmoji, setNewEmoji] = useState(EMOJIS[0]);
    const [newColor, setNewColor] = useState(COLORS[0]);
    const [newPeriod, setNewPeriod] = useState<GoalPeriod>('daily');
    const [newMode, setNewMode] = useState<GoalMode>('binary');
    const [newTarget, setNewTarget] = useState(1);

    // Edit
    const [editId, setEditId] = useState<string | null>(null);

    // Day Modal
    const [dayISO, setDayISO] = useState<string | null>(null);

    const todayISO = toLocalISODate(new Date());

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const list = (parsed.habits || (Array.isArray(parsed) ? parsed : [])).map(normalizeHabit);
                setHabits(list.sort((a: Habit, b: Habit) => (a.order ?? 0) - (b.order ?? 0)));
            }
        } catch (e) { console.error(e); }
    }, []);

    const saveHabits = (list: Habit[]) => {
        setHabits(list);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, habits: list, updatedAt: Date.now() }));
    };

    const visibleHabits = useMemo(() => {
        let list = habits.filter(h => !!h.archived === showArchived);
        if (query) list = list.filter(h => h.name.toLowerCase().includes(query.toLowerCase()));

        return list.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'streak') return getDailyStreak(b, todayISO) - getDailyStreak(a, todayISO);
            return (a.order ?? 0) - (b.order ?? 0);
        });
    }, [habits, showArchived, query, sortBy, todayISO]);

    const addHabit = () => {
        if (!newName.trim()) return;
        const h: Habit = {
            id: Date.now().toString(),
            name: newName.trim(),
            description: newDesc.trim() || undefined,
            emoji: newEmoji,
            color: newColor,
            goal: { period: newPeriod, mode: newMode, target: newTarget },
            history: {},
            createdAt: new Date().toISOString(),
            mastery: 0,
            order: habits.length
        };
        saveHabits([...habits, h]);
        setNewName(''); setNewDesc(''); setShowAdd(false);
    };

    const updateEntry = (id: string, date: string, delta: number) => {
        saveHabits(habits.map(h => {
            if (h.id !== id) return h;

            const prev = h.history[date] || { date, count: 0, completed: false };

            // Binary logic: toggle
            if (h.goal.mode === 'binary') {
                const newCompleted = !prev.completed;
                return {
                    ...h,
                    history: {
                        ...h.history,
                        [date]: { ...prev, completed: newCompleted, count: newCompleted ? 1 : 0 }
                    }
                };
            }

            // Count logic
            const newCount = Math.max(0, prev.count + delta);
            return {
                ...h,
                history: {
                    ...h.history,
                    [date]: { ...prev, count: newCount, completed: newCount >= 1 }
                }
            };
        }));
    };

    const renderCalendar = () => {
        const days = daysInMonthGrid(monthAnchor);
        return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white capitalize">{formatMonthYear(monthAnchor, locale)}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setMonthAnchor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"><ChevronLeft /></button>
                        <button onClick={() => setMonthAnchor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"><ChevronRight /></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {(language === 'hu' ? ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map(d => (
                        <div key={d} className="text-center text-xs font-bold text-gray-400 py-2">{d}</div>
                    ))}
                    {days.map(d => {
                        const iso = toLocalISODate(d);
                        const isCurrentMonth = d.getMonth() === monthAnchor.getMonth();
                        const completedCount = habits.filter(h => !h.archived && logIsCompletedForGoal(h.goal, h.history[iso])).length;

                        return (
                            <button
                                key={iso}
                                onClick={() => setDayISO(iso)}
                                className={cn(
                                    "h-24 rounded-xl p-2 text-left border transition-all hover:shadow-md relative overflow-hidden",
                                    iso === todayISO ? "ring-2 ring-blue-500 bg-blue-50/20" : "border-gray-100 dark:border-gray-800",
                                    isCurrentMonth ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-950 opacity-50"
                                )}
                            >
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{d.getDate()}</span>
                                {completedCount > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {habits.filter(h => !h.archived && logIsCompletedForGoal(h.goal, h.history[iso])).slice(0, 5).map(h => (
                                            <div key={h.id} className="w-1.5 h-1.5 rounded-full" style={{ background: h.color }} />
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{t('habits.title')}</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">{t('habits.subtitle')}</p>
                    </div>
                    <div className="flex gap-2 bg-white dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("px-4 py-2 rounded-xl text-sm font-bold flex gap-2 items-center", viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-gray-500')}
                        >
                            <LayoutList size={16} /> {t('habits.view.list')}
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={cn("px-4 py-2 rounded-xl text-sm font-bold flex gap-2 items-center", viewMode === 'calendar' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-gray-500')}
                        >
                            <LayoutGrid size={16} /> {t('habits.view.calendar')}
                        </button>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={query} onChange={e => setQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-blue-500"
                                placeholder={t('habits.search')}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setShowArchived(!showArchived)} className={cn("px-4 py-2 rounded-xl border text-sm font-bold flex gap-2 items-center", showArchived ? "bg-gray-900 text-white" : "bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800")}>
                            <Archive size={16} /> {showArchived ? t('habits.filter.showActive') : t('habits.filter.showArchived')}
                        </button>
                        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold flex gap-2 items-center shadow-lg shadow-blue-500/20 hover:bg-blue-700">
                            <Plus size={16} /> {t('habits.actions.add')}
                        </button>
                    </div>
                </div>

                {viewMode === 'calendar' ? renderCalendar() : (
                    <div className="grid gap-4">
                        {visibleHabits.map(h => {
                            const streak = getDailyStreak(h, todayISO);
                            const progress = progressForPeriod(h, weekAnchor); // Show weekly progress on card

                            return (
                                <motion.div layout key={h.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ backgroundColor: `${h.color}15`, color: h.color }}>
                                            {h.emoji}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">{h.name}</h3>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                            {t(`habits.goal.${h.goal.period}`)} • {h.goal.target} {h.goal.mode === 'count' ? '' : '/ ' + (h.goal.period === 'daily' ? 1 : 7)}
                                                        </span>
                                                        {streak > 0 && (
                                                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center gap-1">
                                                                <Flame size={12} /> {streak}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditId(h.id)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"><Pencil size={18} /></button>
                                                    <button onClick={() => saveHabits(habits.filter(x => x.id !== h.id))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"><Trash2 size={18} /></button>
                                                </div>
                                            </div>

                                            {/* Weekly Strip */}
                                            <div className="mt-4 grid grid-cols-7 gap-2">
                                                {Array.from({ length: 7 }, (_, i) => addDays(startOfWeekMonday(weekAnchor), i)).map(d => {
                                                    const iso = toLocalISODate(d);
                                                    const log = h.history[iso];
                                                    const done = logIsCompletedForGoal(h.goal, log);
                                                    const isToday = iso === todayISO;

                                                    return (
                                                        <button
                                                            key={iso}
                                                            onClick={() => updateEntry(h.id, iso, 1)}
                                                            className={cn(
                                                                "flex flex-col items-center justify-center p-2 rounded-xl border transition-all relative overflow-hidden",
                                                                done ? "bg-opacity-10" : "bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800",
                                                                isToday ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-100 dark:border-gray-800"
                                                            )}
                                                            style={{ backgroundColor: done ? `${h.color}15` : undefined }}
                                                        >
                                                            {done ? <Check size={16} style={{ color: h.color }} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />}
                                                            <span className={cn("text-[10px] uppercase font-bold mt-1", isToday ? "text-blue-600" : "text-gray-400")}>
                                                                {d.toLocaleDateString(locale, { weekday: 'narrow' })}
                                                            </span>
                                                            {h.goal.mode === 'count' && log?.count > 0 && (
                                                                <div className="absolute top-0.5 right-0.5 text-[9px] font-mono bg-white dark:bg-gray-900 px-1 rounded shadow-sm border border-gray-100 dark:border-gray-800">{log.count}</div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Add Modal */}
                <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('habits.actions.add')} footer={
                    <div className="flex gap-3">
                        <button onClick={() => setShowAdd(false)} className="flex-1 py-3 font-bold rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">{t('habits.actions.cancel')}</button>
                        <button onClick={addHabit} className="flex-1 py-3 font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700">{t('habits.actions.add')}</button>
                    </div>
                }>
                    <div className="space-y-4">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('habits.fields.namePh')} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 font-bold text-lg outline-none focus:border-blue-500" />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">{t('habits.goal.period')}</label>
                                <select value={newPeriod} onChange={e => setNewPeriod(e.target.value as any)} className="w-full p-2 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 outline-none">
                                    <option value="daily">{t('habits.goal.daily')}</option>
                                    <option value="weekly">{t('habits.goal.weekly')}</option>
                                    <option value="monthly">{t('habits.goal.monthly')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">{t('habits.goal.mode')}</label>
                                <select value={newMode} onChange={e => setNewMode(e.target.value as any)} className="w-full p-2 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 outline-none">
                                    <option value="binary">{t('habits.goal.binary')}</option>
                                    <option value="count">{t('habits.goal.count')}</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">{t('habits.goal.target')}</label>
                            <input type="number" min="1" value={newTarget} onChange={e => setNewTarget(Number(e.target.value))} className="w-full p-2 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 font-bold" />
                        </div>

                        <div className="grid grid-cols-8 gap-2">
                            {EMOJIS.map(e => (
                                <button key={e} onClick={() => setNewEmoji(e)} className={cn("aspect-square rounded-xl flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-800 border", newEmoji === e ? "border-blue-500 bg-blue-50" : "border-transparent")}>{e}</button>
                            ))}
                        </div>

                        <div className="flex gap-2 justify-center">
                            {COLORS.map(c => (
                                <button key={c} onClick={() => setNewColor(c)} className={cn("w-8 h-8 rounded-full border-2", newColor === c ? "border-black dark:border-white scale-110" : "border-transparent")} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                </Modal>

                {/* Day Details Modal */}
                <Modal open={!!dayISO} onClose={() => setDayISO(null)} title={dayISO || ''}>
                    <div className="space-y-3">
                        {habits.filter(h => !h.archived).map(h => {
                            const log = h.history[dayISO!] || { count: 0, completed: false };
                            return (
                                <div key={h.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{h.emoji}</span>
                                        <div>
                                            <div className="font-bold text-sm">{h.name}</div>
                                            <div className="text-xs text-gray-500">{t(`habits.goal.${h.goal.mode}`)}: {log.count}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {h.goal.mode === 'count' && <button onClick={() => updateEntry(h.id, dayISO!, -1)} className="w-8 h-8 rounded-full bg-white dark:bg-gray-900 border text-gray-500 font-bold">-</button>}
                                        <button
                                            onClick={() => updateEntry(h.id, dayISO!, h.goal.mode === 'count' ? 1 : 0)}
                                            className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-sm", logIsCompletedForGoal(h.goal, log) ? "opacity-100" : "opacity-30")}
                                            style={{ backgroundColor: h.color }}
                                        >
                                            <Check size={20} strokeWidth={3} />
                                        </button>
                                        {h.goal.mode === 'count' && <button onClick={() => updateEntry(h.id, dayISO!, 1)} className="w-8 h-8 rounded-full bg-white dark:bg-gray-900 border text-gray-500 font-bold">+</button>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Modal>

            </div>
        </div>
    );
}
