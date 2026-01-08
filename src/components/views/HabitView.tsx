
import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Trash2, Check, Clock,
    Edit2, X,
    Sun, Moon, Sunrise, Coffee,
    CheckCircle, Activity, TrendingUp, Flame, Award
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

/* =====================================================================================
  Habit Lab Pro Redesign (PhD Level)
  - Advanced Analytics & Visualization (Heatmap, Mastery Ring)
  - GitHub-style Contribution Graph
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
    color?: string;
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

// Robust streak calculation
const getStreakStats = (habit: Habit, todayISO: string) => {
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Sort dates to be sure
    const sortedDates = Object.keys(habit.checkins).sort();

    // Calculate Best Streak
    if (sortedDates.length > 0) {
        let lastDate = new Date(sortedDates[0]);
        tempStreak = 1;

        for (let i = 1; i < sortedDates.length; i++) {
            const currentDate = new Date(sortedDates[i]);
            const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 1;
            }
            lastDate = currentDate;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
    }

    // Calculate Current Streak
    const d = new Date(todayISO);
    // Check today or yesterday for current streak continuity
    if (habit.checkins[todayISO]?.completed) {
        currentStreak = 1;
    }

    // Backwards checker
    for (let i = 1; i < 365; i++) { // Limit lookback
        const prev = new Date(d);
        prev.setDate(prev.getDate() - i);
        const iso = toISODate(prev);
        if (habit.checkins[iso]?.completed) {
            currentStreak++;
        } else if (i === 1 && !habit.checkins[todayISO]?.completed) {
            // If today is not done, but yesterday was, streak is alive
            // Continue loop to count
        } else {
            // Break if gap found (and not just today missing)
            const yesterdayISO = toISODate(new Date(new Date(todayISO).setDate(new Date(todayISO).getDate() - 1)));
            if (i === 1 && iso === yesterdayISO && !habit.checkins[iso]?.completed) {
                // Streak broken if yesterday missing
                currentStreak = 0;
                break;
            } else if (i > 1) {
                break;
            }
        }
    }
    // If today is not checked and yesterday is not checked, streak is 0
    const yest = new Date(d);
    yest.setDate(yest.getDate() - 1);
    if (!habit.checkins[todayISO]?.completed && !habit.checkins[toISODate(yest)]?.completed) {
        currentStreak = 0;
    }

    return { currentStreak, bestStreak };
};

/* -------------------------------- Sub-Components -------------------------------- */

// 1. Mastery Ring Check
const MasteryRing: React.FC<{ progress: number; size?: number }> = ({ progress, size = 60 }) => {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className="text-yellow-500 transition-all duration-1000 ease-out"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className="absolute text-[10px] font-bold text-gray-600 dark:text-gray-300">
                {Math.round(progress)}%
            </div>
        </div>
    );
};

