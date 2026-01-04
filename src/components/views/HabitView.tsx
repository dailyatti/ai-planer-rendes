
import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Trash2, Check, Clock,
    Edit2, X, Zap,
    Sun, Moon, Sunrise, Coffee,
    CheckCircle, Timer, Activity, Flag, Calendar, ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

/* =====================================================================================
  Habit Lab Pro Redesign (PhD Level)
  - User Friendly, Clean, Elegant
  - Time-based organization (Morning, Afternoon, Evening)
  - Qualitative Tracking (Effort, Notes)
  - Full I18n Support
===================================================================================== */

/* -------------------------------- Types -------------------------------- */

type HabitFrequency = 'daily' | 'weekly';
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';
type EffortLevel = 'easy' | 'medium' | 'hard';

type HabitCheckin = {
    dateISO: string;
    completed: boolean;
    effort?: EffortLevel;
    note?: string;
    timestamp: number;
};

type Habit = {
    id: string;
    name: string;
    description?: string;
    frequency: HabitFrequency;
    timeOfDay: TimeOfDay;
    exactTime?: string; // HH:mm
    createdAtISO: string;
    checkins: Record<string, HabitCheckin>; // keyed by YYYY-MM-DD
    color?: string; // Hex color for accent
    archived?: boolean;
    isMastered?: boolean;
    targetDays?: number; // Default 66
};

// --- Storage Keys ---
const STORAGE_V2 = 'planner.habits.v2';
const STORAGE_V1 = 'planner.statistics.habits.v1';

