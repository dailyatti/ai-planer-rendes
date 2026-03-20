import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Target,
  Edit2,
  Trash2,
  Calendar,
  TrendingUp,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Gift,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Goal, PriorityLevel } from '../../types/planner';
import LinkifiedText from '../common/LinkifiedText';
import { Language, useLanguage } from '../../contexts/LanguageContext';

type ModalMode = 'create' | 'edit' | 'details' | null;

type GoalDraft = {
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  status: Goal['status'];
  priority: PriorityLevel;
  exchange: string;
  order: number | '';
};

const EMPTY_DRAFT: GoalDraft = {
  title: '',
  description: '',
  targetDate: '',
  progress: 0,
  status: 'not-started',
  priority: 'medium',
  exchange: '',
  order: '',
};

const localeMap: Record<Language, string> = {
  en: 'en-US',
  hu: 'hu-HU',
  ro: 'ro-RO',
  sk: 'sk-SK',
  hr: 'hr-HR',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pl: 'pl-PL',
  cn: 'zh-CN',
  jp: 'ja-JP',
  pt: 'pt-PT',
  tr: 'tr-TR',
  ar: 'ar-SA',
  ru: 'ru-RU',
  hi: 'hi-IN',
  bn: 'bn-BD',
  ur: 'ur-PK',
  th: 'th-TH',
  id: 'id-ID',
  ko: 'ko-KR',
};

const priorityOrder: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 };

