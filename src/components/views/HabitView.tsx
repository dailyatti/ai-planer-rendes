import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Plus, Trash2, X, Sparkles, Check, Heart, Trophy, Flame } from 'lucide-react';

/* ----------------------------- Types ----------------------------- */

type HabitFrequency = 'daily' | 'weekly';

type Habit = {
    id: string;
    name: string;
    description?: string;
    frequency: HabitFrequency;
    targetPerWeek: number;
    mastery: number;
    createdAtISO: string;
    checkinsISO: string[];
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
const toISODateLocal = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseISOToDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setHours(0, 0, 0, 0);
    return dt;
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
const STORAGE_KEY = 'planner.statistics.habits.v1';

const loadHabits = (): Habit[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(Boolean).map((h: any) => ({
            id: String(h.id ?? uid()),
            name: String(h.name ?? 'Új szokás'),
            description: typeof h.description === 'string' ? h.description : '',
            frequency: h.frequency === 'weekly' ? 'weekly' : 'daily',
            targetPerWeek: clamp(Number(h.targetPerWeek ?? 7), 1, 7),
            mastery: clamp(Number(h.mastery ?? 0), 0, 100),
            createdAtISO: typeof h.createdAtISO === 'string' ? h.createdAtISO : toISODateLocal(new Date()),
            checkinsISO: Array.isArray(h.checkinsISO) ? h.checkinsISO.filter((x: any) => typeof x === 'string') : [],
        }));
    } catch { return []; }
};

const saveHabits = (habits: Habit[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));

const computeHabitStrength = (habit: Habit, now = new Date()) => {
    const checkins = new Set(habit.checkinsISO);
    const today = toISODateLocal(now);

    // Streak calculation
    let streak = 0;
    let cursor = parseISOToDate(today);
    // Check if today is done, if not start check from yesterday
    if (!checkins.has(today)) {
        cursor.setDate(cursor.getDate() - 1);
    }

    while (checkins.has(toISODateLocal(cursor)) && streak < 365) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    // Simple simple consistency score based on last 28 days
    const last28 = lastNDaysISO(28, now);
    const doneCount = last28.reduce((acc, d) => acc + (checkins.has(d) ? 1 : 0), 0);
    const strength = Math.round((doneCount / 28) * 100);

    return { strength, streak };
};

/* ----------------------------- Hooks ----------------------------- */

