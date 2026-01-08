import React, { useState, useEffect } from 'react';
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
    LayoutGrid
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// === TYPES (Compatible with V3 Data) ===
interface HabitLog {
    date: string;       // YYYY-MM-DD
    completed: boolean;
    timestamp?: number; // Unix timestamp
    note?: string;      // Quick note
    time?: string;      // "14:30" (Optional hourly log)
}

interface Habit {
    id: string;
    name: string;        // V3 "text" mapped to name
    description?: string;
    emoji: string;       // New field
    color: string;
    history: Record<string, HabitLog>; // V3 structure
    createdAt: string;
    archived?: boolean;
    mastery: number;     // 0-100
}

// === UTILS ===
const getToday = () => new Date().toISOString().split('T')[0];

const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
};

const getStreak = (history: Record<string, HabitLog>) => {
    let streak = 0;
    const today = new Date();
    // Check up to 365 days back
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        // Allow missing today if it's not over yet, but break if yesterday is missing
        if (history[dateStr]?.completed) {
            streak++;
        } else if (i > 0) {
            // If it's not today and we missed it, streak breaks
            // Exception: if today is missing, we don't count it but don't break streak from yesterday
            if (i === 0) continue;
            break;
        }
    }
    return streak;
};

// Storage Key (Preserving V3 Data)
const STORAGE_KEY = 'habit-studio-v3-data';

