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
    Calendar,
} from 'lucide-react';

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
            const target = clamp(h.targetPerWeek, 1, 7);
            const compliance = Math.round((weekDone / target) * 100);
            return { ...h, ...s, doneToday, weekDone, compliance: clamp(compliance, 0, 200) };
        });

        const overallStrength = computed.length
            ? Math.round(computed.reduce((acc, h) => acc + h.strength, 0) / computed.length)
            : 0;
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
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 backdrop-blur">
                        <Sparkles size={14} className="opacity-70" />
                        <span>Atomic Habits</span>
                    </div>

                    <h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                        <span className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 shadow-lg shadow-violet-500/20">
                            <Zap size={24} className="text-white" />
                        </span>
                        {t('habits.title') || 'Szokás Labor'}
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                        {t('habits.subtitle') || 'Építs atomi szokásokat és kövesd a konzisztenciát.'}
                    </p>
                </div>

                <button
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:brightness-110 transition"
                    onClick={() => setShowHabitModal(true)}
                >
                    <Plus size={18} />
                    Új szokás
                </button>
            </div>

            {/* Summary Stats */}
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Momentum" value={habitEngine.overallStrength} color="violet" icon={<Activity size={18} />} />
                <StatCard label="Szokások" value={habits.length} color="purple" icon={<Sparkles size={18} />} />
                <StatCard label="Stabil (80%+)" value={habitEngine.masteredCount} color="emerald" icon={<CheckCircle2 size={18} />} />
                <StatCard label="Max Streak" value={Math.max(0, ...habitEngine.computed.map(h => h.streak))} color="amber" icon={<TrendingUp size={18} />} />
            </div>

            {/* Habit Cards - Full Width Layout */}
            <div className="space-y-4">
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
                    <EmptyState
                        icon={<Sparkles size={32} />}
                        title="Még nincsenek szokásaid"
                        desc="Kattints az " Új szokás" gombra és kezd el építeni a rendszert."
          />
        )}
            </div>

            {/* Coach Insight */}
            {habits.length > 0 && (
                <div className="mt-8 rounded-3xl bg-gradient-to-br from-gray-900 via-violet-950 to-purple-950 p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Sparkles size={120} />
                    </div>
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                            <Sparkles size={24} className="text-yellow-300" />
                        </div>
                        <div>
                            <div className="text-lg font-black text-white">Coach Insight</div>
                            <p className="mt-2 text-sm text-white/80 leading-relaxed font-medium">
                                {habitEngine.overallStrength >= 75
                                    ? 'Nagyon jó! A rendszered már "önjáró". Most az a nyerő, ha 1–2 szokást stabilan tartasz, és csak utána bővítesz.'
                                    : habitEngine.overallStrength >= 45
                                        ? 'Jó alap. A leggyorsabb javulás: napi 1 apró check-in + a mastery őszinte állítása (nem kell 100%).'
                                        : 'Most a fókusz: kevesebb szokás, egyszerűbb cél. Válassz 1 szokást, állíts 60%-os mastery-t, és nyomj 7 nap streaket.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

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

/* ----------------------------- Components ----------------------------- */

const StatCard: React.FC<{ label: string; value: number; color: string; icon: React.ReactNode }> = ({ label, value, color, icon }) => {
    const colors: Record<string, string> = {
        violet: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400',
        purple: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400',
        emerald: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400',
        amber: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
    };

    return (
        <div className={`rounded-2xl border p-4 ${colors[color]}`}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2">
                {icon}
                <span>{label}</span>
            </div>
            <div className="text-3xl font-black text-gray-900 dark:text-white">{value}</div>
        </div>
    );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-12 text-center">
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
    const strengthTone = habit.strength >= 75 ? 'from-emerald-500 to-emerald-700'
        : habit.strength >= 45 ? 'from-amber-500 to-amber-700'
            : 'from-rose-500 to-rose-700';

    // 7-day visual grid
    const last7 = lastNDaysISO(7, new Date());
    const checkSet = new Set(habit.checkinsISO);

    return (
        <div className="group rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-4">
                        <div className={`shrink-0 rounded-2xl bg-gradient-to-br ${strengthTone} p-3 text-white shadow-md`}>
                            <Flame size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                                <div className="text-lg font-black text-gray-900 dark:text-white truncate">{habit.name}</div>
                                <span className="shrink-0 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300">
                                    {habit.frequency === 'daily' ? 'Napi' : 'Heti'}
                                </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    Cél: {habit.targetPerWeek}/7
                                </span>
                                <span className="flex items-center gap-1">
                                    <TrendingUp size={14} />
                                    Streak: <span className="font-bold text-gray-700 dark:text-gray-200">{habit.streak}</span>
                                </span>
                            </div>
                            {habit.description && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{habit.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Middle: 7-day grid */}
                <div className="flex items-center gap-1.5">
                    {last7.map((d, i) => {
                        const done = checkSet.has(d);
                        const dayLabel = new Date(d).toLocaleDateString('hu-HU', { weekday: 'narrow' });
                        return (
                            <div key={d} className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{dayLabel}</span>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${done
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                                    }`}>
                                    {done ? '✓' : ''}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right: Actions + Stats */}
                <div className="flex items-center gap-4">
                    {/* Mastery */}
                    <div className="w-32">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                            <span>Mastery</span>
                            <span className="text-violet-600 dark:text-violet-400">{habit.mastery}%</span>
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div className="absolute top-0 left-0 h-full bg-violet-500 rounded-full transition-all" style={{ width: `${habit.mastery}%` }} />
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
                    <div className="text-center px-4">
                        <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Strength</div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{habit.strength}</div>
                    </div>

                    {/* Check button */}
                    <button
                        onClick={onToggleToday}
                        className={`rounded-2xl px-5 py-3 text-sm font-bold transition-all border flex items-center gap-2 ${habit.doneToday
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        <CheckCircle2 size={18} />
                        {habit.doneToday ? 'Kész!' : 'Check'}
                    </button>

                    {/* Delete */}
                    <button
                        onClick={onRemove}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <div
                    className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-3 text-white shadow-lg shadow-violet-500/20">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <div className="text-lg font-black text-gray-900 dark:text-white">Új szokás</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Kicsi, mérhető, ismételhető.</div>
                            </div>
                        </div>
                        <button ref={closeBtnRef} onClick={onClose} className="rounded-xl p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition" title="Bezárás">
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
                                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
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
                                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                >
                                    <option value="daily">Napi</option>
                                    <option value="weekly">Heti</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">Cél / hét</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={1}
                                        max={7}
                                        value={draft.targetPerWeek}
                                        onChange={(e) => setDraft(s => ({ ...s, targetPerWeek: parseInt(e.target.value, 10) }))}
                                        className="flex-1 accent-violet-600"
                                    />
                                    <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{draft.targetPerWeek}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">Leírás (opcionális)</label>
                            <textarea
                                value={draft.description}
                                onChange={(e) => setDraft(s => ({ ...s, description: e.target.value }))}
                                className="w-full min-h-[80px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                                placeholder="Miért fontos? Mi számít sikernek?"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kezdő mastery</label>
                                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{draft.mastery}%</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={draft.mastery}
                                onChange={(e) => setDraft(s => ({ ...s, mastery: parseInt(e.target.value, 10) }))}
                                className="w-full accent-violet-600"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 px-6 py-5 justify-end">
                        <button onClick={onClose} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            Mégse
                        </button>
                        <button onClick={() => onCreate(draft)} className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-500/20 hover:brightness-110 transition">
                            Létrehozás
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HabitView;
