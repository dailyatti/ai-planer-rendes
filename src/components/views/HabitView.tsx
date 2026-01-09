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
    Activity,
    Award,
    Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * =====================================================================================
 * HABIT STUDIO PRO (V5) - 66 DAY CHALLENGE EDITION
 * - 66 Day Habit Formation Tracking
 * - Automatic "Mastered" state
 * - Manual Override (Force Formed / Resume)
 * - Pro Edit Modal
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
    mastery: number; // 0-100 (manual mastery)
    formed?: boolean; // NEW: 66-day challenge completion
    order?: number;
};

const STORAGE_KEY = 'habit-studio-v3-data';
const FORMATION_DAYS = 66;

const EMOJIS = ['💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🎯', '🧠', '🎨', '🎵', '🌱', '☀️', '💻', '💸', '🏆', '🔥'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

/* ------------------------------ Utils ------------------------------ */

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

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

function logIsCompletedForGoal(goal: HabitGoal, log?: HabitDayLog) {
    if (!log) return false;
    return log.count >= 1;
}

// Calculate total days completed (lifelong)
function getTotalCompletedDays(h: Habit) {
    return Object.values(h.history).filter(log => logIsCompletedForGoal(h.goal, log)).length;
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
        formed: !!anyHabit?.formed,
        mastery: clamp(Number(anyHabit?.mastery ?? 0), 0, 100),
        order: anyHabit?.order
    };
}

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

