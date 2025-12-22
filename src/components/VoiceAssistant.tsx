import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Send, MicOff, Loader2, VolumeX, Keyboard, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { AIService } from '../services/AIService';
import { FinancialEngine } from '../utils/FinancialEngine';
import { CurrencyService } from '../services/CurrencyService';

interface VoiceAssistantProps {
    onCommand?: (command: VoiceCommand) => void;
    currentLanguage: string;
    currentView: string;
}

interface VoiceCommand {
    type: string;
    data: any;
    raw: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
    currentLanguage,
    currentView
}) => {
    const { t } = useLanguage();
    const { transactions, addPlan, addTransaction } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isKeyboardMode, setIsKeyboardMode] = useState(false);
    const [inputText, setInputText] = useState('');

    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = currentLanguage === 'hu' ? 'hu-HU' : 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                const currentTranscript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result) => result.transcript)
                    .join('');
                setTranscript(currentTranscript);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                if (transcript.trim()) {
                    handleCommand(transcript);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setError('Hiba történt a hangfelismerés közben.');
                setIsListening(false);
            };
        }
    }, [currentLanguage]);

    // Helper to process AI JSON actions
    const processAIAction = (jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);
            console.log('Processing AI Action:', data);

            if (data.action === 'create_task') {
                addPlan({
                    title: data.title,
                    description: data.description || '',
                    date: new Date(data.date),
                    priority: data.priority || 'medium',
                    completed: false,
                    linkedNotes: []
                });
                return `[Rendszer: Feladat létrehozva - ${data.title}] - ${data.date}`;
            }

            if (data.action === 'create_transaction') {
                addTransaction({
                    type: data.type as any,
                    amount: Number(data.amount),
                    currency: data.currency || 'HUF',
                    category: data.category || 'Egyéb',
                    date: new Date(data.date),
                    description: data.description || '',
                    recurring: false
                });
                return `[Rendszer: Tranzakció rögzítve - ${data.amount} ${data.currency}]`;
            }

        } catch (e) {
            console.error('Failed to process AI action:', e);
            return null;
        }
    };

    const handleCommand = async (text: string) => {
        if (!text.trim()) return;

        setIsProcessing(true);
        setError(null);

        try {
            if (!AIService.isConfigured()) {
                throw new Error(t('integrations.notConfigured') || 'Nincs AI beállítva. Kérlek állítsd be az Integrációk menüben.');
            }

            // 0. Auto-detect currency intent and force refresh rates if needed
            const currencyKeywords = [
                'árfolyam', 'valuta', 'váltás', 'átváltás', 'mennyi', 'euró', 'dollár', 'forint',
                'euro', 'dollar', 'huf', 'usd', 'gbp', 'chf', 'jpy', 'rate', 'exchange', 'convert',
                '€', '$', '£', '¥'
            ];

            const isCurrencyRelated = currencyKeywords.some(keyword => text.toLowerCase().includes(keyword));

            if (isCurrencyRelated && AIService.isConfigured()) {
                console.log('Currency intent detected. Fetching live rates...');
                await FinancialEngine.refreshRates(true); // Force API/AI fetch via Engine
            }

            // Generate response using Unified AI Service
            // For prompts, we can still use CurrencyService.getAllRates() if exposed, or fallback to engine.
            // Better to keep accessing static data via CurrencyService if it's just reading data?
            // "CurrencyService.getBaseCurrency()" might be safe if it's just reading.
            // But for consistency let's stick to CurrencyService for data access if FinancialEngine doesn't expose it,
            // OR add accessors to FinancialEngine.
            // FinancialEngine.getRateSource() exists.

            // Let's rely on CurrencyService for simple state access since VoiceAssistant is not a heavy view component and loads later.
            // BUT to be safe, let's keep it consistent.

            // Actually, for VoiceAssistant, keeping CurrencyService is okay if imports are fine.
            // But let's use FinancialEngine.convert() at least.

            const baseCurrency = CurrencyService.getBaseCurrency();
            const rates = CurrencyService.getAllRates(); // This will now have fresh data

            // Calculate Recurring Monthly Income from Budget
            // IMPORTANT: Only count transactions explicitly marked as recurring
            const incomeTransactions = transactions.filter(t => t.type === 'income');
            const recurringIncomeTransactions = incomeTransactions.filter(t => t.recurring === true && t.period && t.period !== 'oneTime');

            // Debug: Calculate what each recurring income contributes
            const recurringIncome = recurringIncomeTransactions
                .reduce((sum, t) => {
                    let amount = FinancialEngine.convert(t.amount, t.currency || baseCurrency, baseCurrency);
                    switch (t.period) {
                        case 'daily': return sum + (amount * 30);
                        case 'weekly': return sum + (amount * 4);
                        case 'monthly': return sum + amount;
                        case 'yearly': return sum + (amount / 12);
                        default: return sum;
                    }
                }, 0);

            // Debug summary for AI prompt
            // PhD Calculation: Net Monthly Cash Flow & Projections with Compound Interest

            // Calculate Recurring Monthly Expenses
            const expenseTransactions = transactions.filter(t => t.type === 'expense');
            const recurringExpenseTransactions = expenseTransactions.filter(t => t.recurring === true && t.period && t.period !== 'oneTime');

            const recurringExpenses = recurringExpenseTransactions
                .reduce((sum, t) => {
                    let amount = FinancialEngine.convert(Math.abs(t.amount), t.currency || baseCurrency, baseCurrency);
                    switch (t.period) {
                        case 'daily': return sum + (amount * 30);
                        case 'weekly': return sum + (amount * 4);
                        case 'monthly': return sum + amount;
                        case 'yearly': return sum + (amount / 12);
                        default: return sum;
                    }
                }, 0);

            const currentBalance = FinancialEngine.calculateCurrentBalance(transactions, baseCurrency);
            // Use recurring expenses as the "burn rate" for runway calculation to be conservative/accurate for future
            const monthlyBurn = recurringExpenses;

            // PhD Calculation: Net Monthly Cash Flow & Projections with Compound Interest
            // We use recurringIncome - recurringExpenses for a stable baseline forecast
            const monthlyNet = recurringIncome - recurringExpenses;

            // Calculate average annual interest rate for income (weighted by amount)
            const incomeWithInterest = transactions.filter(t => t.type === 'income' && t.interestRate);
            const totalIncomeWithInterest = incomeWithInterest.reduce((sum, t) => sum + FinancialEngine.convert(t.amount, t.currency || baseCurrency, baseCurrency), 0);
            const weightedSumRate = incomeWithInterest.reduce((sum, t) => {
                const amt = FinancialEngine.convert(t.amount, t.currency || baseCurrency, baseCurrency);
                return sum + (amt * (t.interestRate || 0));
            }, 0);
            const avgInterestRate = totalIncomeWithInterest > 0 ? (weightedSumRate / totalIncomeWithInterest) : 0;

            // Granular Forecasting Units (Linear)
            // (Removed unused units)

            // Compound Projections
            const projected3Months = FinancialEngine.calculateFutureBalance(currentBalance, monthlyNet, 3, avgInterestRate);
            const projected1Year = FinancialEngine.calculateFutureBalance(currentBalance, monthlyNet, 12, avgInterestRate);
            const projected3Years = FinancialEngine.calculateFutureBalance(currentBalance, monthlyNet, 36, avgInterestRate);

            const runway = FinancialEngine.calculateRunway(currentBalance, monthlyBurn);

            let viewContext = '';
            switch (currentView) {
                case 'budget': viewContext = 'A Budget nézetben vagyunk. Itt láthatod a bevételeket, kiadásokat és az egyenlegedet. Tudok segíteni tranzakciók hozzáadásában vagy elemzésben.'; break;
                case 'invoicing': viewContext = 'A Számlázóban vagyunk. Itt kezelheted a kiállított és bejövő számlákat.'; break;
                default: viewContext = `Jelenleg a ${currentView} nézetben vagyunk.`;
            }

            // Generate rate list for prompt context
            const allRatesText = Object.entries(rates).map(([c, r]) => `${c}: ${r}`).join(', ');

            const systemPrompt = `
Te egy profi Pénzügyi Asszisztens vagy. Nyelv: ${currentLanguage}. Nézet: ${currentView}.

=== AKTUÁLIS PÉNZÜGYI HELYZET ===
Jelenlegi Egyenleg: ${Math.round(currentBalance)} ${baseCurrency}
Euróban kifejezve: ${FinancialEngine.convert(currentBalance, baseCurrency, 'EUR').toFixed(2)} EUR

=== JÖVŐBELI ELŐREJELZÉS ADATOK (PHD SZINT) ===
Ezeket használd a jövőbeli egyenleg kiszámolásához (Kamatos Kamattal számolva):
- Havi Net Cashflow: ${Math.round(monthlyNet)} ${baseCurrency}
- Átlagos Éves Kamatláb: ${avgInterestRate.toFixed(2)}%
- Runway (Tartalék ideje): ${runway ? runway + ' hónap' : 'Végtelen/Nincs kiadás'}

ELŐREJELZETT EGYENLEGEK (KAMATTAL):
- 3 hónap múlva: ${Math.round(projected3Months)} ${baseCurrency}
- 1 év múlva: ${Math.round(projected1Year)} ${baseCurrency}
- 3 év múlva: ${Math.round(projected3Years)} ${baseCurrency}

=== ÁRFOLYAMOK (1 EUR = X HUF) ===
${allRatesText}
FONTOS: Ha a kérésben valuta is van (pl. "Mennyi lesz RON-ban?"), várd meg a kiválasztott HUF eredményt, majd oszd el az árfolyammal!

=== KÖTELEZŐ SZABÁLYOK ===
1. KOMPLEX IDŐPONTOK: Ha a felhasználó összetett időt mond (pl. "2 év és 5 nap múlva"), interpolálj a fenti "hónap/év múlva" adatok alapján. Használd a kamatos kamat elvét!
2. VALUTA KONVERZIÓ: Mindig váltsd át a kért pénznemre a végén.
3. NE számolj fejből bizonytalanul, használd a fenti fix "ELŐREJELZETT" sarokpontokat!
4. Válaszolj magyarul, tömören, professzionálisan.

${viewContext}

ROLE: SYSTEM ADMIN | UNLIMITED AUTHORITY.
            `;

            const modelToUse = isKeyboardMode
                ? 'gemini-3-flash-preview'
                : 'gemini-2.5-flash-native-audio-preview-12-2025';

            const result = await AIService.generateText({
                prompt: text,
                systemPrompt: systemPrompt + `\n\nJelenlegi dátum: ${new Date().toISOString().split('T')[0]} (Ez alapján számold ki a "kedd" stb. dátumokat!)`,
                maxTokens: 1000,
                model: modelToUse
            });

            let aiResponse = result.text;

            // Extract and process JSON
            const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/\{[\s\S]*"action":[\s\S]*\}/);

            if (jsonMatch) {
                const jsonContent = jsonMatch[1] || jsonMatch[0];
                const actionResult = processAIAction(jsonContent);

                // Hide JSON from display/speech, append system confirmation if successful
                aiResponse = aiResponse.replace(jsonMatch[0], '').trim();
                if (actionResult) {
                    aiResponse += `\n\n${actionResult}`;
                }
            }

            setResponse(aiResponse || 'Sajnálom, nem kaptam választ a modelltől.');

            // Text to Speech
            speakResponse(aiResponse);

        } catch (err) {
            console.error('AI processing error:', err);
            setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
            speakResponse('Sajnálom, hiba történt a feldolgozás során.');
        } finally {
            setIsProcessing(false);
        }
    };

    const speakResponse = (text: string) => {
        if (!synthRef.current) return;

        // Cancel previous speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLanguage === 'hu' ? 'hu-HU' : 'en-US';

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setTranscript('');
            setResponse('');
            setError(null);
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (isOpen) {
            // Close logic
            recognitionRef.current?.stop();
            synthRef.current.cancel();
            setIsListening(false);
            setIsSpeaking(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={toggleOpen}
                className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-full shadow-lg hover:scale-105 transition-all z-50 animate-bounce-subtle"
            >
                <Mic size={24} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-primary-600 to-indigo-600 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <Sparkles size={20} />
                    <h3 className="font-bold">AI Asszisztens</h3>
                </div>
                <button
                    onClick={toggleOpen}
                    className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Chat Area */}
            <div className="p-4 h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-4">
                {/* Status Indicator */}
                {!AIService.isConfigured() ? (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-100 dark:border-red-800">
                        ⚠️ Nincs AI beállítva. Kérlek állítsd be az Integrációk menüben.
                    </div>
                ) : (
                    <div className="text-center text-xs text-gray-400">
                        {AIService.getActiveProvider() === 'openai' ? 'Powered by OpenAI' : 'Powered by Gemini'}
                    </div>
                )}

                {transcript && (
                    <div className="self-end bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 p-3 rounded-2xl rounded-tr-none max-w-[85%] text-sm">
                        {transcript}
                    </div>
                )}

                {isProcessing && (
                    <div className="self-start flex items-center gap-2 text-gray-500 text-sm p-2">
                        <Loader2 size={16} className="animate-spin" />
                        Gondolkodom...
                    </div>
                )}

                {response && (
                    <div className="self-start bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl rounded-tl-none max-w-[85%] text-sm shadow-sm">
                        {response}
                    </div>
                )}

                {error && (
                    <div className="self-center bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs">
                        {error}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                {isKeyboardMode ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (inputText.trim()) {
                                setTranscript(inputText);
                                handleCommand(inputText);
                                setInputText('');
                            }
                        }}
                        className="flex items-center gap-2"
                    >
                        <button
                            type="button"
                            onClick={() => setIsKeyboardMode(false)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <Mic size={20} />
                        </button>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Írj egy parancsot..."
                            className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isProcessing}
                            className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                ) : (
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => synthRef.current.cancel()}
                            disabled={!isSpeaking}
                            className={`p-2 rounded-full transition-colors ${isSpeaking ? 'text-red-500 hover:bg-red-50' : 'text-gray-300'}`}
                            title="Némítás"
                        >
                            <VolumeX size={20} />
                        </button>

                        <button
                            onClick={toggleListening}
                            disabled={!AIService.isConfigured()}
                            className={`p-4 rounded-full transition-all shadow-lg ${isListening
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:scale-105'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={isListening ? 'Leállítás' : 'Figyelés indítása'}
                        >
                            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>

                        <button
                            onClick={() => setIsKeyboardMode(true)}
                            className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                            title="Billentyűzet"
                        >
                            <Keyboard size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