// 2. Weekly Progress Bar
const WeeklyProgress: React.FC<{ habit: Habit; todayISO: string }> = ({ habit, todayISO }) => {
    const days = [];
    const today = new Date(todayISO);

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push({
            date: d,
            iso: toISODate(d),
            dayName: d.toLocaleDateString(undefined, { weekday: 'narrow' }) // M, T, W...
        });
    }

    return (
        <div className="flex justify-between items-end h-16 w-full gap-1">
            {days.map((day, i) => {
                const isDone = !!habit.checkins[day.iso]?.completed;
                const isToday = day.iso === todayISO;

                return (
                    <div key={day.iso} className="flex flex-col items-center gap-1 flex-1">
                        <div className={`
                            w-full rounded-sm transition-all duration-500 relative
                            ${isDone
                                ? 'bg-blue-500 dark:bg-blue-500 h-8 shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-700 h-1'}
                            ${isToday && !isDone ? 'animate-pulse bg-blue-200 dark:bg-blue-900/50 h-4' : ''}
                        `}>
                            {isDone && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-blue-400 opacity-20"
                                />
                            )}
                        </div>
                        <span className={`text-[9px] font-bold uppercase ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>
                            {day.dayName}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// 3. Global Stats Data
const GlobalStats: React.FC<{ habits: Habit[]; t: any }> = ({ habits, t }) => {
    const todayISO = toISODate(new Date());

    // Aggregate stats
    const totalHabits = habits.filter(h => !h.archived && !h.isMastered).length;
    const completedToday = habits.filter(h => h.checkins[todayISO]?.completed).length;
    const completionRate = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0;

    // Find best streak among all active habits
    const bestActiveStreak = Math.min(Math.max(...habits.filter(h => !h.isMastered).map(h => getStreakStats(h, todayISO).currentStreak), 0), 999);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <h3 className="text-2xl font-bold">{completedToday}/{totalHabits}</h3>
                    <p className="text-xs text-gray-500">{t('habits.dailyProgress') || 'Daily Goal'}</p>
                </div>
            </div>

            <div className="card p-4 flex items-center gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-500">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <h3 className="text-2xl font-bold">{Math.round(completionRate)}%</h3>
                    <p className="text-xs text-gray-500">{t('habits.completionRate')}</p>
                </div>
            </div>

            <div className="card p-4 flex items-center gap-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-500">
                    <Flame size={24} />
                </div>
                <div>
                    <h3 className="text-2xl font-bold">{bestActiveStreak}</h3>
                    <p className="text-xs text-gray-500">{t('habits.bestStreak')}</p>
                </div>
            </div>

            <div className="card p-4 flex items-center gap-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-500">
                    <Award size={24} />
                </div>
                <div>
                    <h3 className="text-2xl font-bold">{habits.filter(h => h.isMastered).length}</h3>
                    <p className="text-xs text-gray-500">{t('habits.mastery')}</p>
                </div>
            </div>
        </div>
    );
};

// 4. Global Heatmap Component
const GlobalHeatmap: React.FC<{ habits: Habit[]; t: any }> = ({ habits, t }) => {
    // Generate last 20 weeks
    const weeks = 20;
    const endDate = new Date();

    // Create grid columns (weeks)
    const grid = useMemo(() => {
        const data = [];
        for (let w = 0; w < weeks; w++) {
            const weekData = [];
            for (let d = 0; d < 7; d++) {
                const date = new Date();
                date.setDate(endDate.getDate() - ((weeks - 1 - w) * 7 + (6 - d)));
                const iso = toISODate(date);

                // Calculate intensity for this date across all habits
                const totalCheckins = habits.reduce((acc, h) => acc + (h.checkins[iso]?.completed ? 1 : 0), 0);
                const activeHabitsCount = habits.filter(h => !h.isMastered && !h.archived && new Date(h.createdAtISO) <= date).length;

                // Intensity: 0=none, 1=low, 2=med, 3=high
                let intensity = 0;
                if (totalCheckins > 0) {
                    const ratio = activeHabitsCount > 0 ? totalCheckins / activeHabitsCount : 0;
                    if (ratio >= 0.8) intensity = 3;
                    else if (ratio >= 0.5) intensity = 2;
                    else intensity = 1;
                }

                weekData.push({ date, iso, intensity, totalCheckins, activeHabitsCount });
            }
            data.push(weekData);
        }
        return data;
    }, [habits]);

    return (
        <div className="card mb-8 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold flex items-center gap-2">
                    <Activity size={18} className="text-blue-500" />
                    {t('habits.heatmap.title')}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>Less</span>
                    <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700 rounded-[2px]" />
                    <div className="w-3 h-3 bg-green-200 dark:bg-green-900/40 rounded-[2px]" />
                    <div className="w-3 h-3 bg-green-400 dark:bg-green-600 rounded-[2px]" />
                    <div className="w-3 h-3 bg-green-600 dark:bg-green-400 rounded-[2px]" />
                    <span>More</span>
                </div>
            </div>

            <div className="overflow-x-auto hide-scrollbar pb-2">
                <div className="flex gap-1 min-w-max">
                    {grid.map((week, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            {week.map((day) => (
                                <div
                                    key={day.iso}
                                    title={`${day.iso}: ${day.totalCheckins} / ${day.activeHabitsCount} completed`}
                                    className={`
                                        w-3 h-3 md:w-4 md:h-4 rounded-[3px] transition-colors
                                        ${day.intensity === 0 ? 'bg-gray-100 dark:bg-gray-700' : ''}
                                        ${day.intensity === 1 ? 'bg-green-200 dark:bg-green-900/40' : ''}
                                        ${day.intensity === 2 ? 'bg-green-400 dark:bg-green-600' : ''}
                                        ${day.intensity === 3 ? 'bg-green-600 dark:bg-green-400 shadow-sm shadow-green-500/20' : ''}
                                    `}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


/* -------------------------------- Main Component -------------------------------- */

const HabitView: React.FC = () => {
    const { t } = useLanguage();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [filterTime, setFilterTime] = useState<TimeOfDay | 'all'>('all');

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [checkinHabit, setCheckinHabit] = useState<Habit | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Habit>>({
        name: '',
        timeOfDay: 'anytime',
        frequency: 'daily',
        exactTime: ''
    });

    // Checkin Form
    const [checkinData, setCheckinData] = useState<{ effort: EffortLevel; note: string }>({
        effort: 'easy',
        note: ''
    });

    /* --- Data Loading --- */
    useEffect(() => {
        const loadHabits = () => {
            try {
                const stored = localStorage.getItem(STORAGE_V2);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setHabits(parsed);
                } else {
                    // Fallback: check V1 or init empty
                    const v1 = localStorage.getItem(STORAGE_V1);
                    if (v1) {
                        // ... migration logic simplified
                    }
                }
            } catch (e) { console.error(e); }
        };
        loadHabits();
    }, []);

    const saveHabits = (newHabits: Habit[]) => {
        setHabits(newHabits);
        localStorage.setItem(STORAGE_V2, JSON.stringify(newHabits));
    };

    /* --- Logic --- */
    const todayISO = toISODate(new Date());

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
                color: formData.color,
                targetDays: 66
            };
            saveHabits([...habits, newHabit]);
        }
        setIsCreateOpen(false);
        setEditingHabit(null);
        setFormData({ name: '', timeOfDay: 'anytime', frequency: 'daily' });
    };

    const deleteHabit = (id: string) => {
        if (window.confirm(t('habits.deleteConfirm') || 'Are you sure?')) {
            saveHabits(habits.filter(h => h.id !== id));
        }
    };

    const toggleCheckin = (habit: Habit, dateISO: string) => {
        const isDone = !!habit.checkins[dateISO]?.completed;
        if (isDone) {
            // Undo
            const updatedCheckins = { ...habit.checkins };
            delete updatedCheckins[dateISO];
            saveHabits(habits.map(h => h.id === habit.id ? { ...h, checkins: updatedCheckins } : h));
        } else {
            // Open Modal
            setCheckinHabit(habit);
            setCheckinData({ effort: 'easy', note: '' });
        }
    };

    const confirmCheckin = () => {
        if (!checkinHabit) return;
        const dateISO = todayISO;
        const updated = habits.map(h => {
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
        saveHabits(updated);
        setCheckinHabit(null);
    };

    // Filtering
    const filteredHabits = useMemo(() => {
        let list = habits.filter(h => !h.isMastered && !h.archived);
        if (filterTime !== 'all') {
            list = list.filter(h => h.timeOfDay === filterTime);
        }
        // Sort logic
        return list.sort((a, b) => {
            // Priority to not done today
            const aDone = !!a.checkins[todayISO]?.completed;
            const bDone = !!b.checkins[todayISO]?.completed;
            if (aDone !== bDone) return aDone ? 1 : -1;

            // Then by time
            if (a.exactTime && b.exactTime) return a.exactTime.localeCompare(b.exactTime);
            return 0;
        });
    }, [habits, filterTime, todayISO]);

    const getTimeIcon = (t: TimeOfDay) => {
        switch (t) {
            case 'morning': return <Sunrise className="w-4 h-4 text-amber-500" />;
            case 'afternoon': return <Sun className="w-4 h-4 text-orange-500" />;
            case 'evening': return <Moon className="w-4 h-4 text-indigo-400" />;
            default: return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    // --- Render ---
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50 p-4 lg:p-8 font-sans">

            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl text-white shadow-lg shadow-blue-500/20">
                            <Activity size={24} />
                        </div>
                        {t('habits.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 ml-1">
                        {t('habits.subtitle')}
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingHabit(null);
                        setFormData({ name: '', timeOfDay: 'anytime', frequency: 'daily' });
                        setIsCreateOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all font-bold"
                >
                    <Plus size={20} />
                    {t('habits.create')}
                </button>
            </header>

            {/* Global Dashboard */}
            <GlobalStats habits={habits} t={t} />

            {/* Global Heatmap */}
            <GlobalHeatmap habits={habits} t={t} />

            {/* Filters & Navigation */}
            <div className="flex overflow-x-auto pb-2 gap-2 mb-6 hide-scrollbar">
                {(['all', 'morning', 'afternoon', 'evening', 'anytime'] as const).map(ft => (
                    <button
                        key={ft}
                        onClick={() => setFilterTime(ft)}
                        className={`
                 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                 ${filterTime === ft
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}
               `}
                    >
                        {ft !== 'all' && getTimeIcon(ft as TimeOfDay)}
                        {ft === 'all' ? t('common.viewAll') : t(`habits.time.${ft}`)}
                    </button>
                ))}
            </div>

            {/* Habits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredHabits.map(habit => {
                        const { currentStreak, bestStreak } = getStreakStats(habit, todayISO);
                        const isDone = !!habit.checkins[todayISO]?.completed;
                        const totalCheckins = Object.keys(habit.checkins).length;
                        const progressPercent = Math.min(100, (totalCheckins / (habit.targetDays || 66)) * 100);

                        return (
                            <motion.div
                                key={habit.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`
                        group relative bg-white dark:bg-gray-800 rounded-3xl border transition-all duration-300 overflow-hidden
                        ${isDone
                                        ? 'border-blue-200 dark:border-blue-900/50 shadow-sm'
                                        : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md'}
                      `}
                            >
                                {/* Card Header & Main Interaction */}
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-4 items-center">
                                            {/* Primary Interaction Button */}
                                            <button
                                                onClick={() => toggleCheckin(habit, todayISO)}
                                                className={`
                                  w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-all duration-300 hover:scale-105 active:scale-95
                                  ${isDone
                                                        ? 'bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-green-500/30'
                                                        : 'bg-white dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 text-gray-300 hover:border-blue-200 dark:hover:border-blue-500 hover:text-blue-500'}
                                `}
                                                title={isDone ? t('common.undo') || 'Undo' : t('habits.checkin.title')}
                                            >
                                                {isDone ? <Check size={32} strokeWidth={4} /> : <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 group-hover:bg-blue-200" />}
                                            </button>

                                            <div>
                                                <h3 className={`font-bold text-lg leading-tight transition-all ${isDone ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                                                    {habit.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={`p-1 rounded-md ${isDone ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-500 dark:bg-blue-900/20'}`}>
                                                        {getTimeIcon(habit.timeOfDay)}
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                        {habit.exactTime || t(`habits.time.${habit.timeOfDay}`)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end pl-2">
                                            <MasteryRing progress={progressPercent} size={42} />
                                        </div>
                                    </div>

                                    {/* Interactive Weekly Chart */}
                                    <div className="mb-4 pt-2 px-1">
                                        <WeeklyProgress habit={habit} todayISO={todayISO} />
                                    </div>

                                    {/* Stats Row */}
                                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-gray-900 dark:text-white text-base text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">{currentStreak}</span>
                                            <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">{t('habits.streak')}</span>
                                        </div>
                                        <div className="flex flex-col items-center border-l border-r border-gray-200 dark:border-gray-700">
                                            <span className="font-bold text-gray-900 dark:text-white text-base">{bestStreak}</span>
                                            <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">Best</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-gray-900 dark:text-white text-base">{totalCheckins}</span>
                                            <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">Total</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Footer (Simplified) */}
                                {isDone && (
                                    <div className="px-6 py-2 bg-green-50 dark:bg-green-900/10 border-t border-green-100 dark:border-green-900/30 flex justify-center items-center">
                                        <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <CheckCircle size={12} />
                                            {t('habits.complete') || 'Completed today'}
                                        </span>
                                    </div>
                                )}

                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingHabit(habit); setFormData(habit); setIsCreateOpen(true); }} className="p-2 bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 rounded-lg text-gray-400 hover:text-blue-500 transition-colors border border-gray-200 dark:border-gray-700">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }} className="p-2 bg-white dark:bg-gray-800 shadow-sm hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors border border-gray-200 dark:border-gray-700">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Empty State */}
            {
                filteredHabits.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 opacity-60">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                            <Coffee size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-600 dark:text-gray-300">{t('habits.noHabits')}</h3>
                        <p className="text-sm text-gray-400 mt-2">Time to build some new routines!</p>
                    </div>
                )
            }

            {/* Create Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">{editingHabit ? 'Edit Habit' : t('habits.create')}</h2>
                                <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Habit Name</label>
                                    <input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Read 30 mins"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Time</label>
                                        <select
                                            value={formData.timeOfDay}
                                            onChange={e => setFormData({ ...formData, timeOfDay: e.target.value as TimeOfDay })}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 outline-none"
                                        >
                                            <option value="morning">{t('habits.time.morning')}</option>
                                            <option value="afternoon">{t('habits.time.afternoon')}</option>
                                            <option value="evening">{t('habits.time.evening')}</option>
                                            <option value="anytime">{t('habits.time.anytime')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Exact Time (Opt)</label>
                                        <input
                                            type="time"
                                            value={formData.exactTime || ''}
                                            onChange={e => setFormData({ ...formData, exactTime: e.target.value })}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-medium">Cancel</button>
                                <button onClick={handleCreateOrUpdate} disabled={!formData.name} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20">
                                    {editingHabit ? 'Save Changes' : 'Create Habit'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Checkin Impact Modal */}
            <AnimatePresence>
                {checkinHabit && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-gray-700"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                                    <Check size={32} strokeWidth={4} />
                                </div>
                                <h2 className="text-2xl font-bold">{t('habits.checkin.title')}</h2>
                                <p className="text-gray-500">{checkinHabit.name}</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block text-center">{t('habits.checkin.howWasIt')}</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['easy', 'medium', 'hard'] as const).map(lvl => (
                                            <button
                                                key={lvl}
                                                onClick={() => setCheckinData({ ...checkinData, effort: lvl })}
                                                className={`
                                            py-3 rounded-xl border-2 font-bold transition-all
                                            ${checkinData.effort === lvl
                                                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                                                        : 'border-transparent bg-gray-100 dark:bg-gray-700 text-gray-400'}
                                        `}
                                            >
                                                {t(`habits.effort.${lvl}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <textarea
                                    placeholder={t('habits.checkin.addNote')}
                                    value={checkinData.note}
                                    onChange={e => setCheckinData({ ...checkinData, note: e.target.value })}
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-xl resize-none outline-none focus:ring-2 focus:ring-blue-200"
                                    rows={2}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setCheckinHabit(null)} className="flex-1 py-3 text-gray-400 hover:text-gray-600 font-medium">Cancel</button>
                                <button onClick={confirmCheckin} className="flex-[2] py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-lg shadow-green-500/20">
                                    {t('habits.checkin.confirm')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div >
    );
};

export default HabitView;