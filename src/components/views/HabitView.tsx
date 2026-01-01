import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  X,
  Check,
  Flame,
  Search,
  Calendar as CalendarIcon,
  BarChart3,
  Trophy,
  Settings,
  Timer,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  LayoutGrid,
  Zap,
  Download,
  Upload,
  Activity,
  Award,
  BookOpen,
  Briefcase,
  Heart,
  Moon,
  Sun,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

/* =====================================================================================
   HABIT LAB: EVOLUTION (V3)
   - Bento Grid Design
   - Gamification (XP & Levels)
   - Focus Timer
   - Categories
   - Advanced Analytics
===================================================================================== */

// --- Types ---

type Frequency = 'daily' | 'weekly';
type CategoryType = 'health' | 'learning' | 'work' | 'mindfulness' | 'other';

type HabitCheckinMeta = {
  note?: string;
  effort?: number; // 1..5
  durationSeconds?: number; // For timed habits
};

type Habit = {
  id: string;
  name: string;
  description?: string;
  category: CategoryType;
  frequency: Frequency;
  targetPerWeek: number;
  mastery: number; // 0..100
  createdAtISO: string;
  checkinsISO: string[]; // yyyy-mm-dd
  checkinMeta?: Record<string, HabitCheckinMeta>;
  formationDays: number;
  cue?: string;
  reward?: string;
  ifThen?: string;
  // New in V3
  isTimed?: boolean;
  defaultDurationMinutes?: number;
  archived?: boolean;
};

type UserStats = {
  xp: number;
  level: number;
  totalCheckins: number;
  currentStreak: number;
  longestStreak: number;
};

// --- Constants & Utilities ---

const STORAGE_KEY = 'habit-lab-evolution-v3';
const STORAGE_V2_KEY = 'planner.habits.v2'; // For migration

const CATEGORIES: Record<CategoryType, { label: string; color: string; icon: any }> = {
  health: { label: 'Egészség', color: 'bg-emerald-500', icon: Heart },
  learning: { label: 'Tanulás', color: 'bg-blue-500', icon: BookOpen },
  work: { label: 'Munka', color: 'bg-purple-500', icon: Briefcase },
  mindfulness: { label: 'Tudatosság', color: 'bg-teal-500', icon: Moon },
  other: { label: 'Egyéb', color: 'bg-gray-500', icon: Activity },
};

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 10000];

const uid = () => `h_${Math.random().toString(36).substr(2, 9)}`;
const pad2 = (n: number) => String(n).padStart(2, '0');
const toISODateLocal = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const getLevel = (xp: number) => {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
};

const getNextLevelXP = (level: number) => LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 1.5;

// --- Components ---

const ProgressBar: React.FC<{ progress: number; colorClass?: string; heightClass?: string }> = ({ 
  progress, 
  colorClass = 'bg-primary-500', 
  heightClass = 'h-2' 
}) => (
  <div className={`w-full ${heightClass} bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden`}>
    <div 
      className={`h-full transition-all duration-500 ease-out ${colorClass}`} 
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} 
    />
  </div>
);

// --- Main Application ---