const GoalsView: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useData();
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<ModalMode>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [draft, setDraft] = useState<GoalDraft>(EMPTY_DRAFT);

  const modalOpen = mode !== null;
  const activeGoal = selectedGoalId ? goals.find((goal) => goal.id === selectedGoalId) || null : null;
  const formatDate = (value?: Date) =>
    value
      ? new Intl.DateTimeFormat(localeMap[language] || 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).format(new Date(value))
      : '';

  const filteredGoals = useMemo(
    () =>
      goals
        .filter((goal) => (filterStatus === 'all' ? true : goal.status === filterStatus))
        .filter((goal) => (filterPriority === 'all' ? true : (goal.priority || 'medium') === filterPriority))
        .sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
          if (a.order !== undefined) return -1;
          if (b.order !== undefined) return 1;
          const priorityDelta = priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
          if (priorityDelta !== 0) return priorityDelta;
          const aDate = a.targetDate ? new Date(a.targetDate).getTime() : Number.POSITIVE_INFINITY;
          const bDate = b.targetDate ? new Date(b.targetDate).getTime() : Number.POSITIVE_INFINITY;
          return aDate - bDate;
        }),
    [filterPriority, filterStatus, goals],
  );

  const stats = useMemo(
    () => ({
      total: goals.length,
      completed: goals.filter((goal) => goal.status === 'completed').length,
      active: goals.filter((goal) => goal.status === 'in-progress').length,
      paused: goals.filter((goal) => goal.status === 'paused').length,
    }),
    [goals],
  );

  const completionRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statusMeta: Record<Goal['status'], { label: string; icon: JSX.Element; chip: string; panel: string }> = {
    'not-started': {
      label: t('goals.filterNotStarted'),
      icon: <RotateCcw size={18} className="text-slate-400" />,
      chip: 'border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-700 dark:text-slate-300',
      panel: 'border-slate-300/70 bg-slate-500/10 dark:border-slate-700 dark:bg-slate-700/30',
    },
    'in-progress': {
      label: t('goals.filterInProgress'),
      icon: <Play size={18} className="text-sky-500" />,
      chip: 'border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
      panel: 'border-sky-400/30 bg-sky-500/10',
    },
    paused: {
      label: t('goals.filterPaused'),
      icon: <Pause size={18} className="text-amber-500" />,
      chip: 'border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      panel: 'border-amber-400/30 bg-amber-500/10',
    },
    completed: {
      label: t('goals.filterCompleted'),
      icon: <CheckCircle size={18} className="text-emerald-500" />,
      chip: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      panel: 'border-emerald-400/30 bg-emerald-500/10',
    },
  };

  const priorityMeta: Record<PriorityLevel, { label: string; icon: JSX.Element; chip: string }> = {
    high: {
      label: t('priority.high'),
      icon: <ArrowUp size={16} className="text-rose-500" />,
      chip: 'border-rose-400/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    },
    medium: {
      label: t('priority.medium'),
      icon: <ArrowRight size={16} className="text-amber-500" />,
      chip: 'border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    low: {
      label: t('priority.low'),
      icon: <ArrowDown size={16} className="text-cyan-500" />,
      chip: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    },
  };

  useEffect(() => {
    if (!modalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [modalOpen]);

  const getDaysUntilTarget = (targetDate?: Date) => {
    if (!targetDate) return null;
    const now = new Date();
    const target = new Date(targetDate);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const syncStatusFromProgress = (status: Goal['status'], progress: number): Goal['status'] => {
    if (progress >= 100) return 'completed';
    if (progress > 0 && status === 'not-started') return 'in-progress';
    if (progress < 100 && status === 'completed') return 'in-progress';
    if (progress <= 0 && status === 'completed') return 'not-started';
    return status;
  };

  const resetDraft = () => setDraft(EMPTY_DRAFT);
  const closeModal = () => {
    setMode(null);
    setIsFullscreen(false);
    setSelectedGoalId(null);
    resetDraft();
  };

  const openCreate = () => {
    resetDraft();
    setSelectedGoalId(null);
    setIsFullscreen(false);
    setMode('create');
  };

  const openDetails = (goal: Goal) => {
    setSelectedGoalId(goal.id);
    setIsFullscreen(false);
    setMode('details');
  };

  const openEdit = (goal: Goal) => {
    setDraft({
      title: goal.title,
      description: goal.description,
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
      progress: goal.progress,
      status: goal.status,
      priority: goal.priority || 'medium',
      exchange: goal.exchange || '',
      order: goal.order ?? '',
    });
    setSelectedGoalId(goal.id);
    setMode('edit');
  };

  const removeGoal = (goalId: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    deleteGoal(goalId);
    if (selectedGoalId === goalId) closeModal();
  };

  const updateProgress = (goal: Goal, progress: number) => {
    const nextProgress = Math.max(0, Math.min(100, progress));
    updateGoal(goal.id, {
      progress: nextProgress,
      status: syncStatusFromProgress(goal.status, nextProgress),
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload: Omit<Goal, 'id' | 'createdAt'> = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      targetDate: draft.targetDate ? new Date(draft.targetDate) : undefined,
      progress: draft.progress,
      status: syncStatusFromProgress(draft.status, draft.progress),
      priority: draft.priority,
      exchange: draft.exchange.trim() || undefined,
      order: draft.order === '' ? undefined : Number(draft.order),
    };
    if (mode === 'edit' && selectedGoalId) {
      updateGoal(selectedGoalId, payload);
      setMode('details');
      return;
    }
    addGoal(payload);
    closeModal();
  };

  return (
    <div className="view-container mx-auto space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-2xl shadow-teal-500/10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.2),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_30%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-teal-700 dark:text-teal-300">
              <Sparkles size={14} />
              {t('goals.title')}
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-500 p-4 text-white shadow-xl shadow-teal-500/25">
                <Target size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{t('goals.title')}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">{t('goals.subtitle')}</p>
              </div>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3.5 font-semibold text-white shadow-xl shadow-teal-500/30 transition-all duration-200 hover:scale-[1.01] hover:shadow-teal-500/40 active:scale-[0.99]"
          >
            <Plus size={20} />
            {t('goals.newGoal')}
          </button>
        </div>

        <div className="relative mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.75rem] bg-gradient-to-br from-teal-500 to-cyan-500 p-5 text-white shadow-lg shadow-teal-500/20">
            <div className="text-sm font-medium text-white/85">{t('goals.totalGoals')}</div>
            <div className="mt-2 text-3xl font-black">{stats.total}</div>
          </div>
          <div className="rounded-[1.75rem] bg-gradient-to-br from-sky-500 to-indigo-500 p-5 text-white shadow-lg shadow-sky-500/20">
            <div className="text-sm font-medium text-white/85">{t('goals.completionRate')}</div>
            <div className="mt-2 text-3xl font-black">{completionRate}%</div>
          </div>
          <div className="rounded-[1.75rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 p-5 text-white shadow-lg shadow-violet-500/20">
            <div className="text-sm font-medium text-white/85">{t('goals.active')}</div>
            <div className="mt-2 text-3xl font-black">{stats.active}</div>
          </div>
          <div className="rounded-[1.75rem] bg-gradient-to-br from-emerald-500 to-green-500 p-5 text-white shadow-lg shadow-emerald-500/20">
            <div className="text-sm font-medium text-white/85">{t('goals.filterPaused')}</div>
            <div className="mt-2 text-3xl font-black">{stats.paused}</div>
          </div>
        </div>
      </section>

      <section className="card-glass space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('common.details')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{filteredGoals.length} / {stats.total}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
            >
              <option value="all">{t('goals.filterAll')}</option>
              <option value="not-started">{t('goals.filterNotStarted')}</option>
              <option value="in-progress">{t('goals.filterInProgress')}</option>
              <option value="paused">{t('goals.filterPaused')}</option>
              <option value="completed">{t('goals.filterCompleted')}</option>
            </select>
            <select
              value={filterPriority}
              onChange={(event) => setFilterPriority(event.target.value)}
              className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
            >
              <option value="all">{t('priority.all')}</option>
              <option value="high">{t('priority.high')}</option>
              <option value="medium">{t('priority.medium')}</option>
              <option value="low">{t('priority.low')}</option>
            </select>
          </div>
        </div>

        {filteredGoals.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300/80 bg-slate-50/70 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <Target className="mx-auto mb-4 text-slate-400" size={48} />
            <p className="mx-auto mb-5 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
              {filterStatus === 'all' && filterPriority === 'all' ? t('goals.noGoalsDefined') : t('goals.noGoalsStatus')}
            </p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:scale-[1.01]"
            >
              <Plus size={18} />
              {t('goals.defineFirstGoal')}
            </button>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredGoals.map((goal) => {
              const priority = priorityMeta[goal.priority || 'medium'];
              const status = statusMeta[goal.status];
              const daysUntilTarget = getDaysUntilTarget(goal.targetDate);
              const deadlineText =
                daysUntilTarget === null
                  ? t('goals.noDeadline')
                  : daysUntilTarget > 0
                    ? `${daysUntilTarget} ${t('goals.daysLeft')}`
                    : daysUntilTarget === 0
                      ? t('goals.dueToday')
                      : `${Math.abs(daysUntilTarget)} ${t('goals.overdue')}`;

              return (
                <article
                  key={goal.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetails(goal)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openDetails(goal);
                    }
                  }}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-6 text-left shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-2xl hover:shadow-teal-500/10 dark:border-slate-800 dark:bg-slate-900/85 dark:hover:border-teal-500/40"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 opacity-80" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${status.chip}`}>{status.icon}{status.label}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${priority.chip}`}>{priority.icon}{priority.label}</span>
                      </div>
                      <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                        {goal.order !== undefined && <span className="mr-2 text-teal-500">#{goal.order}</span>}
                        {goal.title}
                      </h3>
                      {goal.description && <div className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300"><LinkifiedText text={goal.description} /></div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(goal); }} className="rounded-2xl border border-slate-200/80 p-3 text-slate-500 transition hover:border-sky-300 hover:bg-sky-500/10 hover:text-sky-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:text-sky-300" aria-label={t('common.edit')}><Edit2 size={18} /></button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); removeGoal(goal.id); }} className="rounded-2xl border border-slate-200/80 p-3 text-slate-500 transition hover:border-rose-300 hover:bg-rose-500/10 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-500/40 dark:hover:text-rose-300" aria-label={t('common.delete')}><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${status.panel}`}>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Calendar size={16} />
                        <span>{goal.targetDate ? `${t('goals.target')}: ${formatDate(goal.targetDate)}` : t('goals.noDeadline')}</span>
                      </div>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${daysUntilTarget !== null && daysUntilTarget < 0 && goal.status !== 'completed' ? 'border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'border-slate-200/80 bg-slate-50/70 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300'}`}>
                      <div className="flex items-center gap-2"><TrendingUp size={16} /><span>{deadlineText}</span></div>
                    </div>
                  </div>
                  {goal.exchange && (
                    <div className="mt-4 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4 text-sm text-violet-700 dark:text-violet-300">
                      <div className="mb-2 flex items-center gap-2 font-semibold"><Gift size={16} />{t('goals.exchange')}</div>
                      <LinkifiedText text={goal.exchange} />
                    </div>
                  )}
                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{t('goals.progress')}</span>
                      <span className="font-black text-teal-600 dark:text-teal-300">{goal.progress}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 transition-all duration-500" style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      
      {modalOpen && (
        <div className={`fixed inset-0 z-[10020] bg-slate-950/70 backdrop-blur-md ${isFullscreen ? 'p-0' : 'p-3 sm:p-5 lg:p-6'}`} onClick={closeModal}>
          <div
            onClick={(event) => event.stopPropagation()}
            className={`mx-auto flex h-full w-full flex-col overflow-hidden border border-white/10 bg-white/95 shadow-2xl shadow-slate-950/40 dark:bg-slate-950/95 ${isFullscreen ? 'max-w-none rounded-none' : 'max-w-6xl rounded-[2rem]'}`}
          >
            <div className="border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  {activeGoal && mode === 'details' && (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta[activeGoal.status].chip}`}>{statusMeta[activeGoal.status].icon}{statusMeta[activeGoal.status].label}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${priorityMeta[activeGoal.priority || 'medium'].chip}`}>{priorityMeta[activeGoal.priority || 'medium'].icon}{priorityMeta[activeGoal.priority || 'medium'].label}</span>
                    </div>
                  )}
                  <h3 className="truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    {mode === 'create' ? t('goals.createGoal') : mode === 'edit' ? t('goals.editGoal') : activeGoal?.title || t('goals.title')}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{mode === 'details' ? t('goals.subtitle') : t('goals.placeholderDesc')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {mode === 'details' && activeGoal && (
                    <button type="button" onClick={() => openEdit(activeGoal)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-500/10 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-sky-500/40 dark:hover:text-sky-300">
                      <Edit2 size={16} />
                      {t('common.edit')}
                    </button>
                  )}
                  <button type="button" onClick={() => setIsFullscreen((current) => !current)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-500/10 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-teal-500/40 dark:hover:text-teal-300">
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    <span className="hidden sm:inline">{isFullscreen ? t('common.exitFullscreen') : t('common.fullscreen')}</span>
                  </button>
                  <button type="button" onClick={closeModal} className="inline-flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 p-2.5 text-slate-700 transition hover:border-rose-300 hover:bg-rose-500/10 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-rose-500/40 dark:hover:text-rose-300" aria-label={t('common.close')}>
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid flex-1 overflow-hidden lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
              {mode === 'details' && activeGoal ? (
                <>
                  <div className="hide-scrollbar overflow-y-auto border-b border-slate-200/80 px-4 py-5 dark:border-slate-800 lg:border-b-0 lg:border-r lg:px-6 lg:py-6">
                    <div className="space-y-5">
                      <div className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white to-teal-50/80 p-6 shadow-lg shadow-teal-500/5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 p-3 text-white shadow-lg shadow-teal-500/30"><Target size={22} /></div>
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">{t('common.details')}</div>
                            <div className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{activeGoal.title}</div>
                          </div>
                        </div>
                        {activeGoal.description && <div className="rounded-2xl bg-white/70 p-4 text-sm leading-7 text-slate-700 shadow-sm dark:bg-slate-950/50 dark:text-slate-200"><LinkifiedText text={activeGoal.description} /></div>}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className={`rounded-[1.5rem] border p-5 ${statusMeta[activeGoal.status].panel}`}>
                          <div className="mb-3 flex items-center gap-3">{statusMeta[activeGoal.status].icon}<div><div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{t('goals.status')}</div><div className="text-lg font-bold text-slate-950 dark:text-white">{statusMeta[activeGoal.status].label}</div></div></div>
                          <select value={activeGoal.status} onChange={(event) => updateGoal(activeGoal.id, { status: event.target.value as Goal['status'] })} className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
                            {(['not-started', 'in-progress', 'paused', 'completed'] as Goal['status'][]).map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}
                          </select>
                        </div>

                        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="mb-3 flex items-center gap-3"><div className={`rounded-full p-2 ${priorityMeta[activeGoal.priority || 'medium'].chip}`}>{priorityMeta[activeGoal.priority || 'medium'].icon}</div><div><div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{t('priority.label')}</div><div className="text-lg font-bold text-slate-950 dark:text-white">{priorityMeta[activeGoal.priority || 'medium'].label}</div></div></div>
                          <div className="grid gap-2">
                            {(['high', 'medium', 'low'] as PriorityLevel[]).map((priority) => (
                              <button key={priority} type="button" onClick={() => updateGoal(activeGoal.id, { priority })} className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${(activeGoal.priority || 'medium') === priority ? priorityMeta[priority].chip : 'border-slate-200/80 bg-slate-50/80 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-slate-500'}`}>{priorityMeta[priority].icon}{priorityMeta[priority].label}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400"><Calendar size={14} />{t('goals.targetDate')}</div>
                          <div className="text-lg font-bold text-slate-950 dark:text-white">{activeGoal.targetDate ? formatDate(activeGoal.targetDate) : t('goals.noDeadline')}</div>
                        </div>
                        <div className={`rounded-[1.5rem] border p-5 ${getDaysUntilTarget(activeGoal.targetDate) !== null && getDaysUntilTarget(activeGoal.targetDate)! < 0 && activeGoal.status !== 'completed' ? 'border-rose-400/30 bg-rose-500/10' : 'border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70'}`}>
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400"><TrendingUp size={14} />{t('goals.progress')}</div>
                          <div className="text-lg font-bold text-slate-950 dark:text-white">
                            {(() => {
                              const days = getDaysUntilTarget(activeGoal.targetDate);
                              if (days === null) return t('goals.noDeadline');
                              if (days > 0) return `${days} ${t('goals.daysLeft')}`;
                              if (days === 0) return t('goals.dueToday');
                              return `${Math.abs(days)} ${t('goals.overdue')}`;
                            })()}
                          </div>
                        </div>
                      </div>

                      {activeGoal.exchange && (
                        <div className="rounded-[1.75rem] border border-violet-400/25 bg-violet-500/10 p-5">
                          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300"><Gift size={16} />{t('goals.exchange')}</div>
                          <div className="text-sm leading-7 text-violet-800 dark:text-violet-200"><LinkifiedText text={activeGoal.exchange} /></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <aside className="hide-scrollbar overflow-y-auto px-4 py-5 dark:bg-slate-950/60 lg:px-6 lg:py-6">
                    <div className="space-y-5">
                      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="mb-4 flex items-center justify-between">
                          <div><div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{t('goals.progress')}</div><div className="mt-1 text-3xl font-black text-teal-600 dark:text-teal-300">{activeGoal.progress}%</div></div>
                          <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 p-3 text-white shadow-lg shadow-teal-500/25"><TrendingUp size={20} /></div>
                        </div>
                        <div className="mb-4 h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 transition-all duration-500" style={{ width: `${activeGoal.progress}%` }} /></div>
                        <input type="range" min="0" max="100" step="5" value={activeGoal.progress} onChange={(event) => updateProgress(activeGoal, Number(event.target.value))} className="w-full cursor-pointer accent-teal-500" />
                      </div>

                      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="grid gap-3">
                          <button type="button" onClick={() => updateProgress(activeGoal, activeGoal.progress - 10)} disabled={activeGoal.progress <= 0} className="rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition disabled:cursor-not-allowed disabled:opacity-40">-10%</button>
                          <button type="button" onClick={() => updateProgress(activeGoal, activeGoal.progress + 10)} disabled={activeGoal.progress >= 100} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition disabled:cursor-not-allowed disabled:opacity-40">+10%</button>
                          {activeGoal.progress < 100 && <button type="button" onClick={() => updateGoal(activeGoal.id, { progress: 100, status: 'completed' })} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition"><CheckCircle size={16} />{t('goals.complete')}</button>}
                          <button type="button" onClick={() => openEdit(activeGoal)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-500/10 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-sky-500/40 dark:hover:text-sky-300"><Edit2 size={16} />{t('goals.editGoal')}</button>
                          <button type="button" onClick={() => removeGoal(activeGoal.id)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/15 dark:text-rose-300"><Trash2 size={16} />{t('common.delete')}</button>
                        </div>
                      </div>
                    </div>
                  </aside>
                </>
              ) : (
                <form onSubmit={submit} className="contents">
                  <div className="hide-scrollbar overflow-y-auto border-b border-slate-200/80 px-4 py-5 dark:border-slate-800 lg:border-b-0 lg:border-r lg:px-6 lg:py-6">
                    <div className="space-y-5">
                      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('goals.goalTitle')}</label>
                        <input type="text" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder={t('goals.placeholderTitle')} required />
                      </div>
                      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('goals.goalDescription')}</label>
                        <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="min-h-[220px] w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" placeholder={t('goals.placeholderDesc')} />
                      </div>
                      <div className="rounded-[1.75rem] border border-violet-400/20 bg-violet-500/10 p-5 shadow-lg shadow-violet-500/5">
                        <label className="mb-2 block text-sm font-semibold text-violet-700 dark:text-violet-300">{t('goals.exchange')} <span className="font-normal text-violet-500/80">({t('common.optional')})</span></label>
                        <textarea value={draft.exchange} onChange={(event) => setDraft((current) => ({ ...current, exchange: event.target.value }))} className="min-h-[120px] w-full rounded-2xl border border-violet-300/40 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-violet-500/20 dark:bg-slate-950/70 dark:text-slate-200" placeholder={t('goals.exchangePlaceholder')} />
                      </div>
                    </div>
                  </div>

                  <aside className="hide-scrollbar overflow-y-auto px-4 py-5 dark:bg-slate-950/60 lg:px-6 lg:py-6">
                    <div className="space-y-5">
                      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
                        <label className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('priority.label')}</label>
                        <div className="grid gap-3">
                          {(['high', 'medium', 'low'] as PriorityLevel[]).map((priority) => (
                            <button key={priority} type="button" onClick={() => setDraft((current) => ({ ...current, priority }))} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${draft.priority === priority ? priorityMeta[priority].chip : 'border-slate-200/80 bg-white/70 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-500'}`}>{priorityMeta[priority].icon}<span className="font-semibold">{priorityMeta[priority].label}</span></button>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('goals.targetDate')} <span className="font-normal text-slate-400">({t('common.optional')})</span></label>
                        <input type="date" value={draft.targetDate} onChange={(event) => setDraft((current) => ({ ...current, targetDate: event.target.value }))} className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                      </div>
                      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('goals.progress')}: <span className="font-black text-teal-600 dark:text-teal-300">{draft.progress}%</span></label>
                        <input type="range" min="0" max="100" step="5" value={draft.progress} onChange={(event) => setDraft((current) => ({ ...current, progress: Number(event.target.value), status: syncStatusFromProgress(current.status, Number(event.target.value)) }))} className="w-full cursor-pointer accent-teal-500" />
                      </div>
                      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('goals.status')}</label>
                        <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Goal['status'] }))} className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                          {(['not-started', 'in-progress', 'paused', 'completed'] as Goal['status'][]).map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}
                        </select>
                      </div>
                      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('common.order')} <span className="font-normal text-slate-400">({t('common.optional')})</span></label>
                        <input type="number" value={draft.order} onChange={(event) => setDraft((current) => ({ ...current, order: event.target.value ? Number(event.target.value) : '' }))} className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="1" />
                      </div>
                      <div className="grid gap-3">
                        <button type="submit" className="rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-teal-500/30 transition hover:scale-[1.01]">{mode === 'edit' ? t('common.update') : t('common.save')}</button>
                        <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-slate-500">{t('common.cancel')}</button>
                      </div>
                    </div>
                  </aside>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsView;