const useEscape = (enabled: boolean, onEsc: () => void) => {
    useEffect(() => {
        if (!enabled) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onEsc(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [enabled, onEsc]);
};

const ScrollLock: React.FC<{ enabled: boolean }> = ({ enabled }) => {
    useEffect(() => {
        if (!enabled) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [enabled]);
    return null;
};

/* ----------------------------- Main ----------------------------- */

const HabitView: React.FC = () => {
    const { t } = useLanguage();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [showHabitModal, setShowHabitModal] = useState(false);

    useEffect(() => { setHabits(loadHabits()); }, []);
    useEffect(() => { saveHabits(habits); }, [habits]);

    const habitEngine = useMemo(() => {
        const todayISO = toISODateLocal(new Date());

        // Sort logic
        const computed = habits.map(h => {
            const { strength, streak } = computeHabitStrength(h);
            const doneToday = new Set(h.checkinsISO).has(todayISO);
            return { ...h, strength, streak, doneToday };
        });

        const activeCount = computed.length;
        const perfectDay = computed.length > 0 && computed.every(h => h.doneToday);
        const totalCheckins = computed.reduce((acc, h) => acc + h.checkinsISO.length, 0);

        return { computed, activeCount, perfectDay, totalCheckins };
    }, [habits]);

    const toggleHabitToday = useCallback((habitId: string) => {
        const today = toISODateLocal(new Date());
        setHabits(prev => prev.map(h => {
            if (h.id !== habitId) return h;
            const set = new Set(h.checkinsISO);
            if (set.has(today)) set.delete(today); else set.add(today);
            return { ...h, checkinsISO: Array.from(set).sort() };
        }));
    }, []);

    const removeHabit = useCallback((habitId: string) => {
        setHabits(prev => prev.filter(h => h.id !== habitId));
    }, []);

    return (
        <div className="view-container pb-32">
            {/* Soft Gradient Background Mesh */}
            <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-200 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-200 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <div className="relative mb-8 text-center lg:text-left">
                <h1 className="text-4xl font-serif font-black tracking-tight text-gray-900 dark:text-white drop-shadow-sm">
                    {t('habits.title') || 'Szokás Labor'} <span className="text-pink-500">🌸</span>
                </h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-300 font-medium max-w-2xl">
                    Kis lépések, ragyogó eredmények. Építsd fel álmaid életét.
                </p>
            </div>

            {/* Top Cards - Glassmorphism */}
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <GlassCard
                    icon={<Sparkles size={24} className="text-pink-500" />}
                    label="Aktív Szokások"
                    value={String(habitEngine.activeCount)}
                    bg="bg-gradient-to-br from-white/60 to-white/30 dark:from-gray-800/60 dark:to-gray-800/30"
                />
                <GlassCard
                    icon={<Check size={24} className="text-emerald-500" />}
                    label="Mai Cél"
                    value={habitEngine.perfectDay ? "Teljesítve! 🎉" : "Folyamatban..."}
                    bg="bg-gradient-to-br from-white/60 to-white/30 dark:from-gray-800/60 dark:to-gray-800/30"
                />
                <GlassCard
                    icon={<Heart size={24} className="text-rose-500" />}
                    label="Összes Check-in"
                    value={String(habitEngine.totalCheckins)}
                    bg="bg-gradient-to-br from-white/60 to-white/30 dark:from-gray-800/60 dark:to-gray-800/30"
                />
            </div>

            {/* Habits List */}
            <div className="relative space-y-5">
                {habitEngine.computed.length > 0 ? (
                    habitEngine.computed.sort((a, b) => (Number(a.doneToday) - Number(b.doneToday))).map(h => (
                        <HabitRow
                            key={h.id}
                            habit={h}
                            onToggle={() => toggleHabitToday(h.id)}
                            onRemove={() => removeHabit(h.id)}
                        />
                    ))
                ) : (
                    <EmptyState onClick={() => setShowHabitModal(true)} />
                )}

                {/* Floating Action Button for Mobile / Desktop */}
                <button
                    onClick={() => setShowHabitModal(true)}
                    className="fixed bottom-8 right-8 lg:relative lg:bottom-auto lg:right-auto lg:w-full mt-4 group flex items-center justify-center gap-3 rounded-full lg:rounded-3xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 lg:py-4 shadow-xl hover:scale-105 transition-all duration-300 z-30"
                >
                    <Plus size={24} />
                    <span className="hidden lg:inline font-bold text-lg">Új szokás hozzáadása</span>
                </button>
            </div>

            {showHabitModal && (
                <HabitModal
                    onClose={() => setShowHabitModal(false)}
                    onCreate={(draft) => {
                        const newHabit: Habit = {
                            id: uid(),
                            name: draft.name.trim() || 'Új szokás',
                            description: draft.description.trim(),
                            frequency: draft.frequency,
                            targetPerWeek: clamp(draft.targetPerWeek, 1, 7),
                            mastery: clamp(draft.mastery, 0, 100),
                            createdAtISO: toISODateLocal(new Date()),
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

const GlassCard: React.FC<{ icon: React.ReactNode; label: string; value: string; bg: string }> = ({ icon, label, value, bg }) => (
    <div className={`backdrop-blur-md border border-white/40 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all ${bg}`}>
        <div className="flex items-center gap-4">
            <div className="p-3 bg-white/50 dark:bg-black/20 rounded-2xl shadow-sm">
                {icon}
            </div>
            <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">{label}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
            </div>
        </div>
    </div>
);

const HabitRow: React.FC<{ habit: any; onToggle: () => void; onRemove: () => void }> = ({ habit, onToggle, onRemove }) => {
    const last7 = lastNDaysISO(7, new Date());
    const checkSet = new Set(habit.checkinsISO);
    const days = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];

    return (
        <div className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 ${habit.doneToday
                ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30'
                : 'bg-white/80 dark:bg-gray-800/80 border-gray-100 dark:border-gray-700 backdrop-blur-sm hover:border-pink-200 dark:hover:border-pink-800'
            }`}>
            <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">

                {/* Toggle Button (Left) */}
                <button
                    onClick={onToggle}
                    className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${habit.doneToday
                            ? 'bg-gradient-to-br from-rose-400 to-pink-500 text-white scale-105 shadow-pink-500/30'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-pink-100 dark:hover:bg-pink-900/30 hover:text-pink-500'
                        }`}
                >
                    {habit.doneToday ? <Check size={32} strokeWidth={3} /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className={`text-xl font-bold truncate transition-all ${habit.doneToday ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'
                        }`}>
                        {habit.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium flex items-center gap-2">
                        <Flame size={14} className={habit.streak > 0 ? "text-orange-500" : "text-gray-300"} />
                        {habit.streak} napos széria
                    </p>
                </div>

                {/* 7 Day Micro-Chart */}
                <div className="flex items-center gap-2">
                    {last7.map((d) => {
                        const isDone = checkSet.has(d);
                        const dayIdx = new Date(d).getDay();
                        const isToday = d === toISODateLocal(new Date());

                        return (
                            <div key={d} className="flex flex-col items-center gap-1">
                                <div className={`w-8 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${isDone
                                        ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300'
                                        : isToday
                                            ? 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                                            : 'bg-transparent text-gray-300 dark:text-gray-600'
                                    }`}>
                                    {days[dayIdx][0]}
                                </div>
                                {isDone && <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />}
                            </div>
                        );
                    })}
                </div>

                {/* Delete Action (Hover Only) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="absolute top-4 right-4 p-2 text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Progress Bar Bottom */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100 dark:bg-gray-800">
                <div
                    className="h-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-500"
                    style={{ width: `${habit.strength}%` }}
                />
            </div>
        </div>
    );
};

const EmptyState: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div
        onClick={onClick}
        className="cursor-pointer group rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center hover:border-pink-300 dark:hover:border-pink-700 hover:bg-pink-50/50 dark:hover:bg-pink-950/10 transition-all"
    >
        <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
            🌱
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Még üres a laborod</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Kattints ide és indítsd el az első szokásodat!</p>
    </div>
);

const HabitModal: React.FC<{ onClose: () => void; onCreate: (draft: NewHabitDraft) => void }> = ({ onClose, onCreate }) => {
    const [draft, setDraft] = useState<NewHabitDraft>({ name: '', description: '', frequency: 'daily', targetPerWeek: 7, mastery: 0 });
    useEscape(true, onClose);

    return (
        <>
            <ScrollLock enabled={true} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-black/80 backdrop-blur-sm transition-all" onClick={onClose}>
                <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-serif font-black text-gray-900 dark:text-white">Új Szokás 🎀</h2>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"><X size={20} /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Szokás Neve</label>
                                <input
                                    autoFocus
                                    value={draft.name}
                                    onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                                    className="w-full text-xl font-bold border-b-2 border-gray-200 dark:border-gray-700 bg-transparent py-2 focus:border-pink-500 focus:outline-none transition-colors placeholder-gray-300"
                                    placeholder="pl. Reggeli jóga"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Gyakoriság</label>
                                <div className="flex gap-2">
                                    {(['daily', 'weekly'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setDraft(d => ({ ...d, frequency: f }))}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${draft.frequency === f
                                                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100'
                                                }`}
                                        >
                                            {f === 'daily' ? 'Naponta' : 'Hetente'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => onCreate(draft)}
                                className="w-full py-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Létrehozás ✨
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HabitView;