/* -------------------------------- Utils -------------------------------- */
const pad2 = (n: number) => String(n).padStart(2, '0');
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const getStreak = (habit: Habit, todayISO: string): number => {
    let streak = 0;
    const d = new Date(todayISO);
    // Check yesterday first, unless done today
    if (habit.checkins[todayISO]?.completed) {
        streak = 1;
    }

    // Go back days
    for (let i = 1; i < 365; i++) {
        const prev = new Date(d);
        prev.setDate(prev.getDate() - i);
        const iso = toISODate(prev);
        if (habit.checkins[iso]?.completed) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
};

const formatDuration = (ms: number) => {
    if (ms < 0) return '0p';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}n ${hours}ó`;
    if (hours > 0) return `${hours}ó ${minutes}p`;
    return `${minutes}p ${seconds}mp`;
};

const HabitTimerStats: React.FC<{ habit: Habit; lastCheckin?: number }> = ({ habit, lastCheckin }) => {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const created = new Date(habit.createdAtISO).getTime();
    const elapsed = now - created;

    const targetDays = habit.targetDays || 66;
    const targetMs = targetDays * 24 * 60 * 60 * 1000;
    const remaining = targetMs - elapsed;
    const progress = Math.min(100, Math.max(0, (elapsed / targetMs) * 100));

    const sinceLast = lastCheckin ? now - lastCheckin : null;

    return (
        <div className="mt-3 grid grid-cols-3 gap-2">
            {/* Total Elapsed */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Timer size={10} />
                    Eltelt
                </div>
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {formatDuration(elapsed)}
                </div>
            </div>

            {/* Time to Mastery */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute bottom-0 left-0 h-0.5 bg-green-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Flag size={10} />
                    Célig
                </div>
                <div className="text-xs font-bold text-green-600 dark:text-green-400">
                    {remaining > 0 ? formatDuration(remaining) : 'Kész!'}
                </div>
            </div>

            {/* Since Last Rep */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Activity size={10} />
                    Legutóbb
                </div>
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    {sinceLast ? formatDuration(sinceLast) : '-'}
                </div>
            </div>
        </div>
    );

};

const HabitHistoryModal: React.FC<{ habit: Habit; onClose: () => void }> = ({ habit, onClose }) => {
    const { t } = useLanguage();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mon start

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const checkinsInMonth = useMemo(() => {
        let count = 0;
        for (let i = 1; i <= daysInMonth; i++) {
            const iso = `${year}-${pad2(month + 1)}-${pad2(i)}`;
            if (habit.checkins[iso]?.completed) count++;
        }
        return count;
    }, [habit, year, month, daysInMonth]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{habit.name} - {t('common.history')}</h2>
                        <p className="text-sm text-gray-500">{checkinsInMonth} / {daysInMonth} {t('common.days')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Calendar Nav */}
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <h3 className="text-lg font-bold capitalize">
                            {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </h3>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 mb-6">
                        {['H', 'K', 'S', 'C', 'P', 'S', 'V'].map((d, i) => (
                            <div key={i} className="text-center text-xs font-bold text-gray-400 py-2">{d}</div>
                        ))}
                        {Array.from({ length: startOffset }).map((_, i) => (
                            <div key={`empty-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const d = i + 1;
                            const iso = `${year}-${pad2(month + 1)}-${pad2(d)}`;
                            const checkin = habit.checkins[iso];
                            const isSelected = selectedDate === iso;

                            let bgClass = 'bg-gray-50 dark:bg-gray-900 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800';
                            if (checkin?.completed) {
                                if (checkin.effort === 'hard') bgClass = 'bg-green-600 text-white shadow-md shadow-green-500/20';
                                else if (checkin.effort === 'medium') bgClass = 'bg-green-500 text-white';
                                else bgClass = 'bg-green-400 text-white';
                            }
                            if (isSelected) bgClass = 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 z-10';

                            return (
                                <button
                                    key={d}
                                    onClick={() => setSelectedDate(iso)}
                                    className={`
                                        aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all relative
                                        ${bgClass}
                                    `}
                                >
                                    {d}
                                    {checkin?.note && (
                                        <div className={`w-1 h-1 rounded-full mt-0.5 ${checkin.completed ? 'bg-white' : 'bg-blue-500'}`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Start Date Indicator */}
                    <div className="text-center mb-6">
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                            Kezdés: {habit.createdAtISO}
                        </span>
                    </div>

                    {/* Detail View */}
                    <AnimatePresence mode="wait">
                        {selectedDate && (
                            <motion.div
                                key={selectedDate}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-gray-900 dark:text-white">
                                        {selectedDate}
                                    </h4>
                                    {habit.checkins[selectedDate]?.completed ? (
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${habit.checkins[selectedDate].effort === 'hard' ? 'bg-red-100 text-red-600' :
                                            habit.checkins[selectedDate].effort === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-green-100 text-green-600'
                                            }`}>
                                            {t(`habits.effort.${habit.checkins[selectedDate].effort || 'easy'}`)}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400 font-medium">Nincs adat</span>
                                    )}
                                </div>

                                {habit.checkins[selectedDate]?.note ? (
                                    <div className="flex gap-3">
                                        <FileText size={18} className="text-gray-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                                            "{habit.checkins[selectedDate].note}"
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center italic py-2">
                                        {t('habits.noNote')}
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

/* -------------------------------- Components -------------------------------- */

const HabitView: React.FC = () => {
    const { t } = useLanguage();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [filterTime, setFilterTime] = useState<TimeOfDay | 'all'>('all');

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [checkinHabit, setCheckinHabit] = useState<Habit | null>(null); // For effort/note modal
    const [historyHabit, setHistoryHabit] = useState<Habit | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Habit>>({
        name: '',
        timeOfDay: 'anytime',
        frequency: 'daily',
        exactTime: ''
    });

    // Checkin Form State
    const [checkinData, setCheckinData] = useState<{ effort: EffortLevel; note: string }>({
        effort: 'easy',
        note: ''
    });

    /* --- Data Loading & Migration --- */
    useEffect(() => {
        const loadData = () => {
            const stored = localStorage.getItem(STORAGE_V2);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    // Ensure structure
                    const migrated = parsed.map((h: any) => ({
                        ...h,
                        checkins: Array.isArray(h.checkinsISO) // Migration from array to map
                            ? h.checkinsISO.reduce((acc: any, iso: string) => ({ ...acc, [iso]: { dateISO: iso, completed: true, timestamp: Date.now() } }), {} as Record<string, HabitCheckin>)
                            : h.checkins || {},
                        timeOfDay: h.timeOfDay || 'anytime'
                    }));
                    setHabits(migrated);
                } catch (e) { console.error('Habit load error', e); }
            } else {
                // Try V1
                const v1 = localStorage.getItem(STORAGE_V1);
                if (v1) {
                    try {
                        const parsedV1 = JSON.parse(v1);
                        if (Array.isArray(parsedV1)) {
                            const migrated = parsedV1.map((h: any) => ({
                                id: h.id || Math.random().toString(36).substr(2, 9),
                                name: h.name,
                                frequency: 'daily' as HabitFrequency,
                                timeOfDay: 'anytime' as TimeOfDay,
                                exactTime: '',
                                createdAtISO: toISODate(new Date()),
                                checkins: (h.checkinsISO || []).reduce((acc: any, iso: string) => ({ ...acc, [iso]: { dateISO: iso, completed: true, timestamp: Date.now() } }), {} as Record<string, HabitCheckin>),
                                isMastered: false
                            }));
                            setHabits(migrated);
                            localStorage.setItem(STORAGE_V2, JSON.stringify(migrated));
                        }
                    } catch (e) { }
                }
            }
        };
        loadData();
    }, []);

    const saveHabits = (newHabits: Habit[]) => {
        setHabits(newHabits);
        localStorage.setItem(STORAGE_V2, JSON.stringify(newHabits));
    };

    /* --- Actions --- */
    const handleCreateOrUpdate = () => {
        if (!formData.name) return;

        if (editingHabit) {
            const updated = habits.map(h => h.id === editingHabit.id ? { ...h, ...formData } : h) as Habit[];
            saveHabits(updated);
        } else {
            const newHabit: Habit = {
                id: Math.random().toString(36).substr(2, 9),
                name: formData.name!,
                description: formData.description || '',
                frequency: formData.frequency as HabitFrequency || 'daily',
                timeOfDay: formData.timeOfDay as TimeOfDay || 'anytime',
                createdAtISO: toISODate(new Date()),
                checkins: {},
                color: formData.color
            };
            saveHabits([...habits, newHabit]);
        }
        setIsCreateOpen(false);
        setEditingHabit(null);
        setFormData({ name: '', timeOfDay: 'anytime', frequency: 'daily' });
    };

    const deleteHabit = (id: string) => {
        if (window.confirm(t('habits.deleteConfirm'))) {
            saveHabits(habits.filter(h => h.id !== id));
        }
    };

    const toggleCheckin = (habit: Habit, dateISO: string) => {
        const isDone = !!habit.checkins[dateISO]?.completed;

        if (isDone) {
            // Undo
            const updatedCheckins = { ...habit.checkins };
            delete updatedCheckins[dateISO];
            const updatedHabits = habits.map(h => h.id === habit.id ? { ...h, checkins: updatedCheckins } : h);
            saveHabits(updatedHabits);
        } else {
            // Do - Open Modal
            setCheckinHabit(habit);
            setCheckinData({ effort: 'easy', note: '' });
        }
    };

    const confirmCheckin = () => {
        if (!checkinHabit) return;
        const dateISO = toISODate(new Date());
        const updatedHabits = habits.map(h => {
            if (h.id === checkinHabit.id) {
                return {
                    ...h,
                    checkins: {
                        ...h.checkins,
                        [dateISO]: {
                            dateISO,
                            completed: true,
                            effort: checkinData.effort,
                            note: checkinData.note,
                            timestamp: Date.now()
                        }
                    }
                };
            }
            return h;
        });
        saveHabits(updatedHabits);
        setCheckinHabit(null);
    };

    /* --- UI Helpers --- */
    const todayISO = toISODate(new Date());

    const filteredHabits = useMemo(() => {
        let list = habits.filter(h => !h.isMastered);
        if (filterTime !== 'all') {
            list = list.filter(h => h.timeOfDay === filterTime);
        }
        // Sort: Done at bottom, then manually sorted or by time
        return list.sort((a, b) => {
            const aDone = !!a.checkins[todayISO]?.completed;
            const bDone = !!b.checkins[todayISO]?.completed;
            if (aDone === bDone) return 0;
            return aDone ? 1 : -1;
        });
    }, [habits, filterTime, todayISO]);

    const nextHabit = useMemo(() => {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        return habits
            .filter(h => !h.isMastered && h.exactTime && !h.checkins[todayISO]?.completed && h.exactTime >= currentTime)
            .sort((a, b) => (a.exactTime || '').localeCompare(b.exactTime || ''))[0];
    }, [habits, todayISO]);

    const getTimeIcon = (t: TimeOfDay) => {
        switch (t) {
            case 'morning': return <Sunrise className="w-4 h-4 text-amber-500" />;
            case 'afternoon': return <Sun className="w-4 h-4 text-orange-500" />;
            case 'evening': return <Moon className="w-4 h-4 text-indigo-400" />;
            default: return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getTimeLabel = (key: TimeOfDay) => {
        switch (key) {
            case 'morning': return t('habits.time.morning');
            case 'afternoon': return t('habits.time.afternoon');
            case 'evening': return t('habits.time.evening');
            case 'anytime': return t('habits.time.anytime');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 lg:p-8 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300">

            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-blue-600 dark:from-teal-400 dark:to-blue-400">
                        {t('habits.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('habits.subtitle')}
                    </p>
                </div>

                <button
                    onClick={() => {
                        setEditingHabit(null);
                        setFormData({ name: '', timeOfDay: 'anytime', frequency: 'daily' });
                        setIsCreateOpen(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    <span className="font-medium">{t('habits.create')}</span>
                </button>
            </header>

            {/* Filters (Time of Day Tabs) */}
            <div className="mb-6 flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
                {(['all', 'morning', 'afternoon', 'evening', 'anytime'] as const).map((ft) => (
                    <button
                        key={ft}
                        onClick={() => setFilterTime(ft)}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border
              ${filterTime === ft
                                ? 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'bg-transparent border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}
            `}
                    >
                        {ft !== 'all' && getTimeIcon(ft as TimeOfDay)}
                        <span>{ft === 'all' ? t('common.viewAll') : getTimeLabel(ft as TimeOfDay)}</span>
                    </button>
                ))}
            </div>

            {/* Next Session Highlight */}
            {nextHabit && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-teal-500/10 to-blue-500/10 backdrop-blur-sm border border-teal-100/50 dark:border-teal-900/30 shadow-sm"
                >
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-[14px] p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-[0.2em] mb-0.5">{t('habits.nextSession')}</p>
                                <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-white leading-tight">{nextHabit.name}</h2>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-teal-600 to-blue-600 dark:from-teal-400 dark:to-blue-400">{nextHabit.exactTime}</span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Habit Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                    {filteredHabits.map(habit => {
                        const isDone = !!habit.checkins[todayISO]?.completed;
                        const streak = getStreak(habit, todayISO);

                        return (
                            <motion.div
                                key={habit.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`
                  relative group overflow-hidden rounded-2xl border transition-all duration-300
                  ${isDone
                                        ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                                        : 'bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:shadow-md backdrop-blur-sm'}
                `}
                            >
                                <div className="p-5 flex items-center justify-between gap-4">
                                    {/* Left: Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            {getTimeIcon(habit.timeOfDay)}
                                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                {getTimeLabel(habit.timeOfDay)}
                                            </span>
                                            {habit.exactTime && (
                                                <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-800">
                                                    {habit.exactTime}
                                                </span>
                                            )}
                                            {streak > 0 && (
                                                <span className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-md">
                                                    <Zap size={12} className="fill-orange-500" />
                                                    {streak}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className={`text-lg font-bold truncate ${isDone ? 'text-gray-500 dark:text-gray-400 line-through decoration-2 decoration-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                            {habit.name}
                                        </h3>
                                        {habit.description && (
                                            <p className="text-sm text-gray-500 truncate">{habit.description}</p>
                                        )}
                                    </div>

                                    {/* Right: Action */}
                                    <button
                                        onClick={() => toggleCheckin(habit, todayISO)}
                                        className={`
                      shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 relative overflow-hidden
                      ${isDone
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 rotate-0'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-500'}
                    `}
                                    >
                                        {isDone && (
                                            <motion.div
                                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                className="absolute inset-0 bg-blue-500 rounded-full origin-center"
                                            />
                                        )}
                                        <Check size={24} className="relative z-10" strokeWidth={3} />
                                    </button>
                                </div>

                                {/* Timer Stats */}
                                <div className="px-5 pb-3">
                                    <HabitTimerStats
                                        habit={habit}
                                        lastCheckin={
                                            // Find the latest checkin timestamp
                                            Object.values(habit.checkins)
                                                .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp
                                        }
                                    />
                                </div>

                                {/* Footer / Meta Actions */}
                                <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-400">
                                    <div className="flex gap-3">
                                        <span className="hover:text-gray-600 dark:hover:text-gray-300 cursor-default">
                                            {habit.frequency === 'daily' ? t('habits.freq.daily') : t('habits.freq.weekly')}
                                        </span>
                                    </div>



                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setHistoryHabit(habit)}
                                            className="hover:text-blue-500 p-1"
                                            title={t('common.history')}
                                        >
                                            <Calendar size={14} />
                                        </button>
                                        {!habit.isMastered && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(t('habits.noMoreDays'))) {
                                                        const updated = habits.map(h => h.id === habit.id ? { ...h, isMastered: true } : h);
                                                        setHabits(updated);
                                                        localStorage.setItem(STORAGE_V2, JSON.stringify(updated));
                                                    }
                                                }}
                                                className="hover:text-green-500 p-1"
                                                title={t('habits.markMastered')}
                                            >
                                                <CheckCircle size={14} />
                                            </button>
                                        )}
                                        <button onClick={() => { setEditingHabit(habit); setFormData(habit); setIsCreateOpen(true); }} className="hover:text-blue-500 p-1">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => deleteHabit(habit.id)} className="hover:text-red-500 p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {
                filteredHabits.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <Coffee size={32} className="text-gray-400" />
                        </div>
                        <p className="text-lg font-medium text-gray-500">{t('habits.emptyState')}</p>
                    </div>
                )
            }

            {/* --- Mastered Habits Section --- */}
            {
                habits.some(h => h.isMastered) && (
                    <div className="mt-12 mb-20">
                        <div className="flex items-center gap-3 mb-6 opacity-60">
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Zap size={14} />
                                {t('habits.masteredHabits')}
                            </h2>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {habits.filter(h => h.isMastered).map(habit => (
                                <motion.div
                                    key={habit.id}
                                    layout
                                    className="bg-white/40 dark:bg-gray-800/20 backdrop-blur-md rounded-2xl p-4 border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-between group shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                                            <CheckCircle size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-600 dark:text-gray-300">{habit.name}</h3>
                                            <p className="text-xs text-gray-400 capitalize">{habit.timeOfDay}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => {
                                                const updated = habits.map(h => h.id === habit.id ? { ...h, isMastered: false } : h);
                                                saveHabits(updated);
                                            }}
                                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                            title={t('common.restore')}
                                        >
                                            <Clock size={16} />
                                        </button>
                                        <button
                                            onClick={() => deleteHabit(habit.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* --- Check-in Modal --- */}
            <AnimatePresence>
                {checkinHabit && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-gray-700"
                        >
                            <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white text-center">
                                {t('habits.checkInTitle')}
                            </h3>
                            <p className="text-center text-gray-500 text-sm mb-6">{checkinHabit.name}</p>

                            <div className="space-y-4">
                                {/* Effort Selection */}
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-2 text-center">{t('habits.effortLabel')}</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['easy', 'medium', 'hard'] as const).map(lvl => (
                                            <button
                                                key={lvl}
                                                onClick={() => setCheckinData({ ...checkinData, effort: lvl })}
                                                className={`
                                    py-2 rounded-lg text-sm font-semibold border-2 transition-all
                                    ${checkinData.effort === lvl
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                        : 'border-transparent bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'}
                                `}
                                            >
                                                {t(`habits.effort.${lvl}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Note */}
                                <textarea
                                    placeholder={t('habits.notePlaceholder')}
                                    value={checkinData.note}
                                    onChange={e => setCheckinData({ ...checkinData, note: e.target.value })}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                                    rows={3}
                                />

                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setCheckinHabit(null)} className="flex-1 py-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium">
                                        {t('common.cancel')}
                                    </button>
                                    <button onClick={confirmCheckin} className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg shadow-green-500/20 transition-all font-bold">
                                        {t('common.save')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- Create/Edit Modal --- */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold dark:text-white">
                                        {editingHabit ? t('habits.edit') : t('habits.create')}
                                    </h2>
                                    <button onClick={() => setIsCreateOpen(false)} className="bg-gray-100 dark:bg-gray-700 p-1 rounded-full text-gray-500">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">{t('habits.nameLabel')}</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all dark:text-white"
                                            placeholder={t('habits.nameLabel')}
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">{t('habits.descLabel')}</label>
                                        <input
                                            type="text"
                                            value={formData.description || ''}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                            placeholder="..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('habits.frequencyLabel')}</label>
                                            <select
                                                value={formData.frequency}
                                                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                            >
                                                <option value="daily">{t('habits.freq.daily')}</option>
                                                <option value="weekly">{t('habits.freq.weekly')}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('habits.timeLabel')}</label>
                                            <select
                                                value={formData.timeOfDay}
                                                onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value as any })}
                                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                            >
                                                <option value="anytime">{t('habits.time.anytime')}</option>
                                                <option value="morning">{t('habits.time.morning')}</option>
                                                <option value="afternoon">{t('habits.time.afternoon')}</option>
                                                <option value="evening">{t('habits.time.evening')}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">{t('habits.exactTime')}</label>
                                        <input
                                            type="time"
                                            value={formData.exactTime || ''}
                                            onChange={(e) => setFormData({ ...formData, exactTime: e.target.value })}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                        />
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-800">
                                        <Zap size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                                            {t('habits.masteryGuidance')}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <button
                                        onClick={handleCreateOrUpdate}
                                        disabled={!formData.name}
                                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all text-center disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {t('common.save')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* History Modal */}
            <AnimatePresence>
                {historyHabit && (
                    <HabitHistoryModal
                        habit={historyHabit}
                        onClose={() => setHistoryHabit(null)}
                    />
                )}
            </AnimatePresence>

        </div >
    );
};

export default HabitView;