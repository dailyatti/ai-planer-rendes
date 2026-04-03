import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useLanguage, LANGUAGE_NAMES } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { AIService } from '../services/AIService';
import { AIConfig } from '../types/ai';

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

const NAV_TARGETS: Array<{ target: string; aliases: string[] }> = [
  { target: 'daily', aliases: ['daily', 'napi'] },
  { target: 'weekly', aliases: ['weekly', 'heti'] },
  { target: 'monthly', aliases: ['monthly', 'havi'] },
  { target: 'yearly', aliases: ['yearly', 'éves', 'eves'] },
  { target: 'notes', aliases: ['notes', 'jegyzet'] },
  { target: 'goals', aliases: ['goals', 'cél', 'cel'] },
  { target: 'budget', aliases: ['budget', 'költségvetés', 'koltsegvetes'] },
  { target: 'invoicing', aliases: ['invoicing', 'száml', 'szaml'] },
  { target: 'statistics', aliases: ['statistics', 'statisztika'] },
  { target: 'habits', aliases: ['habits', 'szokás', 'szokas'] },
  { target: 'integrations', aliases: ['integrations', 'integration'] },
  { target: 'settings', aliases: ['settings', 'beállítás', 'beallitas'] },
];

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  config,
  onCommand,
  currentLanguage,
  currentView,
}) => {
  const { t } = useLanguage();
  const { plans, goals, transactions } = useData();

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

  const maybeHandleNavigationShortcut = useCallback((text: string) => {
    const normalized = text.toLowerCase();
    const navIntent = ['open', 'go to', 'navigate', 'nyisd', 'menj', 'válts', 'valts']
      .some((trigger) => normalized.includes(trigger));
    if (!navIntent) return false;

    const match = NAV_TARGETS.find((entry) =>
      entry.aliases.some((alias) => normalized.includes(alias)),
    );
    if (!match) return false;

    onCommand?.({ type: 'navigation', target: match.target });
    addMessage('system', `Opened: ${match.target}`);
    return true;
  }, [addMessage, onCommand]);

  const buildSystemPrompt = useCallback(() => {
    const languageName = LANGUAGE_NAMES[currentLanguage as keyof typeof LANGUAGE_NAMES] || 'English';
    const totalTasks = plans.length;
    const completedTasks = plans.filter((plan) => plan.completed).length;
    const totalGoals = goals.length;
    const avgGoalProgress = totalGoals
      ? Math.round(goals.reduce((sum, goal) => sum + Number(goal.progress || 0), 0) / totalGoals)
      : 0;
    const balance = Math.round(transactions.reduce((sum, tx) =>
      sum + (tx.type === 'income' ? Number(tx.amount || 0) : -Number(tx.amount || 0)), 0));

    return `You are an assistant inside a productivity app.
Always respond in ${languageName}.
Keep answers actionable and concise.
Current app view: ${currentView}
Live app snapshot:
- Tasks: ${completedTasks}/${totalTasks} completed
- Goals: ${totalGoals} total, average progress ${avgGoalProgress}%
- Financial balance estimate: ${balance}
If user asks navigation (open/go to), give a short confirmation phrase.`;
  }, [currentLanguage, currentView, goals, plans, transactions]);

  const handleSendText = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText('');
    addMessage('user', text);

    if (maybeHandleNavigationShortcut(text)) {
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
      AIService.setProvider(config);
      const response = await AIService.generateText({
        prompt: text,
        systemPrompt: buildSystemPrompt(),
        maxTokens: 900,
        temperature: 0.2,
      });
      addMessage('assistant', response.text);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addMessage('system', `Error: ${message}`);
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  }, [addMessage, buildSystemPrompt, config, inputText, isConfigured, isSending, maybeHandleNavigationShortcut]);

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
                    className={`max-w-[86%] p-3 rounded-2xl text-sm ${
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
