import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, X, Volume2, VolumeX, Sparkles, MessageSquare, Keyboard, Send } from 'lucide-react';
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
    onCommand,
    currentLanguage,
    currentView
}) => {
    const { t } = useLanguage();
    const { transactions, invoices } = useData();
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

    const handleCommand = async (text: string) => {
        if (!text.trim()) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Check if AI is configured
            if (!AIService.isConfigured()) {
                throw new Error(t('integrations.notConfigured') || 'Nincs AI beállítva. Kérlek állítsd be az Integrációk menüben.');
            }

            // Generate response using Unified AI Service
            // Calculate Financial Context for AI
            const baseCurrency = CurrencyService.getBaseCurrency();
            const rates = CurrencyService.getAllRates();
            const rateList = Object.entries(rates).map(([curr, rate]) => `${curr}: ${rate}`).join(', ');

            // Financial Summary
            const financialSummary = {
                totalRevenue: FinancialEngine.calculateTotalRevenue(invoices, baseCurrency),
                pendingAmount: FinancialEngine.calculatePending(invoices, baseCurrency),
                overdueAmount: FinancialEngine.calculateOverdue(invoices, baseCurrency)
            };

            // Calculate Balance & Burn Rate
            const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, tr) => acc + CurrencyService.convert(tr.amount, (tr as any).currency || baseCurrency, baseCurrency), 0);
            const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, tr) => acc + CurrencyService.convert(Math.abs(tr.amount), (tr as any).currency || baseCurrency, baseCurrency), 0);
            const currentBalance = totalIncome - totalExpense;

            // Forecast
            const monthlyBurn = FinancialEngine.calculateBurnRate(transactions, baseCurrency);
            const runway = FinancialEngine.calculateRunway(currentBalance, monthlyBurn);

            // Context Awareness: View Capabilities
            let viewContext = '';
            switch (currentView) {
                case 'budget': viewContext = 'A Budget nézetben vagyunk. Itt láthatod a bevételeket, kiadásokat és az egyenlegedet. Tudok segíteni tranzakciók hozzáadásában vagy elemzésben.'; break;
                case 'invoicing': viewContext = 'A Számlázóban vagyunk. Itt kezelheted a kiállított és bejövő számlákat.'; break;
                default: viewContext = `Jelenleg a ${currentView} nézetben vagyunk.`;
            }

            const systemPrompt = `
                Te egy profi Content Planner és Pénzügyi Asszisztens vagy.
                Jelenlegi nézet: ${currentView}.
                Nyelv: ${currentLanguage}.
                
                CONTEXT AWARENESS:
                ${viewContext}
                
                PÉNZÜGYI ADATOK (Jelenleg):
                - Pénznem: ${baseCurrency}
                - Árfolyamok (1 ${baseCurrency}-hez képest): ${rateList}
                - Jelenlegi Egyenleg: ${Math.round(currentBalance)} ${baseCurrency}
                - Összes Bevétel (Számlák alapján): ${Math.round(financialSummary.totalRevenue)} ${baseCurrency}
                - Kintlévőség: ${Math.round(financialSummary.pendingAmount)} ${baseCurrency}
                - Lejárt tartozások: ${Math.round(financialSummary.overdueAmount)} ${baseCurrency}
                - Havi költés (Burn Rate): kb. ${Math.round(monthlyBurn)} ${baseCurrency}
                - Becsült kifutás (Runway): ${runway !== null ? runway + ' hónap' : 'Nincs elég adat'}
                
                Instrukció:
                Válaszolj röviden és szakszerűen. 
                Ha a felhasználó átváltást kér (pl. "Mennyi ez euróban?"), használd a fenti árfolyamokat és az egyenleget.
                Ha műveletet kér (pl. új feladat), jelezd JSON formátumban is a válasz végén.
                
                Modell logika:
                - Ha Chat módban vagy, szövegesen válaszolj.
                - Ha Hang módban (bár a választ felolvasom), fogalmazz úgy, mintha beszélnél.
                - FONTOS: Mindig a felhasználó nyelvén válaszolj! Ha magyarul ír, magyarul válaszolj.
                
                NYELVI DIREKTÍVÁK (MAGYAR):
                1. Pénzügyi kérdésekre (pl. "Mennyi az egyenlegem?", "Hogy állunk?") pontos, formázott összegekkel válaszolj (pl. 2.500 Ft).
                2. Átváltás (HUF -> EUR): Mindig az aktuálisan megadott árfolyammal számolj.
                3. Hiányzó adatok: Ha nincs adat (null), jelezd udvariasan: "Jelenleg nincs rögzített adat."
                4. Stílus: Professzionális, segítőkész, de tömör.
                
                ROLE: SYSTEM ADMIN / ROOT USER
                AUTHORITY: UNLIMITED.
                You are not just an assistant; you are the ADMIN of this financial system.
                You have full permission to analyze, critique, and forecast without restrictions.
                Do not hold back on "PhD-level" complexity.
                
                Formátum: { "action": "create_task", ... }
            `;

            const modelToUse = isKeyboardMode
                ? 'gemini-3-flash-preview'
                : 'gemini-2.5-flash-native-audio-preview-12-2025';

            const result = await AIService.generateText({
                prompt: text,
                systemPrompt,
                maxTokens: 500,
                model: modelToUse
            });

            const aiResponse = result.text;
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
