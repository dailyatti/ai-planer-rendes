import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useLanguage, LANGUAGE_NAMES } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { AIService } from '../services/AIService';
import { DEFAULT_AI_PERMISSIONS } from '../config/aiDefaults';
import { AIConfig } from '../types/ai';
import { AssistantAction, AssistantPlan } from '../types/assistant';
import {
  buildAssistantPlanningPrompt,
  extractAssistantPlan,
  inferLocalAssistantPlan,
} from '../utils/assistantPlan';

interface VoiceAssistantProps {
  config: AIConfig;
  onCommand?: (command: unknown) => void;
  currentLanguage: string;
  currentView: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  config,
  onCommand,
  currentLanguage,
  currentView,
}) => {
  const { t } = useLanguage();
  const {
    plans,
    goals,
    notes,
    transactions,
    subscriptions,
    addPlan,
    addGoal,
    addNote,
    addTransaction,
    updatePlan,
    updateGoal,
    updateTransaction,
    invoices,
    clients,
  } = useData();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isConfigured = config.provider === 'deepseek' && Boolean(config.apiKey);

  useEffect(() => {
    if (open) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const addMessage = useCallback((role: ChatMessage['role'], text: string) => {
    setMessages((prev) => [...prev, { role, text, timestamp: Date.now() }]);
  }, []);

  const buildSnapshot = useCallback(() => {
    const languageName = LANGUAGE_NAMES[currentLanguage as keyof typeof LANGUAGE_NAMES] || 'English';
    const permissions = { ...DEFAULT_AI_PERMISSIONS, ...config.permissions };
    const totalTasks = plans.length;
    const completedTasks = plans.filter((plan) => plan.completed).length;
    const totalGoals = goals.length;
    const avgGoalProgress = totalGoals
      ? Math.round(goals.reduce((sum, goal) => sum + Number(goal.progress || 0), 0) / totalGoals)
      : 0;
    const balance = Math.round(
      transactions.reduce(
        (sum, tx) => sum + (tx.type === 'income' ? Math.abs(Number(tx.amount || 0)) : -Math.abs(Number(tx.amount || 0))),
        0,
      ),
    );

    const sections = [`Language: ${languageName}
Current app view: ${currentView}
- Available data is restricted by the permissions selected in Integrations.`];

    if (permissions.plannerContext) {
      sections.push(`Planner summary:
- Tasks: ${completedTasks}/${totalTasks} completed
- Goals: ${totalGoals} total, average progress ${avgGoalProgress}%
- Open tasks: ${JSON.stringify(plans.filter((plan) => !plan.completed).slice(0, 20).map((plan) => ({
  title: plan.title,
  date: plan.date instanceof Date ? plan.date.toISOString() : plan.date,
  priority: plan.priority,
})))}
- Goals: ${JSON.stringify(goals.slice(0, 15).map((goal) => ({
  title: goal.title,
  progress: goal.progress,
  status: goal.status,
  targetDate: goal.targetDate instanceof Date ? goal.targetDate.toISOString() : goal.targetDate,
})))}
- Recent notes: ${JSON.stringify(notes.slice(-10).map((note) => ({
  title: note.title,
  content: note.content.slice(0, 300),
})))}`);
    }

    if (permissions.financialContext) {
      sections.push(`Financial summary:
- Balance estimate: ${balance}
- Budget currency: ${transactions.find((item) => item.currency)?.currency || 'USD'}
- Bills and subscriptions: ${JSON.stringify(transactions
  .filter((item) => item.expenseKind === 'bill' || item.expenseKind === 'subscription')
  .slice(-25)
  .map((item) => ({
    description: item.description,
    payee: item.payee,
    amount: Math.abs(Number(item.amount || 0)),
    currency: item.currency,
    kind: item.expenseKind,
    dueDate: item.dueDateYMD || item.effectiveDateYMD,
    paymentStatus: item.paymentStatus,
    autoPay: item.autoPay,
  })))}
- Legacy subscriptions: ${JSON.stringify(subscriptions.slice(0, 15).map((item) => ({
  name: item.name,
  cost: item.cost,
  currency: item.currency,
  billingCycle: item.billingCycle,
  nextPayment: item.nextPayment,
  active: item.isActive,
})))}`);
    }

    if (permissions.invoicingContext) {
      sections.push(`Invoicing summary:
- Invoices: ${JSON.stringify(invoices.slice(-20).map((invoice) => ({
  number: invoice.invoiceNumber,
  client: clients.find((client) => client.id === invoice.clientId)?.name || 'Unknown client',
  total: invoice.total,
  currency: invoice.currency,
  status: invoice.status,
  dueDate: invoice.dueDate,
})))}`);
    }

    return sections.join('\n\n');
  }, [clients, config.permissions, currentLanguage, currentView, goals, invoices, notes, plans, subscriptions, transactions]);

  const formatDateTime = useCallback((date: Date): string => {
    try {
      return new Intl.DateTimeFormat(currentLanguage === 'hu' ? 'hu-HU' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return date.toLocaleString();
    }
  }, [currentLanguage]);

  const buildExecutionReply = useCallback((action: AssistantAction, details?: string): string => {
    const hu = currentLanguage === 'hu';
    const de = currentLanguage === 'de';
    switch (action.type) {
      case 'navigation':
        return hu ? `Megnyitottam: ${action.target}.` : de ? `Geöffnet: ${action.target}.` : `Opened: ${action.target}.`;
      case 'create_task':
        return hu
          ? `Felvettem a feladatot: ${action.data.title}${details ? ` (${details})` : ''}.`
          : de
            ? `Aufgabe erstellt: ${action.data.title}${details ? ` (${details})` : ''}.`
            : `Created task: ${action.data.title}${details ? ` (${details})` : ''}.`;
      case 'create_note':
        return hu ? `Létrehoztam a jegyzetet: ${action.data.title}.` : de ? `Notiz erstellt: ${action.data.title}.` : `Created note: ${action.data.title}.`;
      case 'create_goal':
        return hu ? `Létrehoztam a célt: ${action.data.title}.` : de ? `Ziel erstellt: ${action.data.title}.` : `Created goal: ${action.data.title}.`;
      case 'create_transaction':
        return hu
          ? `Rögzítettem a ${action.data.type === 'income' ? 'bevételt' : 'kiadást'}: ${action.data.amount} ${action.data.currency || 'USD'}.`
          : de
            ? `${action.data.type === 'income' ? 'Einnahme' : 'Ausgabe'} erfasst: ${action.data.amount} ${action.data.currency || 'USD'}.`
            : `Recorded ${action.data.type === 'income' ? 'income' : 'expense'}: ${action.data.amount} ${action.data.currency || 'USD'}.`;
      case 'create_payable':
        return hu
          ? `Rögzítettem: ${action.data.description} (${action.data.amount} ${action.data.currency || 'USD'}).`
          : de
            ? `Zahlungsposten erstellt: ${action.data.description} (${action.data.amount} ${action.data.currency || 'USD'}).`
            : `Created payable: ${action.data.description} (${action.data.amount} ${action.data.currency || 'USD'}).`;
      case 'complete_task':
        return hu ? `Befejezettnek jelöltem: ${action.data.title}.` : de ? `Aufgabe abgeschlossen: ${action.data.title}.` : `Completed task: ${action.data.title}.`;
      case 'update_goal_progress':
        return hu
          ? `A(z) ${action.data.title} cél haladása ${action.data.progress}%.`
          : de
            ? `Fortschritt für ${action.data.title} auf ${action.data.progress}% aktualisiert.`
            : `Updated ${action.data.title} to ${action.data.progress}%.`;
      case 'mark_payable_paid':
        return hu ? `Fizetettnek jelöltem: ${action.data.description}.` : de ? `Als bezahlt markiert: ${action.data.description}.` : `Marked as paid: ${action.data.description}.`;
      case 'schedule_pending':
        return hu ? 'A függő számlákat feladatként ütemeztem.' : de ? 'Offene Rechnungen als Aufgaben eingeplant.' : 'Scheduled pending invoices as tasks.';
      case 'toggle_theme':
        return hu ? 'Frissítettem a témát.' : de ? 'Design aktualisiert.' : 'Updated the theme.';
      case 'pomodoro':
        return hu ? 'Megnyitottam a Pomodoro nézetet.' : de ? 'Pomodoro-Ansicht geöffnet.' : 'Opened the Pomodoro view.';
      default:
        return hu ? 'Végrehajtottam a műveletet.' : de ? 'Aktion ausgeführt.' : 'Request executed.';
    }
  }, [currentLanguage]);

  const executeAction = useCallback((action: AssistantAction): string => {
    switch (action.type) {
      case 'navigation':
        onCommand?.(action);
        return buildExecutionReply(action);

      case 'create_task': {
        const parsedDate = action.data.date ? new Date(action.data.date) : null;
        const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
        addPlan({
          title: action.data.title,
          description: action.data.description || '',
          date: validDate ?? new Date(),
          startTime: validDate ?? undefined,
          priority: action.data.priority || 'medium',
          completed: false,
          linkedNotes: [],
        });
        return buildExecutionReply(action, validDate ? formatDateTime(validDate) : undefined);
      }

      case 'create_note':
        addNote({
          title: action.data.title,
          content: action.data.content,
          linkedPlans: [],
          tags: [],
        });
        return buildExecutionReply(action);

      case 'create_goal': {
        const parsedTargetDate = action.data.targetDate ? new Date(action.data.targetDate) : null;
        const validTargetDate = parsedTargetDate && !Number.isNaN(parsedTargetDate.getTime()) ? parsedTargetDate : undefined;
        addGoal({
          title: action.data.title,
          description: action.data.description || '',
          targetDate: validTargetDate,
          progress: 0,
          status: 'not-started',
          priority: action.data.priority || 'medium',
        });
        return buildExecutionReply(action);
      }

      case 'create_transaction':
        addTransaction({
          type: action.data.type || 'expense',
          amount: action.data.type === 'income'
            ? Math.abs(Number(action.data.amount))
            : -Math.abs(Number(action.data.amount)),
          currency: action.data.currency || 'USD',
          category: action.data.category || (action.data.type === 'income' ? 'Income' : 'General'),
          description: action.data.description || 'Assistant entry',
          date: new Date(),
          recurring: false,
          period: 'oneTime',
        });
        return buildExecutionReply(action);

      case 'create_payable': {
        const dueDate = action.data.dueDate && /^\d{4}-\d{2}-\d{2}/.test(action.data.dueDate)
          ? action.data.dueDate.slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        const recurring = action.data.kind === 'subscription';
        addTransaction({
          type: 'expense',
          amount: -Math.abs(Number(action.data.amount)),
          currency: action.data.currency || 'USD',
          category: action.data.category || 'Other',
          description: action.data.description,
          date: dueDate,
          effectiveDateYMD: dueDate,
          dueDateYMD: dueDate,
          payee: action.data.payee,
          paymentStatus: 'unpaid',
          status: 'pending',
          expenseKind: action.data.kind,
          autoPay: Boolean(action.data.autoPay),
          recurring,
          period: recurring ? (action.data.period || 'monthly') : 'oneTime',
          kind: recurring ? 'master' : 'history',
          priority: 'medium',
        });
        return buildExecutionReply(action);
      }

      case 'complete_task': {
        const matches = plans.filter((plan) => (
          plan.title.toLocaleLowerCase() === action.data.title.toLocaleLowerCase()
        ));
        if (matches.length !== 1) {
          return currentLanguage === 'hu'
            ? `Nem találtam egyértelműen ezt a feladatot: ${action.data.title}.`
            : currentLanguage === 'de'
              ? `Diese Aufgabe konnte nicht eindeutig zugeordnet werden: ${action.data.title}.`
              : `I could not uniquely match task: ${action.data.title}.`;
        }
        updatePlan(matches[0].id, { completed: true });
        return buildExecutionReply(action);
      }

      case 'update_goal_progress': {
        const matches = goals.filter((goal) => (
          goal.title.toLocaleLowerCase() === action.data.title.toLocaleLowerCase()
        ));
        if (matches.length !== 1) {
          return currentLanguage === 'hu'
            ? `Nem találtam egyértelműen ezt a célt: ${action.data.title}.`
            : currentLanguage === 'de'
              ? `Dieses Ziel konnte nicht eindeutig zugeordnet werden: ${action.data.title}.`
              : `I could not uniquely match goal: ${action.data.title}.`;
        }
        const progress = Math.max(0, Math.min(100, action.data.progress));
        updateGoal(matches[0].id, {
          progress,
          status: progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started',
        });
        return buildExecutionReply({ ...action, data: { ...action.data, progress } });
      }

      case 'mark_payable_paid': {
        const matches = transactions.filter((item) => (
          (item.expenseKind === 'bill' || item.expenseKind === 'subscription')
          && item.paymentStatus !== 'paid'
          && item.description.toLocaleLowerCase() === action.data.description.toLocaleLowerCase()
        ));
        if (matches.length !== 1) {
          return currentLanguage === 'hu'
            ? `Nem találtam egyértelműen ezt a fizetendő tételt: ${action.data.description}.`
            : currentLanguage === 'de'
              ? `Dieser Zahlungsposten konnte nicht eindeutig zugeordnet werden: ${action.data.description}.`
              : `I could not uniquely match payable: ${action.data.description}.`;
        }
        updateTransaction(matches[0].id, {
          paymentStatus: 'paid',
          status: 'completed',
          paidAtISO: new Date().toISOString(),
        });
        return buildExecutionReply(action);
      }

      case 'schedule_pending': {
        const pendingInvoices = invoices.filter((invoice) => invoice.status === 'sent');
        pendingInvoices.forEach((invoice) => {
          const client = clients.find((item) => item.id === invoice.clientId);
          addPlan({
            title: `Invoice #${invoice.invoiceNumber} payment follow-up`,
            description: client ? `Client: ${client.name}` : 'Pending invoice follow-up',
            date: new Date(invoice.dueDate),
            startTime: new Date(invoice.dueDate),
            priority: 'medium',
            completed: false,
            linkedNotes: [],
          });
        });
        return buildExecutionReply(action);
      }

      case 'toggle_theme': {
        const html = document.documentElement;
        if (action.target === 'dark') html.classList.add('dark');
        else if (action.target === 'light') html.classList.remove('dark');
        else html.classList.toggle('dark');
        onCommand?.(action);
        return buildExecutionReply(action);
      }

      case 'pomodoro':
        onCommand?.(action);
        return buildExecutionReply(action);

      default:
        return currentLanguage === 'hu' ? 'Ismeretlen művelet.' : currentLanguage === 'de' ? 'Unbekannte Aktion.' : 'Unknown action.';
    }
  }, [addGoal, addNote, addPlan, addTransaction, buildExecutionReply, clients, currentLanguage, formatDateTime, goals, invoices, onCommand, plans, transactions, updateGoal, updatePlan, updateTransaction]);

  const executePlan = useCallback((plan: AssistantPlan, allowWriteActions = true): boolean => {
    if (plan.actions.length === 0) return false;
    if (!allowWriteActions) {
      addMessage(
        'system',
        currentLanguage === 'hu'
          ? 'A DeepSeek műveletet javasolt, de az írási jogosultság ki van kapcsolva az Integrációkban.'
          : currentLanguage === 'de'
            ? 'DeepSeek hat eine Aktion vorgeschlagen, aber der Schreibzugriff ist in den Integrationen deaktiviert.'
            : 'DeepSeek suggested an action, but write access is disabled in Integrations.',
      );
      return true;
    }
    const replies = plan.actions.map(executeAction);
    addMessage('assistant', replies.join('\n'));
    return true;
  }, [addMessage, currentLanguage, executeAction]);

  const planWithAI = useCallback(async (text: string): Promise<AssistantPlan | null> => {
    AIService.setProvider(config);
    const response = await AIService.generateText({
      prompt: text,
      systemPrompt: buildAssistantPlanningPrompt({
        currentLanguage,
        currentView,
        now: new Date(),
        snapshot: buildSnapshot(),
      }),
      maxTokens: 700,
      temperature: 0,
    });
    return extractAssistantPlan(response.text);
  }, [buildSnapshot, config, currentLanguage, currentView]);

  const handleSendText = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText('');
    addMessage('user', text);

    if (!isConfigured) {
      const localPlan = inferLocalAssistantPlan(text, new Date());
      if (localPlan && executePlan(localPlan)) {
        return;
      }

      const msg = currentLanguage === 'hu'
        ? 'Hiányzik a DeepSeek API-kulcs. Először csatlakoztasd az Integrációkban.'
        : currentLanguage === 'de'
          ? 'Der DeepSeek-API-Schlüssel fehlt. Verbinde DeepSeek zuerst in den Integrationen.'
          : 'DeepSeek API key is missing. Open Integrations and connect it first.';
      addMessage('system', msg);
      toast.error(msg);
      return;
    }

    setIsSending(true);
    try {
      const planned = await planWithAI(text);
      if (planned && executePlan(planned, config.permissions?.writeActions ?? true)) {
        return;
      }

      const localPlan = inferLocalAssistantPlan(text, new Date());
      if (localPlan && executePlan(localPlan)) {
        return;
      }

      if (planned?.reply) {
        addMessage('assistant', planned.reply);
        return;
      }

      AIService.setProvider(config);
      const fallback = await AIService.generateText({
        prompt: text,
        systemPrompt: `You are a concise productivity assistant. Respond in ${LANGUAGE_NAMES[currentLanguage as keyof typeof LANGUAGE_NAMES] || 'English'}. Do not use citations or source references.`,
        maxTokens: 500,
        temperature: 0.2,
      });
      addMessage('assistant', fallback.text.replace(/\[\d+\]/g, '').trim());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addMessage('system', `Error: ${message}`);
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  }, [addMessage, config, currentLanguage, executePlan, inputText, isConfigured, isSending, planWithAI]);

  const openChat = useCallback(() => {
    setOpen(true);
    if (messages.length === 0) {
      addMessage('system', isConfigured
        ? currentLanguage === 'hu'
          ? 'A DeepSeek V4 asszisztens használatra kész.'
          : currentLanguage === 'de'
            ? 'Der DeepSeek-V4-Assistent ist einsatzbereit.'
            : 'DeepSeek V4 assistant is ready.'
        : currentLanguage === 'hu'
          ? 'A kezdéshez csatlakoztasd a DeepSeeket az Integrációkban.'
          : currentLanguage === 'de'
            ? 'Verbinde DeepSeek in den Integrationen, um zu beginnen.'
            : 'Connect DeepSeek in Integrations to start.');
    }
  }, [addMessage, currentLanguage, isConfigured, messages.length]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-gray-800 dark:text-white',
          style: { background: '#1e293b', color: '#fff' },
        }}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-24 right-8 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[9990] flex flex-col overflow-hidden max-h-[65vh]"
          >
            <div className="p-4 bg-gradient-to-r from-indigo-500 to-fuchsia-600 flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Sparkles size={16} /> DeepSeek V4
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label={t('common.close')}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[86%] whitespace-pre-line p-3 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-indigo-500 text-white rounded-br-none'
                        : msg.role === 'system'
                          ? 'bg-gray-200 dark:bg-gray-700 text-xs italic text-center mx-auto'
                          : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 shadow-sm rounded-2xl rounded-bl-none px-3 py-2 text-sm inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleSendText()}
                  placeholder={t('voice.typeMessage')}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-900 border-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                />
                <button
                  onClick={() => void handleSendText()}
                  disabled={!inputText.trim() || isSending}
                  className="absolute right-2 p-1.5 rounded-lg bg-indigo-500 text-white disabled:opacity-50 hover:bg-indigo-600 transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 items-center">
        {!open && (
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            onClick={openChat}
            className="p-4 rounded-full shadow-2xl backdrop-blur-xl border bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/20 transition-all duration-300"
            title={isConfigured ? 'DeepSeek V4' : 'Connect DeepSeek in Integrations'}
          >
            <MessageSquare className="w-8 h-8 text-indigo-400" />
          </motion.button>
        )}
      </motion.div>
    </>
  );
};