export default function HabitLabEvolution() {
  // State
  const [habits, setHabits] = useState<Habit[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'habits' | 'analytics' | 'settings'>('dashboard');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [timerHabitId, setTimerHabitId] = useState<string | null>(null);

  // Computed Stats
  const userStats: UserStats = useMemo(() => {
    const totalCheckins = habits.reduce((acc, h) => acc + h.checkinsISO.length, 0);
    // Rough XP calc: 10 XP per checkin + mastery bonuses
    const baseXP = totalCheckins * 10;
    const masteryBonus = habits.reduce((acc, h) => acc + h.mastery, 0);
    const xp = baseXP + masteryBonus;
    
    // Streaks logic simplified for aggregation
    const today = toISODateLocal(new Date());
    const activeStreaks = habits.filter(h => h.checkinsISO.includes(today)).length;
    
    return {
      xp,
      level: getLevel(xp),
      totalCheckins,
      currentStreak: activeStreaks, // Simplification
      longestStreak: 0 // Placeholder
    };
  }, [habits]);

  // Effects
  useEffect(() => {
    // Initial Load & Migration
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHabits(JSON.parse(stored));
      } catch (e) { console.error("Load failed", e); }
    } else {
      // Try migrating V2
      const v2 = localStorage.getItem(STORAGE_V2_KEY);
      if (v2) {
        try {
          const parsedV2 = JSON.parse(v2);
          const migrated: Habit[] = parsedV2.map((h: any) => ({
            ...h,
            category: 'other',
            isTimed: false,
            defaultDurationMinutes: 0,
            archived: false,
            // Ensure ID exists
            id: h.id || uid()
          }));
          setHabits(migrated);
        } catch (e) { console.error("Migration failed", e); }
      }
    }
  }, []);

  useEffect(() => {
    if (habits.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    }
  }, [habits]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Actions
  const addHabit = (h: Habit) => setHabits(prev => [h, ...prev]);
  const updateHabit = (id: string, patch: Partial<Habit>) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...patch } : h));
  };
  const deleteHabit = (id: string) => {
    if (confirm('Biztosan törlöd ezt a szokást? A története is elveszik.')) {
      setHabits(prev => prev.filter(h => h.id !== id));
      setSelectedHabitId(null);
    }
  };

  const toggleCheckin = (id: string, dateISO: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const exists = h.checkinsISO.includes(dateISO);
      let newCheckins = exists 
        ? h.checkinsISO.filter(d => d !== dateISO)
        : [...h.checkinsISO, dateISO].sort();
      
      // XP animation trigger could go here
      return { ...h, checkinsISO: newCheckins };
    }));
  };

  // Render Helpers
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView habits={habits} userStats={userStats} onToggle={toggleCheckin} onOpenTimer={setTimerHabitId} />;
      case 'habits': return <HabitsListView habits={habits} onSelect={setSelectedHabitId} onToggle={toggleCheckin} />;
      case 'analytics': return <AnalyticsView habits={habits} />;
      case 'settings': return <SettingsView habits={habits} setHabits={setHabits} />;
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#0f1115] text-white' : 'bg-gray-50 text-gray-900'} font-sans`}>
      
      {/* --- Layout Grid --- */}
      <div className="flex h-screen overflow-hidden">
        
        {/* Sidebar (Desktop) */}
        <aside className="hidden md:flex w-64 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16181d] p-4 z-20">
          <div className="flex items-center gap-3 px-2 mb-8 mt-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="text-white" size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Habit Lab</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Evolution</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutGrid size={20} />} label="Áttekintés" />
            <NavItem active={activeTab === 'habits'} onClick={() => setActiveTab('habits')} icon={<Check size={20} />} label="Szokások" />
            <NavItem active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={20} />} label="Elemzés" />
            <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="Beállítások" />
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Szint {userStats.level}</span>
                <span className="text-xs font-mono text-indigo-500">{userStats.xp} XP</span>
              </div>
              <ProgressBar progress={(userStats.xp % getNextLevelXP(userStats.level-1)) / (getNextLevelXP(userStats.level) - getNextLevelXP(userStats.level-1)) * 100} colorClass="bg-indigo-500" />
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              {darkMode ? 'Világos mód' : 'Sötét mód'}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 relative overflow-y-auto overflow-x-hidden scrollbar-hide">
          {/* Mobile Header */}
          <div className="md:hidden sticky top-0 z-10 bg-white/80 dark:bg-[#0f1115]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="text-indigo-500" size={20} />
              <span className="font-bold">Habit Lab</span>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
            {renderContent()}
          </div>
        </main>

        {/* Floating Action Button (Mobile/Desktop) */}
        <button 
          onClick={() => setShowCreate(true)}
          className="fixed bottom-20 md:bottom-8 right-6 md:right-10 z-30 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl shadow-indigo-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus size={28} />
        </button>

        {/* Mobile Tab Bar */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-[#16181d] border-t border-gray-200 dark:border-gray-800 pb-safe">
          <div className="flex justify-around items-center h-16">
            <MobileTab active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutGrid size={22} />} />
            <MobileTab active={activeTab === 'habits'} onClick={() => setActiveTab('habits')} icon={<Check size={22} />} />
            <MobileTab active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={22} />} />
            <MobileTab active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={22} />} />
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      {showCreate && <CreateHabitModal onClose={() => setShowCreate(false)} onCreate={addHabit} />}
      {selectedHabitId && (
        <HabitDetailModal 
          habit={habits.find(h => h.id === selectedHabitId)!} 
          onClose={() => setSelectedHabitId(null)} 
          onUpdate={updateHabit}
          onDelete={deleteHabit}
        />
      )}
      {timerHabitId && (
        <FocusTimerModal 
          habit={habits.find(h => h.id === timerHabitId)!} 
          onClose={() => setTimerHabitId(null)}
          onComplete={(seconds) => {
            const today = toISODateLocal(new Date());
            toggleCheckin(timerHabitId, today);
            // Could save duration meta here
            setTimerHabitId(null);
          }}
        />
      )}
    </div>
  );
}

