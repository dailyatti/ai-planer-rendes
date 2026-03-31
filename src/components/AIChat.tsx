import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Maximize2, Minimize2, Loader2, Sparkles } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AIService } from '../services/AIService';
import { CurrencyService } from '../services/CurrencyService';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIChat: React.FC = () => {
    const { settings } = useSettings();
    const { language } = useLanguage();
    const {
        transactions,
        goals,
        invoices,
        budgetSettings
    } = useData();

    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (isOpen) {
            endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    if (!settings.aiConfig?.provider) return null;

    const buildSystemPrompt = () => {
        // Collect minimal essential data for PhD level context
        const currentCurrency = budgetSettings?.currency || 'HUF';
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;

        const activeGoals = goals.filter(g => g.status !== 'completed').length;
        const pendingInvoices = invoices.filter(i => i.status === 'sent').length;

        const infoText = language === 'hu' 
            ? `Te egy "PhD szintű" okos asszisztens vagy a ContentPlanner Pro rendszerben.\nFelhasználó Pénzügyei: Egyenleg ${CurrencyService.format(balance, currentCurrency)}.\nAktív Célok: ${activeGoals} db.\nFüggő számlák: ${pendingInvoices} db.\nVálaszolj precízen, felhasználóbarát módon!`
            : `You are a "PhD-level" smart assistant in ContentPlanner Pro.\nUser Finances: Balance ${CurrencyService.format(balance, currentCurrency)}.\nActive Goals: ${activeGoals}.\nPending Invoices: ${pendingInvoices}.\nAnswer precisely and professionally!`;

        return infoText;
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Combine history for simple context
            const historyText = messages.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
            const fullPrompt = `${historyText ? `Előzmény (rövidítve):\n${historyText}\n\n` : ''}Új kérdés: ${userMsg.content}`;

            const response = await AIService.generateText({
                prompt: fullPrompt,
                systemPrompt: buildSystemPrompt(),
                maxTokens: 1000
            });

            setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Ismeretlen hiba történt';
            setMessages(prev => [...prev, { role: 'assistant', content: `❌ Hiba: ${errorMsg}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const providerName = settings.aiConfig.provider === 'manus' ? 'Manus AI' : settings.aiConfig.provider === 'openai' ? 'OpenAI' : 'Gemini';

    return (
        <div className={`fixed transition-all duration-500 z-50 ${
            isOpen 
                ? (isExpanded ? 'inset-4 md:inset-12 bottom-20 md:bottom-20' : 'bottom-20 right-6 w-[350px] md:w-[400px] h-[550px]')
                : 'bottom-24 right-6 w-14 h-14'
        }`}>
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center hover:scale-110 transition-transform ring-4 ring-white/20 dark:ring-gray-800"
                >
                    <Bot size={28} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-xl">
                    {/* Header */}
                    <div className="h-16 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between px-5 text-white shrink-0 shadow-sm z-10">
                        <div className="flex items-center gap-3 font-bold">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                <Bot size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm">PhD Asszisztens</span>
                                <span className="text-[10px] text-white/70 uppercase tracking-widest leading-none">{providerName}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Teljes képernyő">
                                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors bg-white/10" title="Bezárás">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50/50 dark:bg-gray-900/50 scrollbar-thin relative scroll-smooth">
                        {/* Background subtle logo */}
                        {messages.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-60 text-center p-6 pointer-events-none">
                                <Sparkles size={48} className="text-purple-400 mb-4 animate-pulse" />
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                                    {language === 'hu' ? 'Aktiválva (' + providerName + ')' : 'Activated ('+providerName+')'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {language === 'hu' 
                                        ? 'Bármit kérdezhetsz a megadott adataiddal, elvégzett és függő feladataiddal kapcsolatban. Segítek!' 
                                        : 'Ask me anything about your current data, plans, and budget. I can help you!'}
                                </p>
                            </div>
                        )}
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in relative z-10`}>
                                <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                                    msg.role === 'user' 
                                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-sm shadow-md' 
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-sm shadow-sm'
                                }`}>
                                    {msg.role === 'assistant' ? (
                                        <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-purple max-w-none">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <div className="text-sm font-medium">{msg.content}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start relative z-10">
                                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                                    <div className="flex items-center gap-3 text-purple-600">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span className="text-xs font-semibold animate-pulse">Gondolkodom...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={endOfMessagesRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder={language === 'hu' ? 'Mesélj a pénzügyeimről...' : 'Tell me about my budget...'}
                                className="w-full pl-5 pr-14 py-3.5 bg-gray-100/80 dark:bg-gray-900/80 border border-transparent focus:border-purple-300 dark:focus:border-purple-700 rounded-xl text-sm outline-none dark:text-gray-200 transition-all font-medium"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2.5 p-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-500/30 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none disabled:opacity-50 transition-all"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
