import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    Plus,
    Trash2,
    X,
    Flame,
    Sparkles,
    CheckCircle2,
    Activity,
    Zap,
    TrendingUp,
} from 'lucide-react';

/* ----------------------------- Types ----------------------------- */

type HabitFrequency = 'daily' | 'weekly';

type Habit = {
    id: string;
    name: string;
    description?: string;
    frequency: HabitFrequency;          // daily / weekly
    targetPerWeek: number;              // 1..7 (even for daily, this is useful)
    mastery: number;                    // 0..100 (slider)
    createdAtISO: string;               // YYYY-MM-DD
    checkinsISO: string[];              // list of YYYY-MM-DD dates when done
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

const toISODateLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `${y}-${m}-${day}`;
};

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

const uid = () => {
    return `h_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
};

const STORAGE_KEY = 'planner.statistics.habits.v1';

const loadHabits = (): Habit[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(Boolean)
            .map((h: any) => ({
                id: String(h.id ?? uid()),
                name: String(h.name ?? 'Új szokás'),
                description: typeof h.description === 'string' ? h.description : '',
                frequency: h.frequency === 'weekly' ? 'weekly' : 'daily',
                targetPerWeek: clamp(Number(h.targetPerWeek ?? 7), 1, 7),
                mastery: clamp(Number(h.mastery ?? 0), 0, 100),
                createdAtISO: typeof h.createdAtISO === 'string' ? h.createdAtISO : toISODateLocal(new Date()),
                checkinsISO: Array.isArray(h.checkinsISO) ? h.checkinsISO.filter((x: any) => typeof x === 'string') : [],
            }));
    } catch {
        return [];
    }
};

const saveHabits = (habits: Habit[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
};

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
    while (true) {
        const iso = toISODateLocal(cursor);
        if (!checkins.has(iso)) break;
        streak++;
        cursor.setDate(cursor.getDate() - 1);
        if (streak > 365) break;
    }

    const last7 = lastNDaysISO(7, now);
    const last7Done = last7.reduce((acc, d) => acc + (checkins.has(d) ? 1 : 0), 0);
    const last7Rate = last7Done / 7;

    const streakBonus = 1 - Math.exp(-streak / 6);
    const mastery = habit.mastery / 100;

    const strength =
        100 *
        clamp(
            0.45 * ema + 0.35 * mastery + 0.20 * (0.6 * last7Rate + 0.4 * streakBonus),
            0,
            1
        );

    return {
        strength: Math.round(strength),
        streak,
        last7Done,
        last7Rate: Math.round(last7Rate * 100),
    };
};

/* ----------------------------- UI Helpers ----------------------------- */

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

/* ----------------------------- Main Component ----------------------------- */

const HabitView: React.FC = () => {
    const { t } = useLanguage();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [showHabitModal, setShowHabitModal] = useState(false);

    useEffect(() => {
        setHabits(loadHabits());
    }, []);

    useEffect(() => {
        saveHabits(habits);
    }, [habits]);

    /* ----------------------------- Engine ----------------------------- */

    const habitEngine = useMemo(() => {
        const todayISO = toISODateLocal(new Date());
        const last7 = lastNDaysISO(7, new Date());

        const computed = habits.map(h => {
            const s = computeHabitStrength(h, new Date());
            const doneToday = new Set(h.checkinsISO).has(todayISO);
            const weekDone = last7.reduce((acc, d) => acc + (h.checkinsISO.includes(d) ? 1 : 0), 0);

            const target = clamp(h.targetPerWeek, 1, 7);
            const compliance = Math.round((weekDone / target) * 100);

            return {
                ...h,
                ...s,
                doneToday,
                weekDone,
                compliance: clamp(compliance, 0, 200),
            };
        });

        const overallStrength = computed.length
            ? Math.round(computed.reduce((acc, h) => acc + h.strength, 0) / computed.length)
            : 0;

        const masteredCount = computed.filter(h => h.mastery >= 80).length;

        return { computed, overallStrength, masteredCount };
    }, [habits]);

    /* ----------------------------- Actions ----------------------------- */

    const toggleHabitToday = useCallback((habitId: string) => {
        const today = toISODateLocal(new Date());
        setHabits(prev => {
            const next = prev.map(h => {
                if (h.id !== habitId) return h;
                const set = new Set(h.checkinsISO);
                if (set.has(today)) set.delete(today);
                else set.add(today);
                return { ...h, checkinsISO: Array.from(set).sort() };
            });
            return next;
        });
    }, []);

    const setHabitMastery = useCallback((habitId: string, mastery: number) => {
        setHabits(prev => prev.map(h => (h.id === habitId ? { ...h, mastery: clamp(mastery, 0, 100) } : h)));
    }, []);

    const removeHabit = useCallback((habitId: string) => {
        setHabits(prev => prev.filter(h => h.id !== habitId));
    }, []);

    /* ----------------------------- Render ----------------------------- */

    return (
        <div className="view-container pb-24">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 backdrop-blur">
                        <Sparkles size={14} className="opacity-70" />
                        <span>Atomic Habits</span>
                    </div>

                    <h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                        <span className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-3 shadow-lg shadow-indigo-500/20">
                            <Zap size={24} className="text-white" />
                        </span>
                        {t('habits.title') || 'Szokás Labor'}
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                        {t('habits.subtitle') || 'Építs atomi szokásokat és kövesd a konzisztenciát.'}
                    </p>
                </div>

                <button
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:brightness-110 transition"
                    onClick={() => setShowHabitModal(true)}
                >
                    <Plus size={18} />
                    Új szokás
                </button>
            </div>

            {/* KPI & Grid */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

                {/* Left: Summary + Coach */}
                <div className="space-y-6">
                    <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
                        <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity size={20} className="text-indigo-500" />
                            Rendszer Állapot
                        </h2>

                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 p-4 border border-indigo-100 dark:border-indigo-900/50">
                                <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Momentum</div>
                                <div className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{habitEngine.overallStrength}</div>
                            </div>
                            <div className="rounded-2xl bg-purple-50 dark:bg-purple-950/30 p-4 border border-purple-100 dark:border-purple-900/50">
                                <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Szokások</div>
                                <div className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{habits.length}</div>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100 dark:border-emerald-900/50">
                                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Stabil (80%+)</div>
                                <div className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{habitEngine.masteredCount}</div>
                            </div>
                            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-100 dark:border-amber-900/50">
                                <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Streak Nap</div>
                                <div className="mt-1 text-3xl font-black text-gray-900 dark:text-white">
                                    {/* Just sum of streaks for fun or max streak? Let's use max streak */}
                                    {Math.max(0, ...habitEngine.computed.map(h => h.streak))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <Sparkles size={120} />
                        </div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                                <Sparkles size={24} className="text-yellow-300" />
                            </div>
                            <div>
                                <div className="text-lg font-black">Coach Insight</div>
                                <p className="mt-2 text-sm text-white/80 leading-relaxed font-medium">
                                    {habitEngine.overallStrength >= 75
                                        ? 'Nagyon jó! A rendszered már “önjáró”. Most az a nyerő, ha 1–2 szokást stabilan tartasz, és csak utána bővítesz.'
                                        : habitEngine.overallStrength >= 45
                                            ? 'Jó alap. A leggyorsabb javulás: napi 1 apró check-in + a mastery őszinte állítása (nem kell 100%).'
                                            : 'Most a fókusz: kevesebb szokás, egyszerűbb cél. Válassz 1 szokást, állíts 60%-os mastery-t, és nyomj 7 nap streaket.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Habit Grid */}
                <div className="xl:col-span-2">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {habitEngine.computed.length > 0 ? (
                            habitEngine.computed
                                .slice()
                                .sort((a, b) => b.strength - a.strength)
                                .map(h => (
                                    <HabitCard
                                        key={h.id}
                                        habit={h}
                                        onToggleToday={() => toggleHabitToday(h.id)}
                                        onMastery={(v) => setHabitMastery(h.id, v)}
                                        onRemove={() => removeHabit(h.id)}
                                    />
                                ))
                        ) : (
                            <div className="col-span-full py-12">
                                <EmptyState
                                    icon={<Sparkles size={32} />}
                                    title="Még nincsenek szokásaid"
                                    desc="Kattints az “Új szokás” gombra és kezd el építeni a rendszert."
                                />
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Habit Modal */}
            {showHabitModal && (
                <HabitModal
                    onClose={() => setShowHabitModal(false)}
                    onCreate={(draft) => {
                        const createdAtISO = toISODateLocal(new Date());
                        const newHabit: Habit = {
                            id: uid(),
                            name: draft.name.trim() || 'Új szokás',
                            description: draft.description.trim(),
                            frequency: draft.frequency,
                            targetPerWeek: clamp(draft.targetPerWeek, 1, 7),
                            mastery: clamp(draft.mastery, 0, 100),
                            createdAtISO,
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

/* ----------------------------- Sub-Components ----------------------------- */

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-8 text-center h-full min-h-[200px]">
        <div className="inline-flex items-center justify-center rounded-2xl bg-white dark:bg-gray-900 p-4 text-gray-500 dark:text-gray-400 shadow-sm mb-4">
            {icon}
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">{title}</div>
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">{desc}</div>
    </div>
);

const HabitCard: React.FC<{
    habit: any;
    onToggleToday: () => void;
    onMastery: (v: number) => void;
    onRemove: () => void;
}> = ({ habit, onToggleToday, onMastery, onRemove }) => {
    const strengthTone =
        habit.strength >= 75 ? 'from-emerald-500 to-emerald-700'
            : habit.strength >= 45 ? 'from-amber-500 to-amber-700'
                : 'from-rose-500 to-rose-700';

    return (
        <div className="group relative rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                        <div className={`shrink-0 rounded-2xl bg-gradient-to-br ${strengthTone} p-2.5 text-white shadow-sm`}>
                            <Flame size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-base font-black text-gray-900 dark:text-white leading-tight">{habit.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                                <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">{habit.frequency === 'daily' ? 'Napi' : 'Heti'}</span>
                                <span>Cél: {habit.targetPerWeek}</span>
                                <span className="text-gray-300">•</span>
                                <span className="flex items-center gap-1">
                                    <TrendingUp size={12} />
                                    Streak: <span className="text-gray-700 dark:text-gray-200">{habit.streak}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {habit.description ? (
                        <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 line-clamp-2 pl-1 border-l-2 border-gray-100 dark:border-gray-800">
                            {habit.description}
                        </div>
                    ) : null}
                </div>

                <button
                    onClick={onRemove}
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                    title="Szokás törlése"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Mastery Slider */}
            <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    <span>Mastery</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{habit.mastery}%</span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                        className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${habit.mastery}%` }}
                    />
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

            {/* Action Area */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-3">
                <button
                    onClick={onToggleToday}
                    className={`col-span-1 rounded-2xl px-3 py-3 text-sm font-bold transition-all border flex items-center justify-center gap-2 ${habit.doneToday
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                >
                    <CheckCircle2 size={18} className={habit.doneToday ? 'text-white' : 'text-gray-400'} />
                    {habit.doneToday ? 'Kész' : 'Check'}
                </button>

                <div className="col-span-1 flex flex-col justify-center items-center rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                    <div className="text-[10px] font-bold uppercase text-gray-400">Strength</div>
                    <div className="text-lg font-black text-gray-900 dark:text-white">{habit.strength}</div>
                </div>
            </div>
        </div>
    );
};

const HabitModal: React.FC<{
    onClose: () => void;
    onCreate: (draft: NewHabitDraft) => void;
}> = ({ onClose, onCreate }) => {
    const [draft, setDraft] = useState<NewHabitDraft>({
        name: '',
        description: '',
        frequency: 'daily',
        targetPerWeek: 7,
        mastery: 40,
    });

    const closeBtnRef = useRef<HTMLButtonElement | null>(null);

    useEscape(true, onClose);
    useEffect(() => {
        closeBtnRef.current?.focus();
    }, []);

    return (
        <>
            <ScrollLock enabled={true} />
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <div
                    className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl animate-in fade-in zoom-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                >
                    {/* header */}
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-3 text-white shadow-lg shadow-indigo-500/20">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <div className="text-lg font-black text-gray-900 dark:text-white">Új szokás létrehozása</div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">Kicsi, mérhető, ismételhető.</div>
                            </div>
                        </div>
                        <button
                            ref={closeBtnRef}
                            onClick={onClose}
                            className="rounded-xl p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                            title="Bezárás"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* body */}
                    <div className="px-6 py-6 space-y-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">Szokás neve</label>
                                <input
                                    value={draft.name}
                                    onChange={(e) => setDraft(s => ({ ...s, name: e.target.value }))}
                                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-shadow"
                                    placeholder="pl. 10 perc nyújtás"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">Gyakoriság</label>
                                <select
                                    value={draft.frequency}
                                    onChange={(e) => {
                                        const freq = e.target.value === 'weekly' ? 'weekly' : 'daily';
                                        setDraft(s => ({
                                            ...s,
                                            frequency: freq,
                                            targetPerWeek: freq === 'daily' ? 7 : clamp(s.targetPerWeek, 1, 7),
                                        }));
                                    }}
                                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-shadow"
                                >
                                    <option value="daily">Napi</option>
                                    <option value="weekly">Heti</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">Leírás (opcionális)</label>
                            <textarea
                                value={draft.description}
                                onChange={(e) => setDraft(s => ({ ...s, description: e.target.value }))}
                                className="w-full min-h-[96px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-shadow resize-none"
                                placeholder="Miért fontos? Mi számít sikernek? Pl. Reggel, kávé előtt."
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Cél / hét</div>
                                    <div className="text-base font-black text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-1 rounded-lg shadow-sm">
                                        {draft.targetPerWeek}/7
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min={1}
                                    max={7}
                                    value={draft.targetPerWeek}
                                    onChange={(e) => setDraft(s => ({ ...s, targetPerWeek: parseInt(e.target.value, 10) }))}
                                    className="w-full accent-indigo-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="mt-2 flex justify-between text-[10px] uppercase font-bold text-gray-400">
                                    <span>Laza</span><span>Közepes</span><span>Gép</span>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Kezdő mastery</div>
                                    <div className="text-base font-black text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-1 rounded-lg shadow-sm">
                                        {draft.mastery}%
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={draft.mastery}
                                    onChange={(e) => setDraft(s => ({ ...s, mastery: parseInt(e.target.value, 10) }))}
                                    className="w-full accent-indigo-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="mt-2 flex justify-between text-[10px] uppercase font-bold text-gray-400">
                                    <span>0%</span><span>50%</span><span>100%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* footer */}
                    <div className="flex flex-col-reverse gap-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 px-6 py-5 sm:flex-row sm:justify-end">
                        <button
                            onClick={onClose}
                            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-sm"
                        >
                            Mégse
                        </button>
                        <button
                            onClick={() => onCreate(draft)}
                            className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20 hover:brightness-110 transition active:scale-95"
                        >
                            Létrehozás
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HabitView;