// --- Sub-Views ---

const DashboardView: React.FC<{ 
  habits: Habit[]; 
  userStats: UserStats;
  onToggle: (id: string, date: string) => void;
  onOpenTimer: (id: string) => void;
}> = ({ habits, userStats, onToggle, onOpenTimer }) => {
  const today = toISODateLocal(new Date());
  
  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 10 ? 'Jó reggelt' : hour < 18 ? 'Szép napot' : 'Szép estét';
  
  const todaysHabits = habits.filter(h => !h.archived);
  const doneCount = todaysHabits.filter(h => h.checkinsISO.includes(today)).length;
  const progress = todaysHabits.length > 0 ? (doneCount / todaysHabits.length) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            {greeting}, Bajnok! 👋
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Ma <span className="text-indigo-500 font-bold">{doneCount}</span> szokással végeztél a <span className="font-bold">{todaysHabits.length}</span>-ból.
          </p>
        </div>
        <div className="hidden md:block text-right">
          <div className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-1">Mai progress</div>
          <div className="flex items-center gap-3">
             <div className="w-48 h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700" style={{ width: `${progress}%` }} />
             </div>
             <span className="font-bold font-mono">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Card: Today's Focus */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <CalendarIcon size={20} className="text-indigo-500" />
            Mai Teendők
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {todaysHabits.map(habit => {
              const isDone = habit.checkinsISO.includes(today);
              const CatIcon = CATEGORIES[habit.category]?.icon || Activity;
              
              return (
                <div 
                  key={habit.id}
                  className={`group relative p-4 rounded-3xl border transition-all duration-300 ${
                    isDone 
                      ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/20' 
                      : 'bg-white dark:bg-[#1c1f26] border-gray-100 dark:border-gray-800 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        isDone ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}>
                         <CatIcon size={20} />
                      </div>
                      <div>
                        <h4 className={`font-bold text-base leading-tight ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          {habit.name}
                        </h4>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                          <Flame size={12} className={habit.checkinsISO.length > 0 ? 'text-orange-500' : 'text-gray-400'} />
                          Streak: {calculateStreak(habit.checkinsISO)}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => onToggle(habit.id, today)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                         isDone 
                         ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40' 
                         : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                  </div>
                  
                  {habit.isTimed && !isDone && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpenTimer(habit.id); }}
                      className="absolute bottom-4 right-4 text-xs font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                      <Play size={10} fill="currentColor" /> Start
                    </button>
                  )}
                </div>
              );
            })}
            {todaysHabits.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                Nincs még mára szokásod. Vegyél fel egyet!
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* Level Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
             <div className="relative z-10">
               <div className="flex items-center gap-3 mb-4">
                 <Trophy className="text-yellow-300" size={24} />
                 <span className="font-bold text-lg">Szint {userStats.level}</span>
               </div>
               <div className="text-3xl font-black mb-1">{userStats.xp} <span className="text-base font-medium opacity-80">XP</span></div>
               <div className="text-xs opacity-70 mb-4">Következő szint: {getNextLevelXP(userStats.level)} XP</div>
               <ProgressBar progress={(userStats.xp % getNextLevelXP(userStats.level-1)) / (getNextLevelXP(userStats.level) - getNextLevelXP(userStats.level-1)) * 100} colorClass="bg-white" heightClass="h-1.5 bg-black/20" />
             </div>
          </div>

          {/* Mini Stats */}
          <div className="bg-white dark:bg-[#1c1f26] border border-gray-200 dark:border-gray-800 rounded-3xl p-6">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Összesítés</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Check size={16} className="text-emerald-500" /> Összes check-in
                </div>
                <span className="font-mono font-bold">{userStats.totalCheckins}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Flame size={16} className="text-orange-500" /> Aktív napok
                </div>
                <span className="font-mono font-bold">{Object.keys(habits.reduce((acc, h) => { h.checkinsISO.forEach(d => acc[d]=true); return acc; }, {} as any)).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HabitsListView: React.FC<{ habits: Habit[]; onSelect: (id: string) => void; onToggle: (id: string, date: string) => void }> = ({ habits, onSelect, onToggle }) => {
  const [filter, setFilter] = useState<'all' | CategoryType>('all');
  
  const filtered = habits.filter(h => filter === 'all' || h.category === filter);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold">Minden Szokás</h2>
        
        <div className="flex gap-2 overflow-x-auto pb-2 w-full sm:w-auto scrollbar-hide">
          <button 
             onClick={() => setFilter('all')}
             className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-[#1c1f26] border border-gray-200 dark:border-gray-800'}`}
          >
            Összes
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button 
              key={key}
              onClick={() => setFilter(key as CategoryType)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${filter === key ? `${cat.color} text-white` : 'bg-white dark:bg-[#1c1f26] border border-gray-200 dark:border-gray-800'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map(habit => (
           <div key={habit.id} onClick={() => onSelect(habit.id)} className="bg-white dark:bg-[#1c1f26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors cursor-pointer group">
             <div className="flex items-center gap-4">
               <div className={`w-12 h-12 rounded-2xl ${CATEGORIES[habit.category].color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-${CATEGORIES[habit.category].color.replace('bg-', '')}`}>
                  {React.createElement(CATEGORIES[habit.category].icon, { size: 24 })}
               </div>
               <div>
                 <h4 className="font-bold text-lg">{habit.name}</h4>
                 <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                   <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 uppercase tracking-wider">{CATEGORIES[habit.category].label}</span>
                   <span>{habit.frequency === 'daily' ? 'Naponta' : 'Hetente'}</span>
                 </div>
               </div>
             </div>
             <ChevronRight className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
           </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-500">Nincs találat ebben a kategóriában.</div>
        )}
      </div>
    </div>
  );
};

const AnalyticsView: React.FC<{ habits: Habit[] }> = ({ habits }) => {
  // Heatmap generation (Last 3 months approx)
  const heatmapDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = toISODateLocal(d);
      const count = habits.filter(h => h.checkinsISO.includes(iso)).length;
      days.push({ date: iso, count });
    }
    return days;
  }, [habits]);

  const maxCount = Math.max(...heatmapDays.map(d => d.count), 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold">Analitika</h2>

      {/* Heatmap Card */}
      <div className="bg-white dark:bg-[#1c1f26] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 overflow-x-auto">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Aktivitási Hőtérkép (Utolsó 90 nap)</h3>
        <div className="flex gap-1 min-w-[600px]">
          {heatmapDays.map((d, i) => {
            const intensity = d.count / maxCount;
            let color = 'bg-gray-100 dark:bg-gray-800';
            if (d.count > 0) {
               if (intensity < 0.3) color = 'bg-indigo-200 dark:bg-indigo-900/40';
               else if (intensity < 0.6) color = 'bg-indigo-400 dark:bg-indigo-700/60';
               else color = 'bg-indigo-600 dark:bg-indigo-500';
            }
            return (
              <div 
                key={d.date} 
                className={`flex-1 h-24 rounded-sm ${color} transition-all hover:scale-y-110 origin-bottom relative group`}
              >
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                  {d.date}: {d.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1c1f26] border border-gray-200 dark:border-gray-800 rounded-3xl p-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Kategória Eloszlás</h3>
          <div className="space-y-3">
             {Object.entries(CATEGORIES).map(([key, cat]) => {
               const count = habits.filter(h => h.category === key).length;
               if (count === 0) return null;
               return (
                 <div key={key}>
                   <div className="flex justify-between text-sm mb-1">
                     <span className="font-medium flex items-center gap-2">
                       {React.createElement(cat.icon, { size: 14 })} {cat.label}
                     </span>
                     <span className="text-gray-500">{count} db</span>
                   </div>
                   <ProgressBar progress={(count / habits.length) * 100} colorClass={cat.color} />
                 </div>
               )
             })}
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsView: React.FC<{ habits: Habit[], setHabits: (h: Habit[]) => void }> = ({ habits, setHabits }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(habits));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `habit_lab_backup_${toISODateLocal(new Date())}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          if (confirm(`Sikeresen beolvasva ${parsed.length} szokás. Felülírod a jelenlegi adatokat?`)) {
            setHabits(parsed);
          }
        }
      } catch (err) {
        alert("Hibás fájlformátum!");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold">Beállítások</h2>
      
      <div className="bg-white dark:bg-[#1c1f26] border border-gray-200 dark:border-gray-800 rounded-3xl p-6">
        <h3 className="text-lg font-bold mb-4">Adatok Kezelése</h3>
        <p className="text-sm text-gray-500 mb-6">Mentsd le az adataidat biztonsági másolatként, vagy tölts vissza egy korábbi mentést.</p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors">
            <Download size={20} /> Exportálás (JSON)
          </button>
          
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold transition-colors">
            <Upload size={20} /> Importálás
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
        </div>
      </div>

       <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-2">Veszélyzóna</h3>
          <p className="text-sm text-rose-600/70 dark:text-rose-400/70 mb-4">Minden adat törlése. Ez a művelet nem vonható vissza.</p>
          <button 
            onClick={() => { if(confirm("Minden adatot törölni akarsz?")) setHabits([]); }}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={16} /> Összes adat törlése
          </button>
       </div>
    </div>
  );
};

// --- Modals ---

const CreateHabitModal: React.FC<{ onClose: () => void; onCreate: (h: Habit) => void }> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryType>('health');
  const [isTimed, setIsTimed] = useState(false);
  const [duration, setDuration] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onCreate({
      id: uid(),
      name,
      category,
      frequency: 'daily',
      targetPerWeek: 7,
      mastery: 0,
      createdAtISO: toISODateLocal(new Date()),
      checkinsISO: [],
      formationDays: 66,
      isTimed,
      defaultDurationMinutes: isTimed ? duration : 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#16181d] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Új Szokás</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20}/></button>
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Megnevezés</label>
            <input 
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Pl. Meditáció" 
              className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Kategória</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setCategory(key as CategoryType)}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                    category === key 
                      ? `${cat.color} text-white border-transparent` 
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {React.createElement(cat.icon, { size: 16 })}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl">
             <div className="flex items-center gap-3">
               <Timer size={20} className="text-indigo-500" />
               <div>
                 <div className="font-bold text-sm">Időzítő használata</div>
                 <div className="text-xs text-gray-500">Stopper a végrehajtáshoz</div>
               </div>
             </div>
             <div 
               onClick={() => setIsTimed(!isTimed)}
               className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isTimed ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'}`}
             >
               <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isTimed ? 'translate-x-6' : ''}`} />
             </div>
          </div>

          {isTimed && (
             <div>
               <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Időtartam (perc)</label>
               <input 
                 type="number"
                 value={duration}
                 onChange={e => setDuration(Number(e.target.value))}
                 className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3"
               />
             </div>
          )}

          <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30">
            Létrehozás
          </button>
        </form>
      </div>
    </div>
  );
};

const FocusTimerModal: React.FC<{ habit: Habit; onClose: () => void; onComplete: (seconds: number) => void }> = ({ habit, onClose, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState((habit.defaultDurationMinutes || 10) * 60);
  const [isActive, setIsActive] = useState(false);
  const initialTime = useRef((habit.defaultDurationMinutes || 10) * 60);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${pad2(m)}:${pad2(s)}`;
  };

  const progress = ((initialTime.current - timeLeft) / initialTime.current) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm text-center text-white">
        <h2 className="text-2xl font-bold mb-8">{habit.name}</h2>
        
        <div className="relative w-64 h-64 mx-auto mb-8 flex items-center justify-center">
          {/* Circular Progress SVG */}
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-700" />
            <circle 
              cx="128" cy="128" r="120" 
              stroke="currentColor" strokeWidth="8" fill="transparent" 
              className="text-indigo-500 transition-all duration-1000 ease-linear"
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
            />
          </svg>
          <div className="absolute text-6xl font-mono font-bold tracking-tighter">
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button onClick={() => setIsActive(!isActive)} className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
            {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </button>
          
          <button onClick={() => { setTimeLeft(initialTime.current); setIsActive(false); }} className="w-12 h-12 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700">
            <RotateCcw size={20} />
          </button>
        </div>

        <div className="mt-12 flex flex-col gap-3">
           <button 
             onClick={() => onComplete(initialTime.current - timeLeft)}
             className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl"
           >
             Kész ({Math.round((initialTime.current - timeLeft)/60)} perc)
           </button>
           <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Bezárás</button>
        </div>
      </div>
    </div>
  );
};

const HabitDetailModal: React.FC<{ habit: Habit; onClose: () => void; onUpdate: (id: string, p: Partial<Habit>) => void; onDelete: (id: string) => void }> = ({ habit, onClose, onUpdate, onDelete }) => {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#16181d] h-full shadow-2xl p-6 overflow-y-auto border-l border-gray-200 dark:border-gray-800 animate-in slide-in-from-right duration-300">
         <div className="flex justify-between items-start mb-6">
           <h2 className="text-2xl font-bold">{habit.name}</h2>
           <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20}/></button>
         </div>

         <div className="space-y-6">
           {/* Stats Overview */}
           <div className="grid grid-cols-2 gap-4">
             <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl text-center">
               <div className="text-xs font-bold uppercase text-gray-500 mb-1">Összesen</div>
               <div className="text-2xl font-black text-indigo-500">{habit.checkinsISO.length}</div>
             </div>
             <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl text-center">
               <div className="text-xs font-bold uppercase text-gray-500 mb-1">Streak</div>
               <div className="text-2xl font-black text-orange-500">{calculateStreak(habit.checkinsISO)}</div>
             </div>
           </div>

           {/* Mastery Slider */}
           <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
             <label className="flex justify-between text-sm font-bold mb-4">
                <span>Mastery (Tudásszint)</span>
                <span>{habit.mastery}%</span>
             </label>
             <input 
               type="range" 
               min="0" max="100" 
               value={habit.mastery} 
               onChange={(e) => onUpdate(habit.id, { mastery: Number(e.target.value) })}
               className="w-full accent-indigo-500" 
             />
           </div>

           {/* Editable Fields */}
           <div className="space-y-4">
             <div>
               <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Leírás</label>
               <textarea 
                 value={habit.description || ''}
                 onChange={e => onUpdate(habit.id, { description: e.target.value })}
                 className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 min-h-[100px]"
                 placeholder="Miért fontos ez?"
               />
             </div>
             
             <div>
               <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Kategória</label>
               <select 
                 value={habit.category}
                 onChange={e => onUpdate(habit.id, { category: e.target.value as CategoryType })}
                 className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3"
               >
                 {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
               </select>
             </div>
           </div>

           <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
             <button onClick={() => onDelete(habit.id)} className="w-full py-3 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 font-bold transition-colors">
               Szokás törlése
             </button>
           </div>
         </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
      active 
        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
    }`}
  >
    {React.cloneElement(icon, { size: 20, className: active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400' })}
    {label}
  </button>
);

const MobileTab: React.FC<{ active: boolean; onClick: () => void; icon: any }> = ({ active, onClick, icon }) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-xl transition-all ${
       active ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-400'
    }`}
  >
    {icon}
  </button>
);

// --- Helpers ---

function calculateStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort();
  const today = new Date();
  today.setHours(0,0,0,0);
  
  let streak = 0;
  let current = new Date(today);
  
  // Check if today is done, if not, check yesterday to start streak
  const todayISO = toISODateLocal(current);
  if (!dates.includes(todayISO)) {
    current.setDate(current.getDate() - 1);
  }

  while (true) {
    const iso = toISODateLocal(current);
    if (dates.includes(iso)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}