/* ------------------------------ Components ------------------------------ */

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
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
                        {footer && <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">{footer}</div>}
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

    const [habits, setHabits] = useState<Habit[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [weekAnchor, setWeekAnchor] = useState(new Date());
    const [monthAnchor, setMonthAnchor] = useState(new Date());

    const [query, setQuery] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [sortBy, setSortBy] = useState<'order' | 'name' | 'streak'>('order');

    // Add/Edit State
    const [showAdd, setShowAdd] = useState(false);
    const [editHabit, setEditHabit] = useState<Habit | null>(null);

    // Draft State (for both Add and Edit)
    const [draftName, setDraftName] = useState('');
    const [draftDesc, setDraftDesc] = useState('');
    const [draftEmoji, setDraftEmoji] = useState(EMOJIS[0]);
    const [draftColor, setDraftColor] = useState(COLORS[0]);
    const [draftPeriod, setDraftPeriod] = useState<GoalPeriod>('daily');
    const [draftMode, setDraftMode] = useState<GoalMode>('binary');
    const [draftTarget, setDraftTarget] = useState(1);
    const [draftMastery, setDraftMastery] = useState(0);

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
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 5, habits: list, updatedAt: Date.now() }));
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

    // Open Edit Modal
    const openEdit = (h: Habit) => {
        setEditHabit(h);
        setDraftName(h.name);
        setDraftDesc(h.description || '');
        setDraftEmoji(h.emoji);
        setDraftColor(h.color);
        setDraftPeriod(h.goal.period);
        setDraftMode(h.goal.mode);
        setDraftTarget(h.goal.target);
        setDraftMastery(h.mastery);
        setShowAdd(true);
    };

    // Open Add Modal
    const openAdd = () => {
        setEditHabit(null);
        setDraftName('');
        setDraftDesc('');
        setDraftEmoji(EMOJIS[0]);
        setDraftColor(COLORS[0]);
        setDraftPeriod('daily');
        setDraftMode('binary');
        setDraftTarget(1);
        setDraftMastery(0);
        setShowAdd(true);
    };

    const handleSave = () => {
        if (!draftName.trim()) return;

        // Construct Habit
        const newHabitPartial: Partial<Habit> = {
            name: draftName.trim(),
            description: draftDesc.trim() || undefined,
            emoji: draftEmoji,
            color: draftColor,
            goal: { period: draftPeriod, mode: draftMode, target: draftTarget },
            mastery: draftMastery
        };

        let nextHabits = [...habits];

        if (editHabit) {
            // Update existing
            nextHabits = nextHabits.map(h => h.id === editHabit.id ? { ...h, ...newHabitPartial } : h);
        } else {
            // Create new
            const h: Habit = {
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                history: {},
                order: habits.length,
                ...newHabitPartial as any
            };
            nextHabits.push(h);
        }

        saveHabits(nextHabits);
        setShowAdd(false);
    };

    const updateEntry = (id: string, date: string, delta: number) => {
        saveHabits(habits.map(h => {
            if (h.id !== id) return h;

            const prev = h.history[date] || { date, count: 0, completed: false };
            let newHistory = { ...h.history };
            let updatedEntry = prev;

            if (h.goal.mode === 'binary') {
                const newCompleted = !prev.completed;
                updatedEntry = { ...prev, completed: newCompleted, count: newCompleted ? 1 : 0 };
            } else {
                const newCount = Math.max(0, prev.count + delta);
                updatedEntry = { ...prev, count: newCount, completed: newCount >= 1 };
            }

            newHistory[date] = updatedEntry;

            // Auto 66-day Logic
            const totalCompleted = Object.values(newHistory).filter(l => logIsCompletedForGoal(h.goal, l)).length;
            const formed = h.formed || (totalCompleted >= FORMATION_DAYS);

            return { ...h, history: newHistory, formed };
        }));
    };

    const toggleFormedStatus = (id: string) => {
        saveHabits(habits.map(h => h.id === id ? { ...h, formed: !h.formed } : h));
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
                        <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold flex gap-2 items-center shadow-lg shadow-blue-500/20 hover:bg-blue-700">
                            <Plus size={16} /> {t('habits.actions.add')}
                        </button>
                    </div>
                </div>

                {viewMode === 'calendar' ? renderCalendar() : (
                    <div className="grid gap-4">
                        {visibleHabits.map(h => {
                            const streak = getDailyStreak(h, todayISO);
                            const daysCompleted = getTotalCompletedDays(h);
                            const daysLeft = Math.max(0, FORMATION_DAYS - daysCompleted);
                            const formationProgress = Math.min(100, (daysCompleted / FORMATION_DAYS) * 100);

                            return (
                                <motion.div layout key={h.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 relative overflow-hidden" style={{ backgroundColor: `${h.color}15`, color: h.color }}>
                                            {h.formed && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-yellow-400/20 dark:bg-yellow-400/10">
                                                    <Trophy className="w-8 h-8 text-yellow-500 animate-pulse" />
                                                </div>
                                            )}
                                            {!h.formed && <>{h.emoji}</>}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">{h.name}</h3>
                                                        {h.formed && <span className="text-[10px] uppercase font-black bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Award size={12} /> {t('habits.status.mastered')}</span>}
                                                    </div>
                                                    <div className="flex gap-2 mt-1 flex-wrap">
                                                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                            {t(`habits.goal.${h.goal.period}`)} • {h.goal.target}
                                                        </span>
                                                        {streak > 0 && (
                                                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center gap-1">
                                                                <Flame size={12} /> {streak}
                                                            </span>
                                                        )}
                                                        {!h.formed && (
                                                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" title={`${daysCompleted}/${FORMATION_DAYS}`}>
                                                                {t('habits.challenge.badge')}: {daysCompleted}/{FORMATION_DAYS}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => openEdit(h)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"><Pencil size={18} /></button>
                                                    <button onClick={() => saveHabits(habits.filter(x => x.id !== h.id))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"><Trash2 size={18} /></button>
                                                </div>
                                            </div>

                                            {/* 66-Day Progress Bar */}
                                            {!h.formed && (
                                                <div className="mt-3 w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-500" style={{ width: `${formationProgress}%` }} />
                                                </div>
                                            )}

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

                {/* ADD / EDIT Modal */}
                <Modal
                    open={showAdd}
                    onClose={() => setShowAdd(false)}
                    title={editHabit ? t('habits.edit') : t('habits.actions.add')}
                    footer={
                        <div className="flex gap-3">
                            <button onClick={() => setShowAdd(false)} className="flex-1 py-3 font-bold rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">{t('habits.actions.cancel')}</button>
                            <button onClick={handleSave} className="flex-1 py-3 font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700">{t('habits.actions.save')}</button>
                        </div>
                    }>
                    <div className="space-y-4">
                        {/* Form Fields */}
                        <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder={t('habits.fields.namePh')} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 font-bold text-lg outline-none focus:border-blue-500" />
                        <textarea value={draftDesc} onChange={e => setDraftDesc(e.target.value)} placeholder={t('habits.fields.descPh')} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 font-medium text-sm outline-none focus:border-blue-500 min-h-[80px]" />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">{t('habits.goal.period')}</label>
                                <select value={draftPeriod} onChange={e => setDraftPeriod(e.target.value as any)} className="w-full p-2 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 outline-none">
                                    <option value="daily">{t('habits.goal.daily')}</option>
                                    <option value="weekly">{t('habits.goal.weekly')}</option>
                                    <option value="monthly">{t('habits.goal.monthly')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">{t('habits.goal.mode')}</label>
                                <select value={draftMode} onChange={e => setDraftMode(e.target.value as any)} className="w-full p-2 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 outline-none">
                                    <option value="binary">{t('habits.goal.binary')}</option>
                                    <option value="count">{t('habits.goal.count')}</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">{t('habits.goal.target')}</label>
                            <input type="number" min="1" value={draftTarget} onChange={e => setDraftTarget(Number(e.target.value))} className="w-full p-2 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 font-bold" />
                        </div>

                        <div className="grid grid-cols-8 gap-2">
                            {EMOJIS.map(e => (
                                <button key={e} onClick={() => setDraftEmoji(e)} className={cn("aspect-square rounded-xl flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-800 border", draftEmoji === e ? "border-blue-500 bg-blue-50" : "border-transparent")}>{e}</button>
                            ))}
                        </div>

                        <div className="flex gap-2 justify-center">
                            {COLORS.map(c => (
                                <button key={c} onClick={() => setDraftColor(c)} className={cn("w-8 h-8 rounded-full border-2", draftColor === c ? "border-black dark:border-white scale-110" : "border-transparent")} style={{ backgroundColor: c }} />
                            ))}
                        </div>

                        {/* Manual Override for Edit Mode */}
                        {editHabit && (
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                                <label className="text-xs font-bold text-gray-500 mb-2 block">{t('habits.challenge.title')}</label>
                                <button
                                    onClick={() => toggleFormedStatus(editHabit.id)}
                                    className={cn("w-full py-2 rounded-xl border text-sm font-bold flex gap-2 items-center justify-center", editHabit.formed ? "bg-white border-gray-200 text-gray-700" : "bg-yellow-50 border-yellow-200 text-yellow-700")}
                                >
                                    {editHabit.formed ? (
                                        <><RotateCcw size={14} /> {t('habits.actions.resume')}</>
                                    ) : (
                                        <><Award size={14} /> {t('habits.actions.markFormed')}</>
                                    )}
                                </button>
                            </div>
                        )}
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
                                            <div className="text-xs text-gray-500">{h.goal.mode === 'binary' ? t('habits.goal.binary') : `${t('habits.goal.count')}: ${log.count}`}</div>
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