const EMOJIS = ['💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🎯', '🧠', '🎨', '🎵', '🌱', '☀️', '💻', '💸'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

export default function HabitView() {
    const { t, language } = useLanguage();

    // State
    const [habits, setHabits] = useState<Habit[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [newName, setNewName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [hourlyToggle, setHourlyToggle] = useState(false); // For optional hourly tracking on a habit

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());

    const today = getToday();
    const last7Days = getLast7Days();

    // Load Data
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Migration/Sanitization: Ensure V3 data maps to new interface
                // If "text" exists but "name" doesn't, map it.
                // If "emoji" missing, assign random.
                const migrated = Array.isArray(parsed) ? parsed.map((h: any) => ({
                    ...h,
                    name: h.name || h.text || 'Untitled Habit',
                    emoji: h.emoji || EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
                    color: h.color || COLORS[Math.floor(Math.random() * COLORS.length)],
                    history: h.history || {},
                    mastery: h.mastery || 0
                })) : [];
                setHabits(migrated);
            }
        } catch (e) {
            console.error("Failed to load habits", e);
        }
    }, []);

    const saveHabits = (newHabits: Habit[]) => {
        setHabits(newHabits);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHabits));
    };

    // --- ACTIONS ---

    const addHabit = () => {
        if (!newName.trim()) return;

        const newHabit: Habit = {
            id: Date.now().toString(),
            name: newName.trim(),
            emoji: selectedEmoji,
            color: selectedColor,
            history: {},
            createdAt: new Date().toISOString(),
            mastery: 0
        };

        saveHabits([...habits, newHabit]);
        setNewName('');
        setShowAddForm(false);
    };

    const deleteHabit = (id: string) => {
        if (confirm(t('habits.deleteConfirm'))) {
            saveHabits(habits.filter(h => h.id !== id));
        }
    };

    const toggleCompletion = (habitId: string, date: string, time?: string) => {
        saveHabits(habits.map(h => {
            if (h.id === habitId) {
                const newHistory = { ...h.history };
                if (newHistory[date]?.completed) {
                    delete newHistory[date]; // Toggle off
                } else {
                    newHistory[date] = {
                        date,
                        completed: true,
                        timestamp: Date.now(),
                        time: time || undefined
                    };
                }
                return { ...h, history: newHistory };
            }
            return h;
        }));
    };

    const updateHabitName = (id: string, name: string) => {
        if (!name.trim()) return;
        saveHabits(habits.map(h => h.id === id ? { ...h, name: name.trim() } : h));
        setEditingId(null);
    };

    // --- CALENDAR LOGIC ---
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        // Empty cells for offset
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);

        const monthName = new Date(year, month).toLocaleString(language === 'hu' ? 'hu-HU' : 'en-US', { month: 'long', year: 'numeric' });

        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{monthName}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-medium bg-blue-50 text-blue-600 rounded-lg">
                            {t('habits.metrics.today')}
                        </button>
                        <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-medium text-gray-400">
                    {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {days.map((day, idx) => {
                        if (!day) return <div key={`empty-${idx}`} />;

                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isToday = dateStr === today;

                        // Get logs for this day
                        const dailyLogs = habits.filter(h => h.history[dateStr]?.completed);

                        return (
                            <div
                                key={dateStr}
                                className={`min-h-[100px] p-2 rounded-xl border transition-all hover:shadow-md cursor-pointer
                  ${isToday ? 'border-blue-500 bg-blue-50/10' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'}
                `}
                                onClick={() => {
                                    // Optional: Open day detail modal
                                }}
                            >
                                <div className={`text-right text-sm font-bold mb-2 ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>
                                    {day}
                                </div>

                                <div className="space-y-1">
                                    {dailyLogs.map(h => {
                                        const log = h.history[dateStr];
                                        return (
                                            <div key={h.id} className="flex items-center gap-1 overflow-hidden" title={`${h.name}${log.time ? ` @ ${log.time}` : ''}`}>
                                                <span className="text-xs">{h.emoji}</span>
                                                <div
                                                    className="h-1.5 flex-1 rounded-full"
                                                    style={{ backgroundColor: h.color }}
                                                />
                                                {log.time && <span className="text-[10px] text-gray-400 font-mono">{log.time}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Hourly Legend/Support Note */}
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{t('habits.calendar.hourlyLog')}: {t('habits.calendar.timePlaceholder')}</span>
                </div>
            </div>
        );
    };

    // --- STATS ---
    const todayCompleted = habits.filter(h => h.history[today]?.completed).length;
    const totalActive = habits.length;
    const completionRate = totalActive > 0 ? Math.round((todayCompleted / totalActive) * 100) : 0;
    const bestStreak = Math.max(...habits.map(h => getStreak(h.history)), 0);

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-4 md:p-8 animate-in fade-in">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                            {t('habits.title')}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                            {t('habits.subtitle')}
                        </p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list'
                                    ? 'bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <LayoutList className="w-4 h-4" />
                            {t('habits.view.list')}
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'calendar'
                                    ? 'bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            {t('habits.view.calendar')}
                        </button>
                    </div>
                </div>

                {/* List View */}
                {viewMode === 'list' && (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                        <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                                    {todayCompleted}<span className="text-lg text-gray-400 font-medium">/{totalActive}</span>
                                </div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('habits.metrics.today')}</div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                                        <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                </div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                                    {bestStreak}
                                </div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('habits.metrics.bestStreak')}</div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                </div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                                    {completionRate}%
                                </div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('habits.completionRate')}</div>
                            </div>
                        </div>

                        {/* Add Button */}
                        {!showAddForm && (
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="w-full bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 group transition-all mb-6 flex items-center justify-center gap-3"
                            >
                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                </div>
                                <span className="text-lg font-bold text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                    {t('habits.actions.add')}
                                </span>
                            </button>
                        )}

                        {/* Add Form */}
                        {showAddForm && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 mb-6 animate-in slide-in-from-top-4 duration-200">
                                <div className="flex flex-col gap-6">
                                    {/* Emojis */}
                                    <div className="grid grid-cols-8 gap-2">
                                        {EMOJIS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => setSelectedEmoji(emoji)}
                                                className={`aspect-square flex items-center justify-center text-2xl rounded-xl transition-all ${selectedEmoji === emoji
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Colors */}
                                    <div className="flex gap-3 justify-center">
                                        {COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setSelectedColor(color)}
                                                className={`w-8 h-8 rounded-full transition-all ${selectedColor === color ? 'ring-4 ring-offset-2 ring-gray-200 dark:ring-gray-700 scale-110' : 'hover:scale-110'
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>

                                    {/* Input */}
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addHabit()}
                                            placeholder={t('habits.fields.namePh')}
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-lg font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all placeholder:text-gray-400"
                                            autoFocus
                                        />

                                        {/* Hourly Toggle */}
                                        <label className="flex items-center gap-3 text-sm font-medium text-gray-500 cursor-pointer w-fit">
                                            <div
                                                className={`w-10 h-6 rounded-full p-1 transition-colors ${hourlyToggle ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}
                        `}
                                                onClick={() => setHourlyToggle(!hourlyToggle)}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${hourlyToggle ? 'translate-x-4' : ''}`} />
                                            </div>
                                            {t('habits.calendar.hourlyLog')}
                                        </label>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setShowAddForm(false);
                                                setNewName('');
                                            }}
                                            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            {t('habits.actions.cancel')}
                                        </button>
                                        <button
                                            onClick={addHabit}
                                            disabled={!newName.trim()}
                                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                                        >
                                            {t('habits.actions.add')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Habit Cards */}
                        <div className="space-y-4">
                            {habits.map(habit => {
                                const streak = getStreak(habit.history);
                                const isEditing = editingId === habit.id;

                                return (
                                    <div
                                        key={habit.id}
                                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-4 mb-6">
                                            {/* Icon */}
                                            <div
                                                className="text-3xl w-14 h-14 flex items-center justify-center rounded-2xl shadow-inner"
                                                style={{ backgroundColor: `${habit.color}15`, color: habit.color }}
                                            >
                                                {habit.emoji}
                                            </div>

                                            {/* Name or Edit */}
                                            <div className="flex-1 min-w-0">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        defaultValue={habit.name} // Use defaultValue to avoid uncontrolled warning initially
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') updateHabitName(habit.id, e.currentTarget.value);
                                                            if (e.key === 'Escape') setEditingId(null);
                                                        }}
                                                        onBlur={(e) => updateHabitName(habit.id, e.target.value)}
                                                        className="w-full text-xl font-bold bg-transparent border-b-2 border-blue-500 outline-none px-1"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <h3
                                                        className="text-xl font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-500 transition-colors"
                                                        onClick={() => setEditingId(habit.id)}
                                                        title={habit.name}
                                                    >
                                                        {habit.name}
                                                    </h3>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    {streak > 0 && (
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full w-fit">
                                                            <Flame className="w-3 h-3" />
                                                            {streak} {t('habits.stats.streak')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Delete */}
                                            <button
                                                onClick={() => deleteHabit(habit.id)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Week Grid */}
                                        <div className="grid grid-cols-7 gap-2">
                                            {last7Days.map(date => {
                                                const isCompleted = habit.history[date]?.completed;
                                                const isToday = date === today;
                                                const dayName = new Date(date).toLocaleDateString(language === 'hu' ? 'hu-HU' : 'en-US', { weekday: 'narrow' });
                                                const log = habit.history[date];

                                                return (
                                                    <button
                                                        key={date}
                                                        onClick={() => {
                                                            // If calendar log option logic is needed, prompts for time, but keeping simple for now as requested
                                                            const time = log?.time ? undefined : (hourlyToggle ? prompt(t('habits.calendar.timePlaceholder')) || undefined : undefined);
                                                            toggleCompletion(habit.id, date, time);
                                                        }}
                                                        className={`
                              flex flex-col items-center gap-2 p-2 rounded-xl transition-all relative overflow-hidden group/day
                              ${isCompleted
                                                                ? 'bg-opacity-10 dark:bg-opacity-20'
                                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                            }
                            `}
                                                        style={{
                                                            backgroundColor: isCompleted ? `${habit.color}15` : undefined,
                                                            border: isToday ? `2px solid ${habit.color}` : '2px solid transparent'
                                                        }}
                                                    >
                                                        <div
                                                            className={`
                                w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm
                                ${isCompleted ? 'scale-100' : 'scale-90 bg-gray-100 dark:bg-gray-700'}
                              `}
                                                            style={{
                                                                backgroundColor: isCompleted ? habit.color : undefined,
                                                            }}
                                                        >
                                                            {isCompleted && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                                        </div>

                                                        <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                                            {dayName}
                                                        </span>

                                                        {/* Optional Time Tag */}
                                                        {log?.time && (
                                                            <div className="absolute top-0 right-0 p-0.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title={log.time} />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {habits.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4 grayscale opacity-50">🌱</div>
                                    <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400">
                                        {t('habits.empty')}
                                    </h3>
                                    <p className="text-sm text-gray-400 max-w-xs mx-auto mt-2">
                                        {t('habits.emptyHint')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Calendar View */}
                {viewMode === 'calendar' && renderCalendar()}

            </div>
        </div>
    );
}
