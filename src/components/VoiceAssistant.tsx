import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, X, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface VoiceAssistantProps {
    apiKey?: string;
    onCommand?: (command: VoiceCommand) => void;
    currentLanguage: string;
    currentView: string;
}

interface VoiceCommand {
    type: 'navigation' | 'create' | 'edit' | 'read' | 'search' | 'settings' | 'unknown';
    action: string;
    target?: string;
    value?: string;
    raw: string;
}

// Tool definitions for Gemini Live API
/*
const voiceAssistantTools = [
    {
        name: 'navigate_to_view',
        description: 'Navigate to a different view in the planner (daily, weekly, monthly, goals, budget, etc.)',
        parameters: {
            type: 'object',
            properties: {
                view: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'notes', 'goals', 'drawing', 'budget', 'invoicing', 'pomodoro', 'statistics', 'integrations', 'settings'] }
            },
            required: ['view']
        }
    },
    {
        name: 'create_plan_item',
        description: 'Create a new plan item, task, or event',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                date: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'] }
            },
            required: ['title']
        }
    },
    {
        name: 'read_plans',
        description: 'Read out the plans for a specific date or period',
        parameters: {
            type: 'object',
            properties: {
                period: { type: 'string', enum: ['today', 'tomorrow', 'this_week', 'this_month'] }
            }
        }
    },
    {
        name: 'create_note',
        description: 'Create a new note',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                content: { type: 'string' }
            },
            required: ['title']
        }
    },
    {
        name: 'create_goal',
        description: 'Create a new goal',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                targetDate: { type: 'string' }
            },
            required: ['title']
        }
    },
    {
        name: 'create_invoice',
        description: 'Create a new invoice',
        parameters: {
            type: 'object',
            properties: {
                clientName: { type: 'string' },
                amount: { type: 'number' },
                description: { type: 'string' }
            },
            required: ['clientName', 'amount']
        }
    },
    {
        name: 'get_financial_summary',
        description: 'Get a summary of financial status (revenue, expenses, forecasts)',
        parameters: {
            type: 'object',
            properties: {
                period: { type: 'string', enum: ['this_month', 'this_quarter', 'this_year'] }
            }
        }
    },
    {
        name: 'toggle_theme',
        description: 'Toggle between dark and light theme',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'disconnect_assistant',
        description: 'Disconnect and close the voice assistant',
        parameters: { type: 'object', properties: {} }
    }
];
*/

