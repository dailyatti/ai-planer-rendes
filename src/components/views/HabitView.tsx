import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Plus, Trash2, X, Sparkles, CheckCircle2, TrendingUp, Heart } from 'lucide-react';

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
    const last28 = lastNDaysISO(28, now);
    const checkins = new Set(habit.checkinsISO);
    const series = last28.map(d => (checkins.has(d) ? 1 : 0));

    const alpha = 0.22;
    let ema = 0;
    for (const x of series) ema = alpha * x + (1 - alpha) * ema;

    const today = toISODateLocal(now);
    let streak = 0;
    let cursor = parseISOToDate(today);
    while (checkins.has(toISODateLocal(cursor)) && streak < 365) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    const last7 = lastNDaysISO(7, now);
    const last7Done = last7.reduce((acc, d) => acc + (checkins.has(d) ? 1 : 0), 0);
    const last7Rate = last7Done / 7;

    const streakBonus = 1 - Math.exp(-streak / 6);
    const mastery = habit.mastery / 100;
    const strength = 100 * clamp(0.45 * ema + 0.35 * mastery + 0.20 * (0.6 * last7Rate + 0.4 * streakBonus), 0, 1);

    return { strength: Math.round(strength), streak, last7Done, last7Rate: Math.round(last7Rate * 100) };
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
        const last7 = lastNDaysISO(7, new Date());

        const computed = habits.map(h => {
            const s = computeHabitStrength(h, new Date());
            const doneToday = new Set(h.checkinsISO).has(todayISO);
            const weekDone = last7.reduce((acc, d) => acc + (h.checkinsISO.includes(d) ? 1 : 0), 0);
            return { ...h, ...s, doneToday, weekDone };
        });

        const overallStrength = computed.length ? Math.round(computed.reduce((acc, h) => acc + h.strength, 0) / computed.length) : 0;
        const masteredCount = computed.filter(h => h.mastery >= 80).length;

        return { computed, overallStrength, masteredCount };
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

    const setHabitMastery = useCallback((habitId: string, mastery: number) => {
        setHabits(prev => prev.map(h => (h.id === habitId ? { ...h, mastery: clamp(mastery, 0, 100) } : h)));
    }, []);

    const removeHabit = useCallback((habitId: string) => {
        setHabits(prev => prev.filter(h => h.id !== habitId));
    }, []);

    return (
        <div className="view-container pb-24">
            {/* Header */}
            <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/30 px-4 py-1.5 text-xs font-bold text-pink-600 dark:text-pink-400 mb-4">
                    <Sparkles size={14} />
                    <span>Atomic Habits</span>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                            <span className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 p-3 shadow-lg shadow-pink-500/20">
                                <Heart size={24} className="text-white" />
                            </span>
                            {t('habits.title') || 'Szokás Labor'}
                        </h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Építs atomi szokásokat és válj a legjobb önmagaddá 💖
                        </p>
                    </div>

                    <button
                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/20 hover:brightness-110 transition"
                        onClick={() => setShowHabitModal(true)}
                    >
                        <Plus size={18} />
                        Új szokás
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard emoji="💪" label="Momentum" value={habitEngine.overallStrength} color="pink" />
                <StatCard emoji="✨" label="Szokások" value={habits.length} color="violet" />
                <StatCard emoji="🌟" label="Stabil" value={habitEngine.masteredCount} color="emerald" />
                <StatCard emoji="🔥" label="Max Streak" value={Math.max(0, ...habitEngine.computed.map(h => h.streak))} color="amber" />
            </div>

            {/* Habit Cards */}
            <div className="space-y-4">
                {habitEngine.computed.length > 0 ? (
                    habitEngine.computed.sort((a, b) => b.strength - a.strength).map(h => (
                        <HabitCard
                            key={h.id}
                            habit={h}
                            onToggleToday={() => toggleHabitToday(h.id)}
                            onMastery={(v) => setHabitMastery(h.id, v)}
                            onRemove={() => removeHabit(h.id)}
                        />
                    ))
                ) : (
                    <EmptyState />
                )}
            </div>

            {/* Coach Insight */}
            {habits.length > 0 && (
                <div className="mt-8 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 p-6 text-white shadow-xl">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                            <Sparkles size={24} className="text-yellow-200" />
                        </div>
                        <div>
                            <div className="text-lg font-black">Coach Insight 💡</div>
                            <p className="mt-2 text-sm text-white/90 leading-relaxed">
                                {habitEngine.overallStrength >= 75
                                    ? 'Csodálatos vagy! 🌟 A rendszered már önjáró. Tartsd meg ezt a lendületet!'
                                    : habitEngine.overallStrength >= 45
                                        ? 'Jó úton haladsz! ✨ Napi kis lépések vezetnek a nagy eredményekhez.'
                                        : 'Kezdd kicsiben! 🌸 Válassz 1 szokást és koncentrálj 7 napig rá.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

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

const StatCard: React.FC<{ emoji: string; label: string; value: number; color: string }> = ({ emoji, label, value, color }) => {
    const colors: Record<string, string> = {
        pink: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800',
        violet: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800',
        emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
        amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    };

    return (
        <div className={`rounded-2xl border p-5 ${colors[color]} transition-all hover:shadow-md`}>
            <div className="text-2xl mb-2">{emoji}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</div>
            <div className="text-3xl font-black text-gray-900 dark:text-white mt-1">{value}</div>
        </div>
    );
};

const EmptyState: React.FC = () => (
    <div className="rounded-3xl border-2 border-dashed border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/20 p-12 text-center">
        <div className="text-5xl mb-4">🌸</div>
        <div className="text-xl font-bold text-gray-900 dark:text-white">Még nincsenek szokásaid</div>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Kattints az "Új szokás" gombra és kezdd el építeni a legjobb verziód!
        </div>
    </div>
);

const HabitCard: React.FC<{ habit: any; onToggleToday: () => void; onMastery: (v: number) => void; onRemove: () => void }> =
    ({ habit, onToggleToday, onMastery, onRemove }) => {
        const last7 = lastNDaysISO(7, new Date());
        const checkSet = new Set(habit.checkinsISO);
        const dayLabels = ['V', 'H', 'K', 'Sz', 'Cs', 'P', 'Szo'];

        const strengthColor = habit.strength >= 75 ? 'from-emerald-400 to-emerald-600'
            : habit.strength >= 45 ? 'from-amber-400 to-amber-600' : 'from-rose-400 to-rose-600';

        return (
            <div className="group rounded-3xl border border-pink-100 dark:border-pink-900/50 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-lg transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                            <div className={`shrink-0 rounded-2xl bg-gradient-to-br ${strengthColor} p-3 text-white shadow-md`}>
                                <Heart size={22} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-lg font-black text-gray-900 dark:text-white truncate">{habit.name}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="px-2 py-0.5 rounded-lg bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 text-pink-600 dark:text-pink-400 text-xs font-bold">
                                        {habit.frequency === 'daily' ? 'Napi' : 'Heti'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <TrendingUp size={14} />
                                        Streak: <span className="font-bold text-gray-700 dark:text-gray-200">{habit.streak}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 7-day grid */}
                    <div className="flex items-center gap-1.5">
                        {last7.map((d) => {
                            const done = checkSet.has(d);
                            const dayIdx = new Date(d).getDay();
                            return (
                                <div key={d} className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{dayLabels[dayIdx]}</span>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${done
                                            ? 'bg-gradient-to-br from-pink-400 to-rose-500 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                                        }`}>
                                        {done ? '✓' : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-4">
                        {/* Mastery */}
                        <div className="w-28">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 mb-1">
                                <span>Mastery</span>
                                <span className="text-pink-600 dark:text-pink-400">{habit.mastery}%</span>
                            </div>
                            <div className="relative h-2.5 w-full rounded-full bg-pink-100 dark:bg-pink-950/50 overflow-hidden">
                                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-pink-400 to-rose-500 rounded-full transition-all" style={{ width: `${habit.mastery}%` }} />
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={habit.mastery}
                                    onChange={(e) => onMastery(parseInt(e.target.value, 10))}
                                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Strength */}
                        <div className="text-center px-3">
                            <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Erő</div>
                            <div className="text-2xl font-black text-gray-900 dark:text-white">{habit.strength}</div>
                        </div>

                        {/* Check button */}
                        <button
                            onClick={onToggleToday}
                            className={`rounded-2xl px-5 py-3 text-sm font-bold transition-all border flex items-center gap-2 ${habit.doneToday
                                    ? 'bg-gradient-to-br from-pink-400 to-rose-500 border-pink-500 text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-900 border-pink-200 dark:border-pink-800 text-gray-700 dark:text-gray-200 hover:bg-pink-50 dark:hover:bg-pink-950/30'
                                }`}
                        >
                            <CheckCircle2 size={18} />
                            {habit.doneToday ? 'Kész!' : 'Check'}
                        </button>

                        {/* Delete */}
                        <button
                            onClick={onRemove}
                            className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                            title="Törlés"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

const HabitModal: React.FC<{ onClose: () => void; onCreate: (draft: NewHabitDraft) => void }> = ({ onClose, onCreate }) => {
    const [draft, setDraft] = useState<NewHabitDraft>({
        name: '',
        description: '',
        frequency: 'daily',
        targetPerWeek: 7,
        mastery: 40,
    });

    const closeBtnRef = useRef<HTMLButtonElement | null>(null);
    useEscape(true, onClose);
    useEffect(() => { closeBtnRef.current?.focus(); }, []);

    return (
        <>
            <ScrollLock enabled={true} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
                <div
                    className="w-full max-w-lg overflow-hidden rounded-3xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-gray-900 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 border-b border-pink-100 dark:border-pink-900 bg-pink-50/50 dark:bg-pink-950/20 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 p-3 text-white shadow-lg">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <div className="text-lg font-black text-gray-900 dark:text-white">Új szokás 🌸</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Kicsi lépések, nagy változások</div>
                            </div>
                        </div>
                        <button ref={closeBtnRef} onClick={onClose} className="rounded-xl p-2 text-gray-500 dark:text-gray-400 hover:bg-pink-100 dark:hover:bg-pink-950/30 transition">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-6 space-y-5">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">Szokás neve</label>
                            <input
                                value={draft.name}
                                onChange={(e) => setDraft(s => ({ ...s, name: e.target.value }))}
                                className="w-full rounded-2xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                                placeholder="pl. 10 perc nyújtás"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">Gyakoriság</label>
                                <select
                                    value={draft.frequency}
                                    onChange={(e) => {
                                        const freq = e.target.value === 'weekly' ? 'weekly' : 'daily';
                                        setDraft(s => ({ ...s, frequency: freq, targetPerWeek: freq === 'daily' ? 7 : clamp(s.targetPerWeek, 1, 7) }));
                                    }}
                                    className="w-full rounded-2xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                                >
                                    <option value="daily">Napi</option>
                                    <option value="weekly">Heti</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">Cél / hét</label>
                                <div className="flex items-center gap-3">
                                    <input type="range" min={1} max={7} value={draft.targetPerWeek} onChange={(e) => setDraft(s => ({ ...s, targetPerWeek: parseInt(e.target.value, 10) }))} className="flex-1 accent-pink-500" />
                                    <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{draft.targetPerWeek}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">Leírás (opcionális)</label>
                            <textarea
                                value={draft.description}
                                onChange={(e) => setDraft(s => ({ ...s, description: e.target.value }))}
                                className="w-full min-h-[80px] rounded-2xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30 resize-none"
                                placeholder="Miért fontos neked?"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kezdő mastery</label>
                                <span className="text-sm font-bold text-pink-600 dark:text-pink-400">{draft.mastery}%</span>
                            </div>
                            <input type="range" min={0} max={100} value={draft.mastery} onChange={(e) => setDraft(s => ({ ...s, mastery: parseInt(e.target.value, 10) }))} className="w-full accent-pink-500" />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 border-t border-pink-100 dark:border-pink-900 bg-pink-50/50 dark:bg-pink-950/20 px-6 py-5 justify-end">
                        <button onClick={onClose} className="rounded-2xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-pink-50 dark:hover:bg-pink-950/30 transition">
                            Mégse
                        </button>
                        <button onClick={() => onCreate(draft)} className="rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:brightness-110 transition">
                            Létrehozás 💖
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HabitView;
