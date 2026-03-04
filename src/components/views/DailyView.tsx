import React, { useState, useCallback, useRef } from 'react';
import { Plus, Calendar, CheckCircle, Circle, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Reorder, useDragControls, AnimatePresence, motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PlanItem } from '../../types/planner';
import LinkifiedText from '../common/LinkifiedText';

/* ─── Reorderable Task Card ─── */
const TaskCard: React.FC<{
  plan: PlanItem;
  index: number;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (plan: PlanItem) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
}> = ({ plan, index, onToggle, onEdit, onDelete, t }) => {
  const dragControls = useDragControls();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    // Allow exit animation to play before actually deleting
    setTimeout(() => onDelete(plan.id), 280);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-900/15 dark:to-gray-800';
      case 'medium': return 'border-l-amber-500 bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/15 dark:to-gray-800';
      case 'low': return 'border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900/15 dark:to-gray-800';
      default: return 'border-l-gray-500 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/15 dark:to-gray-800';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800';
      case 'low': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800';
      default: return '';
    }
  };

  return (
    <Reorder.Item
      value={plan}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{
        opacity: isDeleting ? 0 : 1,
        y: isDeleting ? -10 : 0,
        scale: isDeleting ? 0.92 : 1,
        height: isDeleting ? 0 : 'auto',
      }}
      exit={{ opacity: 0, y: -10, scale: 0.92, height: 0 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 30,
        delay: isDeleting ? 0 : index * 0.04,
        height: { duration: 0.25 },
      }}
      layout
      className={`rounded-xl border-l-4 ${getPriorityColor(plan.priority)} shadow-sm hover:shadow-md bg-white dark:bg-gray-800 overflow-hidden`}
      style={{ marginBottom: isDeleting ? 0 : undefined }}
    >
      <div className="p-5 flex items-start gap-3">
        {/* Drag Handle */}
        <motion.div
          className="mt-1 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing rounded-md p-1 -ml-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onPointerDown={(e) => dragControls.start(e)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
        >
          <GripVertical size={18} />
        </motion.div>

        {/* Checkbox */}
        <motion.button
          onClick={() => onToggle(plan.id, !plan.completed)}
          className={`mt-0.5 flex-shrink-0 ${plan.completed ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600 hover:text-emerald-400'} transition-colors`}
          whileTap={{ scale: 0.8 }}
        >
          <AnimatePresence mode="wait">
            {plan.completed ? (
              <motion.div
                key="checked"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <CheckCircle size={22} />
              </motion.div>
            ) : (
              <motion.div
                key="unchecked"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Circle size={22} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={`text-lg font-semibold leading-snug transition-all duration-300 ${plan.completed
                ? 'line-through text-gray-400 dark:text-gray-500'
                : 'text-gray-900 dark:text-white'
              }`}
          >
            {plan.title}
          </h4>

          <AnimatePresence>
            {plan.description && !plan.completed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <LinkifiedText
                  text={plan.description}
                  className="text-gray-500 dark:text-gray-400 text-sm mt-1.5 leading-relaxed"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 mt-2.5">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getPriorityBadge(plan.priority)}`}>
              {plan.priority === 'high' ? t('daily.highPriority') :
                plan.priority === 'medium' ? t('daily.mediumPriority') :
                  t('daily.lowPriority')}
            </span>
            {!plan.date && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800">
                Általános
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          <motion.button
            onClick={() => onEdit(plan)}
            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Edit2 size={16} />
          </motion.button>
          <motion.button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Trash2 size={16} />
          </motion.button>
        </div>
      </div>
    </Reorder.Item>
  );
};

/* ─── DailyView ─── */
const DailyView: React.FC = () => {
  const { plans, addPlan, updatePlan, deletePlan } = useData();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [useDate, setUseDate] = useState(false);
  const [newPlan, setNewPlan] = useState<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>({
    title: '',
    description: '',
    priority: 'medium',
  });

  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  const dayPlans = plans.filter(plan =>
    !plan.date || plan.date.toISOString().split('T')[0] === selectedDateStr
  ).sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    if (a.priority === b.priority) return 0;
    if (a.priority === 'high') return -1;
    if (b.priority === 'high') return 1;
    if (a.priority === 'medium') return -1;
    return 1;
  });

  const completedCount = dayPlans.filter(plan => plan.completed).length;
  const completionRate = dayPlans.length > 0 ? (completedCount / dayPlans.length) * 100 : 0;

  // Debounced reorder to prevent excessive writes
  const reorderTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleReorder = useCallback((newOrder: PlanItem[]) => {
    if (reorderTimer.current) clearTimeout(reorderTimer.current);
    reorderTimer.current = setTimeout(() => {
      newOrder.forEach((plan, index) => {
        updatePlan(plan.id, { order: index });
      });
    }, 100);
  }, [updatePlan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      updatePlan(editingId, {
        title: newPlan.title,
        description: newPlan.description,
        priority: newPlan.priority,
        date: useDate ? selectedDate : null,
      });
      setEditingId(null);
    } else {
      addPlan({
        title: newPlan.title,
        description: newPlan.description,
        date: useDate ? selectedDate : null,
        completed: false,
        priority: newPlan.priority,
        linkedNotes: [],
      });
    }

    setNewPlan({ title: '', description: '', priority: 'medium' });
    setUseDate(false);
    setShowAddForm(false);
  };

  const handleEdit = (plan: PlanItem) => {
    setNewPlan({
      title: plan.title,
      description: plan.description,
      priority: plan.priority,
    });
    setUseDate(!!plan.date);
    if (plan.date) setSelectedDate(plan.date);
    setEditingId(plan.id);
    setShowAddForm(true);
  };

  const handleToggle = useCallback((id: string, completed: boolean) => {
    updatePlan(id, { completed });
  }, [updatePlan]);

  const progressBarWidth = `${Math.round(completionRate)}%`;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Calendar className="text-emerald-500" size={32} />
              {t('daily.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">
              {t('daily.subtitle')}
            </p>
          </div>

          <motion.button
            onClick={() => {
              setNewPlan({ title: '', description: '', priority: 'medium' });
              setUseDate(false);
              setEditingId(null);
              setShowAddForm(true);
            }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 font-medium"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={20} />
            {t('daily.newTask')}
          </motion.button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              {t('daily.selectDate')}
            </label>
            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
            />
          </div>

          <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl p-5 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
            <div className="relative">
              <div className="text-sm font-medium opacity-90 mb-1">{t('daily.completion')}</div>
              <div className="text-3xl font-bold tracking-tight">{Math.round(completionRate)}%</div>
              <div className="text-sm opacity-80 mt-0.5">{completedCount}/{dayPlans.length} {t('daily.tasks')}</div>
              <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: progressBarWidth }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowAddForm(false);
              setEditingId(null);
              setNewPlan({ title: '', description: '', priority: 'medium' });
              setUseDate(false);
            }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5">
                {editingId ? t('daily.editTask') : t('daily.addTask')}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('daily.taskTitle')}
                  </label>
                  <input
                    type="text"
                    value={newPlan.title}
                    onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                    required
                    placeholder={t('daily.taskPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('daily.taskDescription')}
                  </label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                    rows={3}
                    placeholder={t('daily.descriptionPlaceholder')}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useDate}
                      onChange={(e) => setUseDate(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Dátumhoz kötés (Optional date)
                  </label>
                  <AnimatePresence>
                    {useDate && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <input
                          type="date"
                          value={selectedDateStr}
                          onChange={(e) => setSelectedDate(new Date(e.target.value))}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 mt-1"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('daily.priority')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setNewPlan({ ...newPlan, priority: level })}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${newPlan.priority === level
                            ? level === 'high'
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                              : level === 'medium'
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                            : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                          }`}
                      >
                        {level === 'high' ? t('daily.highPriority') :
                          level === 'medium' ? t('daily.mediumPriority') :
                            t('daily.lowPriority')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <motion.button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 px-4 rounded-xl font-medium shadow-md"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {editingId ? t('common.update') : t('daily.addTask')}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingId(null);
                      setNewPlan({ title: '', description: '', priority: 'medium' });
                      setUseDate(false);
                    }}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 px-4 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t('common.cancel')}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      <Reorder.Group axis="y" values={dayPlans} onReorder={handleReorder} className="space-y-3">
        <AnimatePresence mode="popLayout">
          {dayPlans.map((plan, index) => (
            <TaskCard
              key={plan.id}
              plan={plan}
              index={index}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={deletePlan}
              t={t}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {dayPlans.length === 0 && (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Calendar className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
          <p className="text-gray-400 dark:text-gray-500 text-lg font-medium">
            Nincsenek tervek. Kattints az "Új feladat" gombra a kezdéshez!
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default DailyView;