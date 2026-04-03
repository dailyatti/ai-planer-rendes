import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useLanguage, LANGUAGE_NAMES } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { AIService } from '../services/AIService';
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
    transactions,
    addPlan,
    addGoal,
    addNote,
    addTransaction,
    invoices,
    clients,
  } = useData();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isConfigured = config.provider === 'perplexity' && Boolean(config.apiKey);

  useEffect(() => {
    if (open) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const addMessage = useCallback((role: ChatMessage['role'], text: string) => {
    setMessages((prev) => [...prev, { role, text, timestamp: Date.now() }]);
  }, []);

  const buildSnapshot = useCallback(() => {
    const languageName = LANGUAGE_NAMES[currentLanguage as keyof typeof LANGUAGE_NAMES] || 'English';
    const totalTasks = plans.length;
    const completedTasks = plans.filter((plan) => plan.completed).length;
    const totalGoals = goals.length;
    const avgGoalProgress = totalGoals
      ? Math.round(goals.reduce((sum, goal) => sum + Number(goal.progress || 0), 0) / totalGoals)
      : 0;
    const balance = Math.round(
      transactions.reduce((sum, tx) => sum + (tx.type === 'income' ? Number(tx.amount || 0) : -Number(tx.amount || 0)), 0),
    );

    return `Language: ${languageName}
Current app view: ${currentView}
- Tasks: ${completedTasks}/${totalTasks} completed
- Goals: ${totalGoals} total, average progress ${avgGoalProgress}%
- Financial balance estimate: ${balance}
- Pending invoices: ${invoices.filter((invoice) => invoice.status === 'sent').length}
- Clients: ${clients.length}`;
  }, [clients.length, currentLanguage, currentView, goals, invoices, plans, transactions]);

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
    switch (action.type) {
      case 'navigation':
        return hu ? `Megnyitottam: ${action.target}.` : `Opened: ${action.target}.`;
      case 'create_task':
        return hu
          ? `Felvettem a feladatot: ${action.data.title}${details ? ` (${details})` : ''}.`
          : `Created task: ${action.data.title}${details ? ` (${details})` : ''}.`;
      case 'create_note':
        return hu ? `Létrehoztam a jegyzetet: ${action.data.title}.` : `Created note: ${action.data.title}.`;
      case 'create_goal':
        return hu ? `Létrehoztam a célt: ${action.data.title}.` : `Created goal: ${action.data.title}.`;
      case 'create_transaction':
        return hu
          ? `Rögzítettem a ${action.data.type === 'income' ? 'bevételt' : 'kiadást'}: ${action.data.amount} ${action.data.currency || 'USD'}.`
          : `Recorded ${action.data.type === 'income' ? 'income' : 'expense'}: ${action.data.amount} ${action.data.currency || 'USD'}.`;
      case 'schedule_pending':
        return hu ? 'A függő számlákat feladatként ütemeztem.' : 'Scheduled pending invoices as tasks.';
      case 'toggle_theme':
        return hu ? 'Frissítettem a témát.' : 'Updated the theme.';
      case 'pomodoro':
        return hu ? 'Megnyitottam a Pomodoro nézetet.' : 'Opened the Pomodoro view.';
      default:
        return hu ? 'A kérést végrehajtottam.' : 'Request executed.';
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
          amount: Number(action.data.amount),
          currency: action.data.currency || 'USD',
          category: action.data.category || (action.data.type === 'income' ? 'Income' : 'General'),
          description: action.data.description || 'Assistant entry',
          date: new Date(),
          recurring: false,
          period: 'oneTime',
        });
        return buildExecutionReply(action);

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
        return currentLanguage === 'hu' ? 'Ismeretlen művelet.' : 'Unknown action.';
    }
  }, [addGoal, addNote, addPlan, addTransaction, buildExecutionReply, clients, currentLanguage, formatDateTime, invoices, onCommand]);

  const executePlan = useCallback((plan: AssistantPlan): boolean => {
    if (plan.actions.length === 0) return false;
    const replies = plan.actions.map(executeAction);
    addMessage('assistant', replies.join('\n'));
    return true;
  }, [addMessage, executeAction]);

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

    const localPlan = inferLocalAssistantPlan(text, new Date());
    if (localPlan && executePlan(localPlan)) {
      return;
    }

    if (!isConfigured) {
      const msg = 'Perplexity API key is missing. Open Integrations and connect it first.';
      addMessage('system', msg);
      toast.error(msg);
      return;
    }

    setIsSending(true);
    try {
      const planned = await planWithAI(text);
      if (planned && executePlan(planned)) {
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
        ? 'Perplexity Sonar Pro assistant is ready.'
        : 'Connect Perplexity in Integrations to start.');
    }
  }, [addMessage, isConfigured, messages.length]);

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
                <Sparkles size={16} /> Perplexity Sonar Pro
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
            title={isConfigured ? 'Perplexity Sonar Pro' : 'Connect Perplexity in Integrations'}
          >
            <MessageSquare className="w-8 h-8 text-indigo-400" />
          </motion.button>
        )}
      </motion.div>
    </>
  );
};