const getSystemInstruction = (language: string, currentView: string) => {
    const isHungarian = language === 'hu';

    return isHungarian
        ? `Ön a ContentPlanner Pro professzionális AI Hangasszisztense. Feladata a felhasználók teljes körű támogatása a tervezésben, tartalomgyártásban, pénzügyek kezelésében és az üzleti folyamatok optimalizálásában.

JELENLEGI STÁTUSZ:
- Nyelv: Magyar (Kiemelt prioritás)
- Aktív nézet: ${currentView}

KOMPETENCIÁK:
1. NAVIGÁCIÓ: Azonnali váltás a nézetek között (napi, heti, havi tervező, célok, költségvetés, számlázás, statisztikák).
2. TARTALOMGYÁRTÁS: Tervek, jegyzetek, célok és kampányok professzionális létrehozása.
3. ADATLEKÉRÉS: Napi/heti tervek és pénzügyi mutatók (bevétel, kiadás, profit) precíz ismertetése.
4. ÜZLETI TÁMOGATÁS: Számlák kiállítása, ügyféladatok kezelése.

KOMMUNIKÁCIÓS STÍLUS:
- Legyen rendkívül udvarias, lényegretörő és segítőkész.
- Válaszai legyenek szakmailag pontosak és nyelvtanilag helyesek.
- Ha a felhasználó tervezni szeretne, proaktívan kérdezzen rá a részletekre (időpont, prioritás).
- Pénzügyi kérdéseknél fogalmazzon pontosan.

Ha a felhasználó befejezi a munkát ("viszlát", "köszönöm", "állj le"), használja a disconnect_assistant eszközt.`

        : `You are the AI Voice Assistant for ContentPlanner Pro. You help users plan, create notes, manage goals, and handle invoicing.

CURRENT STATE:
- Language: English
- Active View: ${currentView}

YOUR CAPABILITIES:
1. NAVIGATION: Switch between views (daily, weekly, monthly, goals, budget, invoicing, etc.)
2. CREATE: Create plans, notes, goals, invoices
3. READ: Read out today's, tomorrow's, or this week's plans
4. FINANCES: Provide financial summaries, revenue, expenses

RESPOND NATURALLY AND HELPFULLY. If the user wants to plan something, ask for details. If discussing invoices, help fill in the information.

If the user says "stop", "goodbye", or "exit", call the disconnect_assistant tool.`;
};

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
    apiKey,
    // onCommand,
    currentLanguage,
    currentView
}) => {
    const { t } = useLanguage();
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0);
    const [showNoApiWarning, setShowNoApiWarning] = useState(false);
    // const [transcript, setTranscript] = useState('');
    const [showPanel, setShowPanel] = useState(false);

    // Refs for audio handling
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    // const sessionRef = useRef<any>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);

    // Volume visualization
    useEffect(() => {
        if (!isActive || !analyzerRef.current) return;

        const updateVolume = () => {
            if (!analyzerRef.current) return;
            const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
            analyzerRef.current.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setVolume(avg);
            if (isActive) requestAnimationFrame(updateVolume);
        };

        updateVolume();
    }, [isActive]);

    const startSession = async () => {
        if (isActive) return;

        if (!apiKey) {
            console.log('Voice Assistant: API key not configured');
            setShowNoApiWarning(true);
            setTimeout(() => setShowNoApiWarning(false), 5000);
            return;
        }

        setIsConnecting(true);

        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Set up audio context for visualization
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;

            const analyzer = audioContext.createAnalyser();
            analyzerRef.current = analyzer;
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyzer);

            // In production, this would connect to Gemini Live API
            // For now, we'll simulate the connection
            setIsActive(true);
            setIsConnecting(false);
            setShowPanel(true);

            console.log('Voice Assistant: Connected with system instruction:',
                getSystemInstruction(currentLanguage, currentView));

        } catch (error) {
            console.error('Voice Assistant: Failed to start', error);
            setIsConnecting(false);
        }
    };

    const disconnect = useCallback(async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current) {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }

        setIsActive(false);
        setShowPanel(false);
        setVolume(0);

        // setTranscript('');
    }, []);

    const toggleMute = () => {
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach(track => {
                track.enabled = isMuted;
            });
            setIsMuted(!isMuted);
        }
    };

    return (
        <>
            {/* Floating Voice Button */}
            <button
                onClick={isActive ? disconnect : startSession}
                className={`
          fixed bottom-6 right-6 z-[9999] 
          w-14 h-14 md:w-16 md:h-16 rounded-full 
          flex items-center justify-center
          transition-all duration-300 transform
          ${isActive
                        ? 'bg-gradient-to-br from-danger-500 to-danger-600 shadow-lg shadow-danger-500/40 hover:shadow-xl hover:shadow-danger-500/50'
                        : 'bg-gradient-to-br from-primary-500 to-secondary-600 shadow-lg shadow-primary-500/40 hover:shadow-xl hover:shadow-primary-500/50'
                    }
          hover:scale-105 active:scale-95
          group
        `}
                aria-label={isActive ? 'Disconnect voice assistant' : 'Start voice assistant'}
            >
                {isConnecting ? (
                    <Loader2 className="w-6 h-6 md:w-7 md:h-7 text-white animate-spin" />
                ) : isActive ? (
                    <div className="relative">
                        <Mic className="w-6 h-6 md:w-7 md:h-7 text-white" />
                        {/* Pulse animation when active */}
                        <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
                    </div>
                ) : (
                    <MicOff className="w-6 h-6 md:w-7 md:h-7 text-white group-hover:scale-110 transition-transform" />
                )}

                {/* Volume ring indicator */}
                {isActive && (
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none -rotate-90"
                        viewBox="0 0 100 100"
                    >
                        <circle
                            cx="50"
                            cy="50"
                            r="46"
                            fill="none"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="4"
                            strokeDasharray={`${(volume / 255) * 289} 289`}
                            className="transition-all duration-75"
                        />
                    </svg>
                )}

                {/* Status indicator dot */}
                <span
                    className={`
            absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900
            ${isActive ? 'bg-success-500' : 'bg-gray-400'}
          `}
                />
            </button>

            {/* API Key Missing Warning */}
            {showNoApiWarning && (
                <div className="fixed bottom-24 right-6 z-[9999] animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <div className="bg-amber-50 dark:bg-amber-900/90 border border-amber-200 dark:border-amber-700 rounded-xl p-4 shadow-lg max-w-xs">
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-800">
                                <MicOff size={16} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                    {t('voice.noApiKey') || 'API Key Required'}
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    {t('voice.configureInIntegrations') || 'Please configure Gemini API key in Integrations settings'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded Panel (when active) */}
            {showPanel && (
                <div
                    className={`
            fixed bottom-24 right-6 z-[9999]
            w-80 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl
            rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50
            transition-all duration-300 transform
            ${showPanel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
          `}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500">
                                <Sparkles size={14} className="text-white" />
                            </div>
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                {t('voice.title')}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={toggleMute}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                {isMuted
                                    ? <VolumeX size={16} className="text-gray-500" />
                                    : <Volume2 size={16} className="text-gray-500" />
                                }
                            </button>
                            <button
                                onClick={disconnect}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X size={16} className="text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        {/* Listening indicator */}
                        <div className="flex items-center justify-center gap-3 py-6">
                            <div className="relative">
                                <div
                                    className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 
                             flex items-center justify-center"
                                    style={{
                                        boxShadow: `0 0 ${20 + (volume / 255) * 40}px rgba(67, 97, 238, ${0.3 + (volume / 255) * 0.3})`
                                    }}
                                >
                                    <Mic size={24} className="text-white" />
                                </div>
                                {/* Animated rings */}
                                <div className="absolute inset-0 rounded-full border-2 border-primary-400/50 animate-ping" />
                                <div className="absolute inset-[-4px] rounded-full border border-primary-300/30 animate-pulse" />
                            </div>
                        </div>

                        {/* Status text */}
                        {!apiKey ? (
                            <div className="text-center">
                                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                                    {t('voice.demoMode') || 'Demo üzemód'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('voice.configureApiKey') || 'Állítsd be a Gemini API kulcsot az Integrációk menüben'}
                                </p>
                            </div>
                        ) : (
                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                {t('voice.listening')}
                            </p>
                        )}

                        {/* Quick commands */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                                {t('voice.trySaying')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {[t('voice.example1'), t('voice.example2'), t('voice.example3')].map((cmd, i) => (
                                    <span
                                        key={i}
                                        className="inline-block px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 
                             text-xs text-gray-600 dark:text-gray-400"
                                    >
                                        "{cmd}"
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
